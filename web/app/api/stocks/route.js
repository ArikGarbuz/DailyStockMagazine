// Candidate universe of small/mid-cap NASDAQ/NYSE tickers to screen live.
// Finnhub's free tier has no built-in screener, so we scan this list and
// filter/rank using real quote + profile data on every request.
const CANDIDATE_TICKERS = [
  'BMNR', 'SOFI', 'RIVN', 'JOBY', 'NOK', 'POET', 'OCFN', 'HUT', 'MARA', 'CLSK',
  'RIOT', 'CIFR', 'CORE', 'WULF', 'IREN', 'PLUG', 'FCEL', 'CHPT', 'LCID', 'SIRI',
  'NIO', 'ACHR'
];

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

function normalizeExchange(raw) {
  if (!raw) return null;
  const u = raw.toUpperCase();
  if (u.includes('NASDAQ')) return 'NASDAQ';
  if (u.includes('NEW YORK STOCK EXCHANGE')) return 'NYSE';
  return null; // excludes AMEX, OTC, foreign exchanges, etc.
}

function formatMarketCap(millions) {
  if (!millions || millions <= 0) return null;
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${millions.toFixed(0)}M`;
}

function deriveSentiment(pctChange) {
  if (typeof pctChange !== 'number') return 'NEUTRAL';
  if (pctChange > 3) return 'BULLISH';
  if (pctChange < -3) return 'BEARISH';
  return 'NEUTRAL';
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Finnhub request failed: ${res.status}`);
  return res.json();
}

// Simple bounded-concurrency map so we stay well under Finnhub's
// free-tier limit of 60 requests/minute in a single invocation.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      try {
        results[current] = await fn(items[current], current);
      } catch (err) {
        results[current] = null;
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function fetchLiveStocks(apiKey) {
  // Phase 1: real-time quotes for every candidate
  const quoteResults = await mapLimit(CANDIDATE_TICKERS, 8, async (ticker) => {
    const q = await fetchJson(`${FINNHUB_BASE}/quote?symbol=${ticker}&token=${apiKey}`);
    if (!q || typeof q.c !== 'number' || q.c <= 0 || typeof q.dp !== 'number') return null;
    if (q.c >= 30) return null; // price filter
    return { ticker, quote: q };
  });
  const priceFiltered = quoteResults.filter(Boolean);

  // Phase 2: company profile (real market cap + real exchange) for survivors
  const profileResults = await mapLimit(priceFiltered, 8, async ({ ticker, quote }) => {
    const p = await fetchJson(`${FINNHUB_BASE}/stock/profile2?symbol=${ticker}&token=${apiKey}`);
    const exchange = normalizeExchange(p?.exchange);
    if (!exchange) return null; // NASDAQ/NYSE only
    if (!p.marketCapitalization || p.marketCapitalization < 500) return null; // >$500M
    return { ticker, quote, profile: p, exchange };
  });
  const qualified = profileResults.filter(Boolean);

  // Rank by magnitude of real % move, take top 15
  qualified.sort((a, b) => Math.abs(b.quote.dp) - Math.abs(a.quote.dp));
  const top = qualified.slice(0, 15);

  // Phase 3: real news headline + real URL, only for the final picks
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const finalStocks = await mapLimit(top, 8, async ({ ticker, quote, profile, exchange }) => {
    let headline = null;
    let url = null;
    let source = null;
    try {
      const news = await fetchJson(
        `${FINNHUB_BASE}/company-news?symbol=${ticker}&from=${fmt(weekAgo)}&to=${fmt(today)}&token=${apiKey}`
      );
      if (Array.isArray(news) && news.length > 0) {
        headline = news[0].headline;
        url = news[0].url;
        source = news[0].source;
      }
    } catch (err) {
      // No news available — not fatal, card still shows real price data
    }

    const rangeText = (typeof quote.l === 'number' && typeof quote.h === 'number')
      ? `$${quote.l.toFixed(2)}–$${quote.h.toFixed(2)}`
      : null;

    return {
      ticker,
      exchange,
      price: quote.c,
      change: quote.dp,
      name: profile.name || ticker,
      nameHE: profile.name || ticker,
      why: headline || `Day range ${rangeText || 'n/a'} — ${quote.dp >= 0 ? '+' : ''}${quote.dp.toFixed(2)}% today (no fresh news article found)`,
      whyHE: headline
        ? `ידיעה מ-${source || 'חדשות'} (באנגלית) — ראה קישור למקור`
        : 'אין ידיעה טריה זמינה כרגע',
      sentiment: deriveSentiment(quote.dp),
      marketCap: formatMarketCap(profile.marketCapitalization),
      volume: rangeText || 'n/a',
      catalyst: source || null,
      newsUrl: url || null,
      isLive: true
    };
  });

  return finalStocks.filter(Boolean);
}

// Fallback used only when Finnhub is unreachable or no key is configured.
// Clearly marked isLive:false so the UI can show the demo-data disclaimer.
function getFallbackStocks() {
  const sample = [
    { ticker: 'BMNR', exchange: 'NYSE', price: 24.36, change: 6.7, name: 'BitMine Immersion', nameHE: 'BitMine Immersion', why: 'Ethereum treasury $14.9B', whyHE: 'אוצר Ethereum $14.9B', sentiment: 'BULLISH', marketCap: '$3.2B', volume: 'n/a' },
    { ticker: 'SOFI', exchange: 'NASDAQ', price: 18.31, change: 32.0, name: 'SoFi Technologies', nameHE: 'SoFi Tech', why: 'Fintech momentum strong', whyHE: 'תנופה fintech חזקה', sentiment: 'BULLISH', marketCap: '$14.8B', volume: 'n/a' },
    { ticker: 'RIVN', exchange: 'NASDAQ', price: 16.97, change: -2.1, name: 'Rivian Automotive', nameHE: 'Rivian', why: 'EV sector pullback', whyHE: 'נסיגה EV', sentiment: 'NEUTRAL', marketCap: '$18.5B', volume: 'n/a' },
    { ticker: 'JOBY', exchange: 'NYSE', price: 9.42, change: 5.3, name: 'Joby Aviation', nameHE: 'Joby Aviation', why: 'Urban air mobility approved', whyHE: 'ניידות אוויר', sentiment: 'BULLISH', marketCap: '$2.1B', volume: 'n/a' },
    { ticker: 'NOK', exchange: 'NYSE', price: 4.18, change: -3.2, name: 'Nokia Oyj', nameHE: 'Nokia', why: 'R&D restructuring', whyHE: 'הערכה מחדש R&D', sentiment: 'BEARISH', marketCap: '$23.4B', volume: 'n/a' },
    { ticker: 'POET', exchange: 'NASDAQ', price: 8.27, change: 7.9, name: 'POET Technologies', nameHE: 'POET Tech', why: 'AI semiconductor demand', whyHE: 'ביקוש AI semiconductors', sentiment: 'BULLISH', marketCap: '$625M', volume: 'n/a' },
    { ticker: 'OCFN', exchange: 'NASDAQ', price: 19.08, change: 4.2, name: 'OceanFirst Financial', nameHE: 'OceanFirst', why: 'Regional bank strength', whyHE: 'כוח בנקים אזוריים', sentiment: 'BULLISH', marketCap: '$891M', volume: 'n/a' },
    { ticker: 'HUT', exchange: 'NASDAQ', price: 14.62, change: 12.1, name: 'Hut 8 Corp', nameHE: 'Hut 8 Corp', why: 'Bitcoin mining and HPC capacity growth', whyHE: 'צמיחת כרייה ותשתיות HPC', sentiment: 'BULLISH', marketCap: '$2.9B', volume: 'n/a' },
    { ticker: 'MARA', exchange: 'NASDAQ', price: 15.42, change: 8.9, name: 'Marathon Digital', nameHE: 'Marathon Digital', why: 'BTC mining efficiency gains', whyHE: 'יעילות כרייה', sentiment: 'BULLISH', marketCap: '$2.1B', volume: 'n/a' },
    { ticker: 'CLSK', exchange: 'NASDAQ', price: 12.55, change: 6.3, name: 'CleanSpark Inc', nameHE: 'CleanSpark', why: 'Renewable mining focus', whyHE: 'כרייה גם סקות חדשות', sentiment: 'BULLISH', marketCap: '$1.8B', volume: 'n/a' },
    { ticker: 'RIOT', exchange: 'NASDAQ', price: 11.28, change: 9.4, name: 'Riot Platforms', nameHE: 'Riot', why: 'Bitcoin infrastructure play', whyHE: 'תשתיות Bitcoin', sentiment: 'BULLISH', marketCap: '$3.5B', volume: 'n/a' },
    { ticker: 'CIFR', exchange: 'NASDAQ', price: 8.76, change: 5.1, name: 'Cipher Mining', nameHE: 'Cipher Mining', why: 'Mining capacity expansion', whyHE: 'הרחבת כושר כרייה', sentiment: 'BULLISH', marketCap: '$950M', volume: 'n/a' },
    { ticker: 'CORE', exchange: 'NASDAQ', price: 6.89, change: 3.7, name: 'Core Scientific', nameHE: 'Core Scientific', why: 'Mining operations growing', whyHE: 'פעולות כרייה גדלות', sentiment: 'NEUTRAL', marketCap: '$820M', volume: 'n/a' },
    { ticker: 'WULF', exchange: 'NASDAQ', price: 6.89, change: 4.2, name: 'TeraWulf Inc', nameHE: 'TeraWulf', why: 'Sustainable mining capacity increase', whyHE: 'עלייה בכושר כרייה בר-קיימא', sentiment: 'BULLISH', marketCap: '$2.1B', volume: 'n/a' },
    { ticker: 'IREN', exchange: 'NASDAQ', price: 18.45, change: 6.8, name: 'Iris Energy Ltd', nameHE: 'Iris Energy', why: 'AI data center expansion news', whyHE: 'חדשות הרחבת מרכזי נתונים AI', sentiment: 'BULLISH', marketCap: '$3.4B', volume: 'n/a' }
  ];
  return sample.map((s) => ({ ...s, isLive: false, whyHE: `${s.whyHE} (דוגמה — לא חי)`, newsUrl: null, catalyst: null }));
}

export async function GET() {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    let stocksData = null;

    if (apiKey) {
      try {
        const liveStocks = await fetchLiveStocks(apiKey);
        if (liveStocks.length > 0) {
          stocksData = {
            date: new Date().toISOString(),
            stocks: liveStocks,
            source: 'finnhub-live'
          };
        }
      } catch (err) {
        console.error('Finnhub live fetch failed, falling back to sample data:', err);
      }
    }

    if (!stocksData) {
      stocksData = {
        date: new Date().toISOString(),
        stocks: getFallbackStocks(),
        source: 'sample-fallback'
      };
    }

    return Response.json(stocksData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800'
      }
    });
  } catch (error) {
    console.error('Error fetching stocks:', error);

    return Response.json(
      { error: 'Failed to fetch stocks', message: error.message },
      { status: 500 }
    );
  }
}

