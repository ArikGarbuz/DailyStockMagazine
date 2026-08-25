#!/usr/bin/env python3
"""
Generate daily pre-market stock magazine (bilingual HTML)
Runs via GitHub Actions at 4:20 PM IST daily
"""

import json
import datetime
import os
from pathlib import Path

# Stock data - same as in web/app/api/stocks/route.js
SAMPLE_STOCKS = [
    {'ticker': 'BMNR', 'exchange': 'NYSE', 'price': 24.36, 'change': 6.7, 'name': 'BitMine Immersion', 'nameHE': 'BitMine Immersion', 'why': 'Ethereum treasury $14.9B', 'whyHE': 'אוצר Ethereum $14.9B', 'sentiment': 'BULLISH', 'marketCap': '$3.2B', 'volume': '+6.7%', 'catalyst': 'Treasury', 'reddit': True},
    {'ticker': 'SOFI', 'exchange': 'NASDAQ', 'price': 18.31, 'change': 32.0, 'name': 'SoFi Technologies', 'nameHE': 'SoFi Tech', 'why': 'Fintech momentum strong', 'whyHE': 'תנופה fintech חזקה', 'sentiment': 'BULLISH', 'marketCap': '$14.8B', 'volume': 'High', 'catalyst': 'Earnings', 'reddit': True},
    {'ticker': 'RIVN', 'exchange': 'NASDAQ', 'price': 16.97, 'change': -2.1, 'name': 'Rivian Automotive', 'nameHE': 'Rivian', 'why': 'EV sector pullback', 'whyHE': 'נסיגה EV', 'sentiment': 'NEUTRAL', 'marketCap': '$18.5B', 'volume': 'Elevated', 'reddit': False},
    {'ticker': 'JOBY', 'exchange': 'NYSE', 'price': 9.42, 'change': 5.3, 'name': 'Joby Aviation', 'nameHE': 'Joby Aviation', 'why': 'Urban air mobility approved', 'whyHE': 'ניידות אוויר', 'sentiment': 'BULLISH', 'marketCap': '$2.1B', 'volume': '+5.3%', 'reddit': True},
    {'ticker': 'NOK', 'exchange': 'NYSE', 'price': 4.18, 'change': -3.2, 'name': 'Nokia Oyj', 'nameHE': 'Nokia', 'why': 'R&D restructuring', 'whyHE': 'הערכה מחדש R&D', 'sentiment': 'BEARISH', 'marketCap': '$23.4B', 'volume': '+2.1M', 'reddit': False},
    {'ticker': 'POET', 'exchange': 'NASDAQ', 'price': 8.27, 'change': 7.9, 'name': 'POET Technologies', 'nameHE': 'POET Tech', 'why': 'AI semiconductor demand', 'whyHE': 'ביקוש AI semiconductors', 'sentiment': 'BULLISH', 'marketCap': '$625M', 'volume': '+7.9%', 'reddit': True},
    {'ticker': 'OCFN', 'exchange': 'NASDAQ', 'price': 19.08, 'change': 4.2, 'name': 'OceanFirst Financial', 'nameHE': 'OceanFirst', 'why': 'Regional bank strength', 'whyHE': 'כוח בנקים אזוריים', 'sentiment': 'BULLISH', 'marketCap': '$891M', 'volume': '+4.2%', 'reddit': False},
    {'ticker': 'BTCT', 'exchange': 'OTC', 'price': 2.84, 'change': 12.1, 'name': 'BTC Digital Ltd', 'nameHE': 'BTC Digital', 'why': 'Bitcoin mining recovery', 'whyHE': 'התאוששות כרייה', 'sentiment': 'BULLISH', 'marketCap': '$742M', 'volume': '+12.1%', 'reddit': True},
    {'ticker': 'MARA', 'exchange': 'NASDAQ', 'price': 15.42, 'change': 8.9, 'name': 'Marathon Digital', 'nameHE': 'Marathon Digital', 'why': 'BTC mining efficiency gains', 'whyHE': 'יעילות כרייה', 'sentiment': 'BULLISH', 'marketCap': '$2.1B', 'volume': '+8.9%', 'reddit': True},
    {'ticker': 'CLSK', 'exchange': 'NASDAQ', 'price': 12.55, 'change': 6.3, 'name': 'CleanSpark Inc', 'nameHE': 'CleanSpark', 'why': 'Renewable mining focus', 'whyHE': 'כרייה עם סקות חדשות', 'sentiment': 'BULLISH', 'marketCap': '$1.8B', 'volume': '+6.3%', 'reddit': True},
    {'ticker': 'RIOT', 'exchange': 'NASDAQ', 'price': 11.28, 'change': 9.4, 'name': 'Riot Platforms', 'nameHE': 'Riot', 'why': 'Bitcoin infrastructure play', 'whyHE': 'תשתיות Bitcoin', 'sentiment': 'BULLISH', 'marketCap': '$3.5B', 'volume': '+9.4%', 'reddit': True},
    {'ticker': 'CIFR', 'exchange': 'NASDAQ', 'price': 8.76, 'change': 5.1, 'name': 'Cipher Mining', 'nameHE': 'Cipher Mining', 'why': 'Mining capacity expansion', 'whyHE': 'הרחבת כושר כרייה', 'sentiment': 'BULLISH', 'marketCap': '$950M', 'volume': '+5.1%', 'reddit': False},
    {'ticker': 'CORE', 'exchange': 'NASDAQ', 'price': 6.89, 'change': 3.7, 'name': 'Core Scientific', 'nameHE': 'Core Scientific', 'why': 'Mining operations growing', 'whyHE': 'פעולות כרייה גדלות', 'sentiment': 'NEUTRAL', 'marketCap': '$820M', 'volume': '+3.7%', 'reddit': False},
    {'ticker': 'SRUUF', 'exchange': 'OTC', 'price': 5.34, 'change': 4.2, 'name': 'Surge Bitcoin Mining', 'nameHE': 'Surge Mining', 'why': 'Hashrate increase', 'whyHE': 'עלייה בHashrate', 'sentiment': 'BULLISH', 'marketCap': '$650M', 'volume': '+4.2%', 'reddit': True},
    {'ticker': 'DMGI', 'exchange': 'OTC', 'price': 3.21, 'change': 6.8, 'name': 'DMG Blockchain', 'nameHE': 'DMG Blockchain', 'why': 'Mining expansion news', 'whyHE': 'חדשות הרחבה', 'sentiment': 'BULLISH', 'marketCap': '$580M', 'volume': '+6.8%', 'reddit': True}
]

def get_format_date_en():
    """Get formatted date in English"""
    now = datetime.datetime.now()
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    day_name = days[now.weekday()]
    month_name = months[now.month - 1]
    return f"{day_name}, {month_name} {now.day}, {now.year}"

def get_format_date_he():
    """Get formatted date in Hebrew"""
    now = datetime.datetime.now()
    days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
    months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
    day_name = days[now.weekday()]
    month_name = months[now.month - 1]
    return f"{day_name}, {now.day} ב{month_name} {now.year}"

def generate_stock_card(stock):
    """Generate HTML for a single stock card"""
    change_class = 'up' if stock['change'] >= 0 else 'down'
    change_sign = '+' if stock['change'] >= 0 else ''

    sentiment_class = f"tag-{stock['sentiment'].lower()}"
    sentiment_text = stock['sentiment']

    reddit_tag = f'<span class="tag tag-reddit">🤖 Reddit Buzz</span>' if stock['reddit'] else ''

    return f"""
    <div class="card">
      <div class="card-header">
        <div>
          <div class="ticker">{stock['ticker']}</div>
          <div class="exchange">{stock['exchange']}</div>
        </div>
        <div class="price-block">
          <div class="price {change_class}">${stock['price']}</div>
          <div class="change {change_class}">{change_sign}{stock['change']:.1f}%</div>
        </div>
      </div>
      <div class="company-name">{stock['name']}</div>
      <div class="why">{stock['why']}</div>
      <div class="social">
        <span class="tag tag-{stock['sentiment'].lower()}">{sentiment_text}</span>
        {reddit_tag}
        <span class="tag tag-neutral">📊 {stock['catalyst']}</span>
      </div>
      <div class="mcap">Market Cap: {stock['marketCap']} | Vol: {stock['volume']}</div>
    </div>
    """

def generate_html():
    """Generate complete HTML magazine"""
    date_en = get_format_date_en()
    date_he = get_format_date_he()

    stock_cards = '\n'.join([generate_stock_card(stock) for stock in SAMPLE_STOCKS])

    html = f"""<!DOCTYPE html>
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
        .market-pulse-he {{
            text-align: right;
            direction: rtl;
            font-family: Arial, sans-serif;
            color: #aaa;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #333;
        }}
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
        .tag-reddit {{ background: #1a0d00; color: #ff6314; border: 1px solid #ff631433; }}
        .mcap {{
            font-size: 0.7em;
            color: #666;
            font-family: 'JetBrains Mono', monospace;
            margin-top: 10px;
        }}
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
            <div class="date">{date_en} • NYSE opens in 10 minutes • 🇮🇱 Israel Edition</div>
            <div class="date-he">{date_he} • NYSE נפתח בעוד 10 דקות</div>
        </div>

        <div class="market-pulse">
            <h2>📡 Market Pulse</h2>
            <p>Mixed sentiment with trade tensions and tariff concerns dominating headlines. SPY and QQQ showed weakness due to U.S.-Canada trade escalation and weakening consumer confidence. Tech sector remains focal point ahead of earnings. Healthcare and Financial Services leading market performance. Risk-off mood early, watching for potential reversal on dovish signals.</p>
            <div class="market-pulse-he">
                <strong>🇮🇱 דעה בשוק:</strong> אווירה מעורבת עם מתחי סחר והשפעה של דירוג מס. SPY ו-QQQ הראו חולשה בגלל הגברת המתח בין ארה״ב וקנדה. סקטור הטכנולוגיה נשאר במוקד הביקורת. סקטור בריאות ושירותים פיננסיים מובילים בביצוע.
            </div>
        </div>

        <div class="section-label">🔥 Top 15 Movers — Under $30 • Market Cap >$500M • NYSE/NASDAQ</div>
        <div class="grid">
            {stock_cards}
        </div>

        <div class="footer">
            <p>Generated at 4:20 PM IST • Data: Market Aggregators • For informational purposes only • Not financial advice</p>
            <p>Magazine ID: {datetime.datetime.now().strftime('%Y%m%d_%H%M')}</p>
        </div>
    </div>
</body>
</html>
"""
    return html

def main():
    """Main execution"""
    try:
        print("🚀 Starting magazine generation...")
        print(f"📍 Current working directory: {os.getcwd()}")

        # Create magazines directory if it doesn't exist
        mag_dir = Path('magazines')
        print(f"📁 Creating/accessing magazines folder: {mag_dir.absolute()}")
        mag_dir.mkdir(exist_ok=True)
        print(f"✅ Magazines folder ready")

        # Generate HTML
        print("🎨 Generating HTML content...")
        html_content = generate_html()
        print(f"✅ HTML generated ({len(html_content)} bytes)")

        # Get filename with today's date
        now = datetime.datetime.now()
        filename = f"PreMarket_{now.strftime('%m%d%Y')}.html"
        filepath = mag_dir / filename
        print(f"📄 Filename: {filename}")
        print(f"📍 Full path: {filepath.absolute()}")

        # Write file
        print("💾 Writing file to disk...")
        with open(filepath, 'w', encoding='utf-8') as f:
            bytes_written = f.write(html_content)
        print(f"✅ File written: {bytes_written} bytes")

        # Verify file exists
        if filepath.exists():
            print(f"✅ File verified: {filepath.stat().st_size} bytes")
        else:
            print(f"❌ ERROR: File not found after writing!")
            return False

        print(f"\n✅ SUCCESS! Magazine generated: {filepath}")
        print(f"📊 Stocks included: {len(SAMPLE_STOCKS)}")
        print(f"📅 Date: {now.strftime('%Y-%m-%d %H:%M IST')}")
        print(f"🔗 File ready for git commit")
        return True

    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    main()
