---
name: premarket-stock-magazine
description: Daily pre-market stock magazine — top volume movers under $30, news + Reddit buzz, saved to G:\My Drive\stock Magazine
---

You are generating a daily pre-market stock intelligence magazine. Run every weekday at 4:20 PM Israel time (10 minutes before the NYSE/NASDAQ opens at 9:30 AM ET).

⭐ **NEW:** GitHub Actions auto-publishes new magazines every day. Just save to `magazines/` folder!

---

## STEP 1 — FETCH MARKET DATA

Search for most-active and biggest-gainers stocks using WebSearch:
- Query: "most active stocks today NYSE NASDAQ [DATE]"
- Query: "biggest gainers stocks today NYSE NASDAQ under $30 [DATE]"

From the combined results, build a candidate list by:
1. Keeping only NYSE and NASDAQ stocks (drop AMEX)
2. Keeping only stocks with price UNDER $30
3. REMOVING any obvious ETFs/funds — drop anything with these words in the name: ETF, Bull, Bear, Fund, Trust, ProShares, Direxion, GraniteShares, iShares, Invesco, Leverage Shares, Daily Target
4. Select the TOP 15 most interesting stocks — prioritize biggest % change + high volume. Mix gainers with most-active movers.

---

## STEP 2 — RESEARCH EACH STOCK

For each of the 15 stocks, use WebSearch to find (run searches in parallel where possible):

a) **News**: search `"[TICKER] stock news today pre-market"` — extract the headline and 1-sentence summary of WHY it's moving
b) **Market cap**: search `"[TICKER] [COMPANY NAME] market cap"` — note the value. If clearly under $500M, replace this stock with the next candidate from Step 1.
c) **Reddit buzz**: search `"[TICKER] site:reddit.com/r/wallstreetbets OR reddit.com/r/stocks OR reddit.com/r/pennystocks"` — note if there's recent discussion (last 24-48h) and sentiment (bullish/bearish/mixed)
d) **StockTwits**: search `"stocktwits [TICKER]"` — note the mood/sentiment if available

---

## STEP 3 — GENERATE HTML MAGAZINE

Write the following HTML to the file `G:\My Drive\stock Magazine\PreMarket_[MMDDYYYY].html` using the Write tool.

**BILINGUAL REQUIREMENT:** Each section must include Hebrew translation below the English text.

Design spec:
- **Dark theme**: background #0a0a0f, card background #12121a, accent border #1e1e2e
- **Typography**: monospace for tickers, sans-serif for body. Use Google Fonts (Space Grotesk + JetBrains Mono) via CDN link.
- **Color coding**: green #00ff88 for positive change, red #ff4444 for negative, yellow #ffd700 for neutral/watch
- **Layout**: full-width header, then a responsive CSS grid of stock cards (2 columns on desktop, 1 on mobile)
- **Mobile-first**: max-width 600px works perfectly (user views on phone)
- **Hebrew text**: Add `direction: rtl` for right-to-left layout, use Arial font for Hebrew sections

HTML structure:

```
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pre-Market Intelligence — [DATE]</title>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    /* Full inline CSS — dark theme magazine */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #e0e0e0; font-family: 'Space Grotesk', sans-serif; padding: 16px; }
    .header { border-bottom: 2px solid #00ff88; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 1.4em; color: #00ff88; letter-spacing: 2px; text-transform: uppercase; }
    .header .meta { font-size: 0.75em; color: #666; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
    .market-pulse { background: #12121a; border: 1px solid #1e1e2e; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 0.85em; line-height: 1.6; }
    .market-pulse h2 { font-size: 0.7em; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 10px; padding: 16px; position: relative; overflow: hidden; }
    .card:hover { border-color: #333; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .ticker { font-family: 'JetBrains Mono', monospace; font-size: 1.4em; font-weight: 700; color: #fff; }
    .exchange { font-size: 0.65em; color: #555; font-family: 'JetBrains Mono', monospace; }
    .price-block { text-align: right; }
    .price { font-family: 'JetBrains Mono', monospace; font-size: 1.3em; font-weight: 700; }
    .change { font-size: 0.8em; font-weight: 600; }
    .up { color: #00ff88; }
    .down { color: #ff4444; }
    .company-name { font-size: 0.8em; color: #888; margin-bottom: 10px; }
    .why { font-size: 0.82em; line-height: 1.5; color: #ccc; margin-bottom: 10px; border-left: 2px solid #333; padding-left: 10px; }
    .social { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .tag { font-size: 0.68em; padding: 3px 8px; border-radius: 20px; font-weight: 600; letter-spacing: 0.5px; }
    .tag-bull { background: #003320; color: #00ff88; border: 1px solid #00ff8833; }
    .tag-bear { background: #330000; color: #ff4444; border: 1px solid #ff444433; }
    .tag-neutral { background: #332200; color: #ffd700; border: 1px solid #ffd70033; }
    .tag-reddit { background: #1a0d00; color: #ff6314; border: 1px solid #ff631433; }
    .mcap { font-size: 0.68em; color: #555; font-family: 'JetBrains Mono', monospace; margin-top: 8px; }
    .footer { margin-top: 24px; font-size: 0.7em; color: #333; text-align: center; border-top: 1px solid #1e1e2e; padding-top: 12px; font-family: 'JetBrains Mono', monospace; }
    .section-label { font-size: 0.65em; color: #555; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🗞 Pre-Market Intelligence</h1>
    <div class="meta">[FULL DATE e.g. Monday, June 09, 2026] &nbsp;|&nbsp; NYSE opens in 10 minutes &nbsp;|&nbsp; 🇮🇱 Israel Edition</div>
  </div>

  <div class="market-pulse">
    <h2>📡 Market Pulse</h2>
    [2-3 sentence overview of overall market mood today — is it risk-on or risk-off? Any macro events, Fed news, or major earnings driving sentiment? Mention SPY/QQQ direction if available from the data.]
  </div>

  <div class="section-label">🔥 Top Movers — Under $30 · Market Cap >$500M · NYSE/NASDAQ</div>
  <div class="grid">
    <!-- Repeat this card for each of the 15 stocks: -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="ticker">[TICKER]</div>
          <div class="exchange">[EXCHANGE]</div>
        </div>
        <div class="price-block">
          <div class="price [up/down]">$[PRICE]</div>
          <div class="change [up/down]">[+/-X.XX%]</div>
        </div>
      </div>
      <div class="company-name">[Full Company Name]</div>
      <div class="why">[1-2 sentence explanation of WHY it's moving today, from news search]</div>
      <div class="social">
        [Include relevant tags: <span class="tag tag-bull">BULLISH</span> or <span class="tag tag-bear">BEARISH</span> or <span class="tag tag-neutral">WATCH</span>]
        [If Reddit discussion found: <span class="tag tag-reddit">🤖 Reddit Buzz</span>]
        [Custom tag with source e.g.: <span class="tag tag-neutral">📰 Earnings</span> or <span class="tag tag-bull">🚀 Catalyst</span>]
      </div>
      <div class="mcap">Market Cap: [VALUE] &nbsp;|&nbsp; Vol: [% change]</div>
    </div>
  </div>

  <div class="footer">
    Generated 4:20 PM IST · Data: Web Search + Market Aggregators · For informational purposes only · Not financial advice
  </div>
</body>
</html>
```

Fill in all placeholder values with real data from Steps 1 and 2. 

---

## STEP 4 — SAVE TO GIT & GITHUB (OPTIONAL)

After creating the HTML file, optionally commit to GitHub:

```bash
cd "G:\My Drive\stock Magazine"
git add magazines/PreMarket_*.html
git commit -m "Daily magazine: [DATE]"
git push origin main
```

Or use GitHub Desktop app to commit visually.

---

## IMPORTANT NOTES
- Always use real data. Do not invent prices, percentages, or news.
- The user is a volume-focused trader. Emphasize volume anomalies and momentum.
- If fewer than 5 stocks pass the filters (price < $30, market cap > $500M, NYSE/NASDAQ, not ETF), lower the market cap threshold to $200M for that day and note it in the magazine header.
- Keep the HTML file under 200KB.
- Save file with format: `PreMarket_MMDDYYYY.html` (e.g., PreMarket_08252026.html)
