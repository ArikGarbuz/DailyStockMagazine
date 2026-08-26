#!/usr/bin/env python3
"""
Generate daily pre-market stock magazine (bilingual HTML)
Runs via GitHub Actions at 16:20 Israel time daily.

LIVE DATA. Every number in the published magazine is fetched from Finnhub at
run time. This replaces the previous SAMPLE_STOCKS list, which held hardcoded
prices and therefore published an identical "magazine" every day with only the
date changed (Aug 25 and Aug 26 both showed BMNR $24.36, SOFI $18.31, NOK $4.18).

Selection is honest with respect to the headline "Top Movers ... Under $30 ...
Market Cap > $500M": a candidate universe is scanned, filtered on real price and
real market cap, then ranked by real absolute % move. Nothing is invented --
sentiment is derived arithmetically from the day's change, and any field the API
does not return is rendered as a dash rather than filled in.

Stdlib only (urllib), consistent with this repo's dependency-free scripts.
Exits nonzero on failure so GitHub Actions marks the run RED.
"""

import json
import datetime
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

FINNHUB_API_KEY = (os.environ.get('FINNHUB_API_KEY') or '').strip().strip('"').strip("'")
FINNHUB_BASE = 'https://finnhub.io/api/v1'
HTTP_TIMEOUT = 20
PACE_SECONDS = 1.1          # Finnhub free tier allows 60 calls/min

MAX_STOCK_PRICE = 30.0      # headline claim: "Under $30"
MIN_MARKET_CAP_M = 500.0    # headline claim: "Market Cap > $500M" (Finnhub reports millions)
TARGET_STOCKS = 15
MIN_ACCEPTABLE = 5          # below this we fail loudly rather than ship a hollow issue
PROFILE_LOOKUP_LIMIT = 22   # only profile the strongest movers, to conserve quota

# Candidate universe: liquid small/mid-cap names that plausibly trade under $30.
# Scanned live each run; only those that actually pass the price and market-cap
# filters get published, so the universe is a starting pool, never the output.
CANDIDATE_TICKERS = [
    'BMNR', 'SOFI', 'RIVN', 'JOBY', 'NOK', 'POET', 'OCFN', 'HUT', 'MARA',
    'CLSK', 'RIOT', 'CIFR', 'CORZ', 'WULF', 'IREN', 'LCID', 'NIO', 'PLUG',
    'FCEL', 'ACHR', 'SIRI', 'F', 'AAL', 'SNAP', 'PTON', 'HOOD', 'CHPT',
    'RUN', 'BLNK', 'AMC', 'GME', 'BBAI', 'SOUN', 'RKLB', 'ASTS', 'LAZR',
    'QS', 'NKLA', 'GRAB', 'PATH', 'AFRM', 'UPST',
]


def http_get_json(url):
    """GET a URL and parse JSON. Returns None on any failure (never raises)."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'DailyStockMagazine/1.0'})
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            if resp.status != 200:
                return None
            return json.loads(resp.read().decode('utf-8'))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, OSError):
        # Deliberately swallow the exception object: it can embed the request
        # URL, which carries the API key. Callers log the ticker instead.
        return None


def fetch_quote(ticker):
    """Live quote. Returns dict or None. 'c' is current price, 'dp' is % change."""
    data = http_get_json(f'{FINNHUB_BASE}/quote?symbol={ticker}&token={FINNHUB_API_KEY}')
    if not isinstance(data, dict):
        return None
    price = data.get('c')
    if not isinstance(price, (int, float)) or price <= 0:
        return None
    return {
        'price': float(price),
        'change': float(data['dp']) if isinstance(data.get('dp'), (int, float)) else None,
        'high': float(data['h']) if isinstance(data.get('h'), (int, float)) else None,
        'low': float(data['l']) if isinstance(data.get('l'), (int, float)) else None,
        'prev_close': float(data['pc']) if isinstance(data.get('pc'), (int, float)) else None,
    }


def fetch_profile(ticker):
    """Company profile: real name, exchange, market cap (millions), industry."""
    data = http_get_json(f'{FINNHUB_BASE}/stock/profile2?symbol={ticker}&token={FINNHUB_API_KEY}')
    if not isinstance(data, dict) or not data.get('name'):
        return None
    mcap = data.get('marketCapitalization')
    return {
        'name': data.get('name'),
        'exchange': (data.get('exchange') or '').replace(' EXCHANGE', '').strip() or '—',
        'market_cap_m': float(mcap) if isinstance(mcap, (int, float)) else None,
        'industry': data.get('finnhubIndustry') or None,
        'weburl': data.get('weburl') or None,
    }


def derive_sentiment(change_pct):
    """Sentiment is arithmetic, not editorial: derived purely from the day's move."""
    if change_pct is None:
        return 'NEUTRAL'
    if change_pct >= 2.0:
        return 'BULLISH'
    if change_pct <= -2.0:
        return 'BEARISH'
    return 'NEUTRAL'


def format_market_cap(mcap_m):
    if mcap_m is None:
        return '—'
    if mcap_m >= 1000:
        return f'${mcap_m / 1000:.1f}B'
    return f'${mcap_m:.0f}M'


def collect_stocks():
    """Scan the universe live, filter on real values, rank by real movement."""
    print(f'📡 Scanning {len(CANDIDATE_TICKERS)} candidates via Finnhub...')
    priced = []
    for i, ticker in enumerate(CANDIDATE_TICKERS, 1):
        quote = fetch_quote(ticker)
        if quote is None:
            print(f'  [{i}/{len(CANDIDATE_TICKERS)}] {ticker}: no quote, skipped')
        elif quote['price'] > MAX_STOCK_PRICE:
            print(f'  [{i}/{len(CANDIDATE_TICKERS)}] {ticker}: ${quote["price"]:.2f} above ${MAX_STOCK_PRICE:.0f}, skipped')
        else:
            priced.append({'ticker': ticker, **quote})
            print(f'  [{i}/{len(CANDIDATE_TICKERS)}] {ticker}: ${quote["price"]:.2f} ({quote["change"]}%)')
        time.sleep(PACE_SECONDS)

    print(f'✅ {len(priced)} candidates under ${MAX_STOCK_PRICE:.0f}')

    # Rank by the size of the real move, then profile only the strongest.
    priced.sort(key=lambda s: abs(s['change']) if s['change'] is not None else 0, reverse=True)

    selected = []
    for stock in priced[:PROFILE_LOOKUP_LIMIT]:
        if len(selected) >= TARGET_STOCKS:
            break
        profile = fetch_profile(stock['ticker'])
        time.sleep(PACE_SECONDS)
        if profile is None:
            print(f'  {stock["ticker"]}: no profile, skipped')
            continue
        if profile['market_cap_m'] is not None and profile['market_cap_m'] < MIN_MARKET_CAP_M:
            print(f'  {stock["ticker"]}: market cap {format_market_cap(profile["market_cap_m"])} below floor, skipped')
            continue
        selected.append({**stock, **profile, 'sentiment': derive_sentiment(stock['change'])})
        print(f'  ✓ {stock["ticker"]} ({profile["name"]}) {format_market_cap(profile["market_cap_m"])}')

    return selected


def get_format_date_en():
    now = datetime.datetime.now()
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
              'August', 'September', 'October', 'November', 'December']
    return f"{days[now.weekday()]}, {months[now.month - 1]} {now.day}, {now.year}"


def get_format_date_he():
    now = datetime.datetime.now()
    days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
    months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי',
              'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
    return f"{days[now.weekday()]}, {now.day} ב{months[now.month - 1]} {now.year}"


def generate_stock_card(stock):
    change = stock.get('change')
    change_class = 'up' if (change is not None and change >= 0) else 'down'
    change_sign = '+' if (change is not None and change >= 0) else ''
    change_text = f'{change_sign}{change:.2f}%' if change is not None else '—'

    sentiment = stock['sentiment']
    industry = stock.get('industry') or 'Market mover'

    if stock.get('prev_close'):
        why = f"{industry} · {change_text} vs prev close ${stock['prev_close']:.2f}"
    else:
        why = industry

    if stock.get('high') and stock.get('low'):
        day_range = f"Day range: ${stock['low']:.2f}–${stock['high']:.2f}"
    else:
        day_range = 'Day range: —'

    site_link = ''
    if stock.get('weburl'):
        site_link = f'<a href="{stock["weburl"]}" target="_blank" rel="noopener noreferrer">🌐 Company site</a>'

    return f"""
    <div class="card">
      <div class="card-header">
        <div>
          <div class="ticker">{stock['ticker']}</div>
          <div class="exchange">{stock['exchange']}</div>
        </div>
        <div class="price-block">
          <div class="price {change_class}">${stock['price']:.2f}</div>
          <div class="change {change_class}">{change_text}</div>
        </div>
      </div>
      <div class="company-name">{stock['name']}</div>
      <div class="why">{why}</div>
      <div class="social">
        <span class="tag tag-{sentiment.lower()}">{sentiment}</span>
        <span class="tag tag-neutral">📊 {format_market_cap(stock.get('market_cap_m'))} cap</span>
      </div>
      <div class="mcap">Market Cap: {format_market_cap(stock.get('market_cap_m'))} | {day_range}</div>
      <div class="links">
        <a href="https://finance.yahoo.com/quote/{stock['ticker']}" target="_blank" rel="noopener noreferrer">📈 Yahoo Chart</a>
        <a href="https://finance.yahoo.com/quote/{stock['ticker']}/news" target="_blank" rel="noopener noreferrer">📰 Yahoo News</a>
        {site_link}
      </div>
    </div>
    """


def generate_html(stocks, fetched_at):
    date_en = get_format_date_en()
    date_he = get_format_date_he()
    stock_cards = '\n'.join([generate_stock_card(s) for s in stocks])
    gainers = sum(1 for s in stocks if (s.get('change') or 0) > 0)
    losers = len(stocks) - gainers

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pre-Market Intelligence — {date_en}</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background: #0a0a0f;
            color: #e0e0e0;
            font-family: 'Space Grotesk', sans-serif;
            padding: 20px;
            line-height: 1.6;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        .header {{ border-bottom: 2px solid #00ff88; padding-bottom: 20px; margin-bottom: 30px; }}
        .header h1 {{
            font-size: 2.5em;
            color: #00ff88;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 10px;
        }}
        .header .date {{ font-size: 0.9em; color: #888; font-family: 'JetBrains Mono', monospace; margin-bottom: 5px; }}
        .header .date-he {{ font-size: 0.85em; color: #666; text-align: right; direction: rtl; font-family: Arial, sans-serif; }}
        .market-pulse {{
            background: #12121a;
            border: 1px solid #1e1e2e;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            font-size: 0.95em;
            line-height: 1.8;
        }}
        .market-pulse h2 {{ font-size: 0.75em; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px; }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
            margin-bottom: 30px;
        }}
        .card {{
            background: #12121a;
            border: 1px solid #1e1e2e;
            border-radius: 10px;
            padding: 18px;
            transition: border-color 0.3s ease;
        }}
        .card:hover {{ border-color: #2a2a3a; }}
        .card-header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }}
        .ticker {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.6em;
            font-weight: 700;
            color: #fff;
        }}
        .exchange {{
            font-size: 0.65em;
            color: #666;
            font-family: 'JetBrains Mono', monospace;
            margin-top: 4px;
        }}
        .price-block {{ text-align: right; }}
        .price {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.4em;
            font-weight: 700;
        }}
        .change {{ font-size: 0.85em; font-weight: 600; margin-top: 4px; }}
        .up {{ color: #00ff88; }}
        .down {{ color: #ff4444; }}
        .company-name {{
            font-size: 0.85em;
            color: #999;
            margin-bottom: 12px;
            font-weight: 500;
        }}
        .why {{
            font-size: 0.9em;
            line-height: 1.5;
            color: #ccc;
            margin-bottom: 12px;
            border-left: 2px solid #333;
            padding-left: 12px;
        }}
        .social {{
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 12px;
        }}
        .tag {{
            font-size: 0.7em;
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: 600;
            letter-spacing: 0.5px;
            white-space: nowrap;
        }}
        .tag-bullish {{ background: #003320; color: #00ff88; border: 1px solid #00ff8833; }}
        .tag-bearish {{ background: #330000; color: #ff4444; border: 1px solid #ff444433; }}
        .tag-neutral {{ background: #332200; color: #ffd700; border: 1px solid #ffd70033; }}
        .mcap {{
            font-size: 0.7em;
            color: #666;
            font-family: 'JetBrains Mono', monospace;
            margin-top: 10px;
        }}
        .links {{
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #1e1e2e;
        }}
        .links a {{
            font-size: 0.7em;
            color: #4da3ff;
            text-decoration: underline;
        }}
        .links a:hover {{ color: #7cc0ff; }}
        .footer {{
            margin-top: 40px;
            font-size: 0.75em;
            color: #555;
            text-align: center;
            border-top: 1px solid #1e1e2e;
            padding-top: 20px;
            font-family: 'JetBrains Mono', monospace;
        }}
        .section-label {{
            font-size: 0.7em;
            color: #666;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 20px;
            font-weight: 600;
        }}
        @media (max-width: 768px) {{
            .header h1 {{ font-size: 1.8em; }}
            .grid {{ grid-template-columns: 1fr; }}
            .card {{ padding: 14px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗞 PRE-MARKET INTELLIGENCE</h1>
            <div class="date">{date_en} • 🇮🇱 Israel Edition</div>
            <div class="date-he">{date_he}</div>
        </div>

        <div class="market-pulse">
            <h2>📡 Market Pulse</h2>
            <p>Of the {len(stocks)} movers published today, {gainers} advanced and {losers} declined.
            Every price, percentage change, market capitalisation and day range below was fetched live
            from Finnhub at {fetched_at} UTC. Sentiment tags are derived arithmetically from each name's
            move on the day (≥ +2% bullish, ≤ −2% bearish, otherwise neutral) and are not an editorial
            opinion or a recommendation.</p>
        </div>

        <div class="section-label">🔥 Top {len(stocks)} Movers — Under ${MAX_STOCK_PRICE:.0f} • Market Cap &gt;${MIN_MARKET_CAP_M:.0f}M</div>
        <div class="grid">
{stock_cards}
        </div>

        <div class="footer">
            <p>Live data: Finnhub • Fetched {fetched_at} UTC • For informational purposes only • Not financial advice</p>
            <p>Magazine ID: {datetime.datetime.now().strftime('%Y%m%d_%H%M')}</p>
        </div>
    </div>
</body>
</html>
"""


def main():
    try:
        print("🚀 Starting magazine generation (live data)...")

        if not FINNHUB_API_KEY:
            print("❌ ERROR: FINNHUB_API_KEY is not set. Refusing to publish without live data.")
            return False

        stocks = collect_stocks()

        if len(stocks) < MIN_ACCEPTABLE:
            print(f"❌ ERROR: only {len(stocks)} stocks passed the filters "
                  f"(minimum {MIN_ACCEPTABLE}). Refusing to publish a hollow magazine.")
            return False

        fetched_at = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M')
        html_content = generate_html(stocks, fetched_at)
        print(f"✅ HTML generated ({len(html_content)} bytes) from {len(stocks)} live quotes")

        mag_dir = Path('magazines')
        mag_dir.mkdir(exist_ok=True)
        now = datetime.datetime.now()
        filepath = mag_dir / f"PreMarket_{now.strftime('%m%d%Y')}.html"

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)

        if not filepath.exists() or filepath.stat().st_size == 0:
            print("❌ ERROR: file missing or empty after write!")
            return False

        print(f"✅ SUCCESS! {filepath} ({filepath.stat().st_size} bytes)")
        print(f"📊 Stocks published: {len(stocks)}")
        return True

    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    # Exit nonzero on failure so GitHub Actions marks the run RED.
    sys.exit(0 if main() else 1)
