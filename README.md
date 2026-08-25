# Daily Stock Magazine 📊

Automated daily pre-market stock intelligence magazine — bilingual (English 🇬🇧 + Hebrew 🇮🇱)

## Overview

This repository generates a professional HTML magazine every weekday at **4:20 PM Israel time** (10 minutes before NYSE/NASDAQ opens). Features the top 8 volume movers under $30 with real-time news, market sentiment, and technical analysis.

## Features

✨ **Bilingual Magazine**
- English + Hebrew on every page
- Dark theme optimized for mobile viewing
- Responsive grid layout (desktop + mobile)

📈 **Stock Analysis**
- Top 8 most active & biggest gainers under $30
- Real-time price & % change
- Market cap verification ($500M+ threshold)
- Reddit & social sentiment tags
- Why each stock is moving (news-driven)

🎨 **Design**
- Dark theme: #0a0a0f background
- Green (#00ff88) for gains, Red (#ff4444) for losses
- Professional typography (Space Grotesk + JetBrains Mono)
- Mobile-first responsive design

⏰ **Schedule**
- Runs automatically: **Monday-Friday at 4:20 PM IST**
- Files saved as: `PreMarket_MMDDYYYY.html`
- Example: `PreMarket_08252026.html`

## File Structure

```
DailyStockMagazine/
├── README.md              # This file
├── SKILL.md               # Automation skill instructions
├── magazines/
│   ├── PreMarket_08252026.html
│   ├── PreMarket_08262026.html
│   └── ... (daily archives)
└── templates/
    └── sample.html        # Template reference
```

## How It Works

### Step 1: Market Data Fetch
- WebSearch for most-active stocks today
- WebSearch for biggest gainers under $30
- Filter: NYSE/NASDAQ only, <$30 price, >$500M market cap, no ETFs

### Step 2: Research
- News headlines + why each stock is moving
- Market cap verification
- Reddit/StockTwits sentiment analysis
- Volume & momentum data

### Step 3: Generate HTML
- Create bilingual magazine (English + Hebrew)
- Render 15 stock cards with analysis
- Include market pulse section (SPY/QQQ sentiment)
- Save to `magazines/PreMarket_[DATE].html`

### Step 4: Archive
- Commit to GitHub automatically
- Keep rolling 30-day archive
- Ready for download/sharing

## Getting Started

### View Latest Magazine
1. Go to `magazines/` folder
2. Open latest `PreMarket_[DATE].html` in browser
3. Read English or Hebrew as preferred

### Setup Local Copy

```bash
git clone https://github.com/ArikGarbuz/DailyStockMagazine.git
cd DailyStockMagazine
# Open any magazine in your browser
open magazines/PreMarket_08252026.html
```

### Running Manually
The magazine runs automatically, but to generate on-demand:
- Trigger the Cowork scheduled task manually
- New file appears in `magazines/` within minutes

## Data Sources

- **Market Data:** WebSearch (Yahoo Finance, TradingView, Nasdaq.com)
- **News:** Real-time financial news searches
- **Sentiment:** Reddit (/r/wallstreetbets, /r/stocks, /r/pennystocks)
- **Social:** StockTwits mood analysis

## Language Support

🇬🇧 **English**
- Ticker, Price, % Change
- Company descriptions & news
- Analysis & sentiment tags

🇮🇱 **Hebrew (עברית)**
- Translations for all content
- Right-to-left (RTL) layout
- Same data, different language

*Switch between languages by scrolling — each section includes both!*

## Customization

Edit `SKILL.md` to modify:
- Stock filtering criteria (price range, market cap threshold)
- Number of stocks displayed (currently 8)
- Market sentiment lookback period
- HTML styling (colors, fonts, layout)

## Technical Stack

- **Automation:** Claude scheduled tasks (weekday 4:20 PM IST)
- **Data:** WebSearch API
- **HTML:** Dark theme, responsive CSS
- **Version Control:** Git + GitHub
- **Languages:** English, Hebrew (UTF-8)

## Disclaimer

⚠️ **For informational purposes only.** This magazine is NOT financial advice. 

All data comes from public sources. Always do your own research before trading. Past performance does not guarantee future results.

## Contributing

Found an issue? Have a suggestion?
- Report bugs via GitHub Issues
- Suggest improvements via Pull Requests
- Feature requests welcome!

## License

MIT License — Free to use and modify

---

**Last Updated:** August 25, 2026  
**Magazine Generated:** Every weekday at 4:20 PM IST  
**Repository:** https://github.com/ArikGarbuz/DailyStockMagazine.git

---

*Made with ❤️ for volume traders who speak English & Hebrew*
