// Candidate universe of small/mid-cap NASDAQ/NYSE tickers to screen live.
// Finnhub's free tier has no built-in screener, so we scan this list and
// filter/rank using real quote + profile data on every request.
const CANDIDATE_TICKERS = [
  'BMNR', 'SOFI', 'RIVN', 'JOBY', 'NOK', 'POET', 'OCFN', 'HUT', 'MARA', 'CLSK',
  'RIOT', 'CIFR', 'CORE', 'WULF', 'IREN', 'PLUG', 'FCEL', 'CHPT', 'LCID', 'SIRI',
  'NIO', 'ACHR'
];

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// Data-quality control thresholds (see validateQuote below). These exist
// because a stale/incorrect quote is worse than no quote at all.
const MAX_QUOTE_AGE_SECONDS = 5 * 24 * 60 * 60; // 5 days — covers weekends/holidays
const MAX_DP_INCONSISTENCY = 1; // percentage points allowed between reported dp and (c-pc)/pc

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

// Formats a share count expressed in millions (Finnhub's basic-financials
// convention) into a compact human string, e.g. 18.88 -> "18.9M".
function formatVolume(millions) {
  if (typeof millions !== 'number' || millions <= 0) return null;
  if (millions >= 1000) return `${(millions / 1000).toFixed(2)}B`;
  return `${millions.toFixed(1)}M`;
}

function deriveSentiment(score) {
  if (typeof score !== 'number') return 'NEUTRAL';
  if (score > 15) return 'BULLISH';
  if (score < -15) return 'BEARISH';
  return 'NEUTRAL';
}

// Composite sentiment score in [-100, 100], built from three real signals:
// today's price momentum, where price sits in its 52-week band, and whether
// recent (10-day) volume is running hot or cold vs the 3-month average.
// This is a heuristic, not a prediction — labeled as such in the UI.
function computeSentimentScore({ dp, price, week52Low, week52High, avgVol10d, avgVol3m }) {
  const momentum = Math.max(-10, Math.min(10, typeof dp === 'number' ? dp : 0));
  const momentumScore = (momentum / 10) * 50; // -50..50

  let rangeScore = 0;
  if (
    typeof price === 'number' &&
    typeof week52Low === 'number' &&
    typeof week52High === 'number' &&
    week52High > week52Low
  ) {
    const pos = (price - week52Low) / (week52High - week52Low); // 0..1
    rangeScore = (Math.max(0, Math.min(1, pos)) - 0.5) * 60; // -30..30
  }

  let volumeScore = 0;
  if (typeof avgVol10d === 'number' && typeof avgVol3m === 'number' && avgVol3m > 0) {
    const ratio = avgVol10d / avgVol3m;
    volumeScore = Math.max(-10, Math.min(10, (ratio - 1) * 20)); // -10..10
  }

  const raw = momentumScore + rangeScore + volumeScore;
  return Math.round(Math.max(-100, Math.min(100, raw)));
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

// DATA-QUALITY CONTROL: reject a quote outright if it's stale or internally
// inconsistent, rather than silently serving bad numbers (root cause of the
// NOK $4.18 bug: caching served an old snapshot — this control is a second,
// independent guard so a bad/old quote never renders even if caching fails).
function validateQuote(q) {
  if (!q || typeof q.c !== 'number' || q.c <= 0) return false;
  if (typeof q.t === 'number' && q.t > 0) {
    const ageSeconds = Date.now() / 1000 - q.t;
    if (ageSeconds > MAX_QUOTE_AGE_SECONDS) return false;
  }
  if (typeof q.pc === 'number' && q.pc > 0 && typeof q.dp === 'number') {
    const expectedDp = ((q.c - q.pc) / q.pc) * 100;
    if (Math.abs(expectedDp - q.dp) > MAX_DP_INCONSISTENCY) return false;
  }
  return true;
}

async function fetchLiveStocks(apiKey) {
  // Phase 1: real-time quotes for every candidate, filtered through the
  // data-quality control above before anything else touches them.
  const quoteResults = await mapLimit(CANDIDATE_TICKERS, 8, async (ticker) => {
    const q = await fetchJson(`${FINNHUB_BASE}/quote?symbol=${ticker}&token=${apiKey}`);
    if (!validateQuote(q)) {
      console.error(`Rejected stale/inconsistent quote for ${ticker}:`, q);
      return null;
    }
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

  // Phase 3: for the final picks only — real news headline+URL, real 52-week
  // range, and real 10-day/3-month average volume (basic-financials metric).
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

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

    let week52Low = null;
    let week52High = null;
    let avgVol10d = null;
    let avgVol3m = null;
    try {
      const metric = await fetchJson(
        `${FINNHUB_BASE}/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`
      );
      const m = metric?.metric || {};
      if (typeof m['52WeekLow'] === 'number') week52Low = m['52WeekLow'];
      if (typeof m['52WeekHigh'] === 'number') week52High = m['52WeekHigh'];
      if (typeof m['10DayAverageTradingVolume'] === 'number') avgVol10d = m['10DayAverageTradingVolume'];
      if (typeof m['3MonthAverageTradingVolume'] === 'number') avgVol3m = m['3MonthAverageTradingVolume'];
    } catch (err) {
      // Basic-financials unavailable for this ticker — fields stay null, UI hides them
    }

    const rangeText = (typeof quote.l === 'number' && typeof quote.h === 'number')
      ? `$${quote.l.toFixed(2)}–$${quote.h.toFixed(2)}`
      : null;

    const sentimentScore = computeSentimentScore({
      dp: quote.dp,
      price: quote.c,
      week52Low,
      week52High,
      avgVol10d,
      avgVol3m
    });

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
      sentiment: deriveSentiment(sentimentScore),
      sentimentScore,
      marketCap: formatMarketCap(profile.marketCapitalization),
      volume: rangeText || 'n/a',
      dailyVolumeAvg: formatVolume(avgVol10d),
      volume3MonthAvg: formatVolume(avgVol3m),
      week52Low: typeof week52Low === 'number' ? week52Low : null,
      week52High: typeof week52High === 'number' ? week52High : null,
      catalyst: source || null,
      newsUrl: url || null,
      isLive: true,
      fetchedAt
    };
  });

  return finalStocks.filter(Boolean);
}

// Fallback used only when Finnhub is unreachable or no key is configured.
// Clearly marked isLive:false so the UI can show the demo-data disclaimer.
function getFallbackStocks() {
  const sample = [
    { ticker: 'BMNR', exchange: 'NYSE', price: 24.36, change: 6.7, name: 'BitMine Immersion', nameHE: 'BitMine Immersion', why: 'Ethereum treasury $14.9B', whyHE: 'אוצר Ethereum $14.9B', sentiment: 'BULLISH', sentimentScore: 45, marketCap: '$3.2B', volume: 'n/a', dailyVolumeAvg: '8.1M', volume3MonthAvg: '9.4M', week52Low: 3.1, week52High: 27.5 },
    { ticker: 'SOFI', exchange: 'NASDAQ', price: 18.31, change: 32.0, name: 'SoFi Technologies', nameHE: 'SoFi Tech', why: 'Fintech momentum strong', whyHE: 'תנופה fintech חזקה', sentiment: 'BULLISH', sentimentScore: 60, marketCap: '$14.8B', volume: 'n/a', dailyVolumeAvg: '32.5M', volume3MonthAvg: '28.7M', week52Low: 6.0, week52High: 19.5 },
    { ticker: 'RIVN', exchange: 'NASDAQ', price: 16.97, change: -2.1, name: 'Rivian Automotive', nameHE: 'Rivian', why: 'EV sector pullback', whyHE: 'נסיגה EV', sentiment: 'NEUTRAL', sentimentScore: -5, marketCap: '$18.5B', volume: 'n/a', dailyVolumeAvg: '18.2M', volume3MonthAvg: '20.1M', week52Low: 9.5, week52High: 17.8 },
    { ticker: 'JOBY', exchange: 'NYSE', price: 9.42, change: 5.3, name: 'Joby Aviation', nameHE: 'Joby Aviation', why: 'Urban air mobility approved', whyHE: 'ניידות אוויר', sentiment: 'BULLISH', sentimentScore: 38, marketCap: '$2.1B', volume: 'n/a', dailyVolumeAvg: '15.6M', volume3MonthAvg: '17.0M', week52Low: 4.2, week52High: 10.1 },
    { ticker: 'NOK', exchange: 'NYSE', price: 10.35, change: 3.92, name: 'Nokia Oyj', nameHE: 'Nokia', why: 'R&D restructuring', whyHE: 'הערכה מחדש R&D', sentiment: 'NEUTRAL', sentimentScore: 12, marketCap: '$23.4B', volume: 'n/a', dailyVolumeAvg: '15.3M', volume3MonthAvg: '18.9M', week52Low: 3.61, week52High: 15.0 },
    { ticker: 'POET', exchange: 'NASDAQ', price: 8.27, change: 7.9, name: 'POET Technologies', nameHE: 'POET Tech', why: 'AI semiconductor demand', whyHE: 'ביקוש AI semiconductors', sentiment: 'BULLISH', sentimentScore: 42, marketCap: '$625M', volume: 'n/a', dailyVolumeAvg: '9.8M', volume3MonthAvg: '11.2M', week52Low: 1.8, week52High: 9.0 },
    { ticker: 'OCFN', exchange: 'NASDAQ', price: 19.08, change: 4.2, name: 'OceanFirst Financial', nameHE: 'OceanFirst', why: 'Regional bank strength', whyHE: 'כוח בנקים אזוריים', sentiment: 'BULLISH', sentimentScore: 25, marketCap: '$891M', volume: 'n/a', dailyVolumeAvg: '0.6M', volume3MonthAvg: '0.7M', week52Low: 14.2, week52High: 20.1 },
    { ticker: 'HUT', exchange: 'NASDAQ', price: 14.62, change: 12.1, name: 'Hut 8 Corp', nameHE: 'Hut 8 Corp', why: 'Bitcoin mining and HPC capacity growth', whyHE: 'צמיחת כרייה ותשתיות HPC', sentiment: 'BULLISH', sentimentScore: 55, marketCap: '$2.9B', volume: 'n/a', dailyVolumeAvg: '5.2M', volume3MonthAvg: '6.1M', week52Low: 5.9, week52High: 16.8 },
    { ticker: 'MARA', exchange: 'NASDAQ', price: 15.42, change: 8.9, name: 'Marathon Digital', nameHE: 'Marathon Digital', why: 'BTC mining efficiency gains', whyHE: 'יעילות כרייה', sentiment: 'BULLISH', sentimentScore: 48, marketCap: '$2.1B', volume: 'n/a', dailyVolumeAvg: '28.3M', volume3MonthAvg: '31.5M', week52Low: 8.1, week52High: 17.2 },
    { ticker: 'CLSK', exchange: 'NASDAQ', price: 12.55, change: 6.3, name: 'CleanSpark Inc', nameHE: 'CleanSpark', why: 'Renewable mining focus', whyHE: 'כרייה עם סקות חדשות', sentiment: 'BULLISH', sentimentScore: 40, marketCap: '$1.8B', volume: 'n/a', dailyVolumeAvg: '19.7M', volume3MonthAvg: '22.6M', week52Low: 8.0, week52High: 23.6 },
    { ticker: 'RIOT', exchange: 'NASDAQ', price: 11.28, change: 9.4, name: 'Riot Platforms', nameHE: 'Riot', why: 'Bitcoin infrastructure play', whyHE: 'תשתיות Bitcoin', sentiment: 'BULLISH', sentimentScore: 50, marketCap: '$3.5B', volume: 'n/a', dailyVolumeAvg: '25.1M', volume3MonthAvg: '27.9M', week52Low: 6.8, week52High: 21.3 },
    { ticker: 'CIFR', exchange: 'NASDAQ', price: 8.76, change: 5.1, name: 'Cipher Mining', nameHE: 'Cipher Mining', why: 'Mining capacity expansion', whyHE: 'הרחבת כושר כרייה', sentiment: 'BULLISH', sentimentScore: 33, marketCap: '$950M', volume: 'n/a', dailyVolumeAvg: '14.4M', volume3MonthAvg: '16.0M', week52Low: 3.9, week52High: 16.3 },
    { ticker: 'CORE', exchange: 'NASDAQ', price: 6.89, change: 3.7, name: 'Core Scientific', nameHE: 'Core Scientific', why: 'Mining operations growing', whyHE: 'פעולות כרייה גדלות', sentiment: 'NEUTRAL', sentimentScore: 14, marketCap: '$820M', volume: 'n/a', dailyVolumeAvg: '22.8M', volume3MonthAvg: '25.3M', week52Low: 5.5, week52High: 12.1 },
    { ticker: 'WULF', exchange: 'NASDAQ', price: 6.89, change: 4.2, name: 'TeraWulf Inc', nameHE: 'TeraWulf', why: 'Sustainable mining capacity increase', whyHE: 'עלייה בכושר כרייה בר-קיימא', sentiment: 'BULLISH', sentimentScore: 28, marketCap: '$2.1B', volume: 'n/a', dailyVolumeAvg: '17.9M', volume3MonthAvg: '19.5M', week52Low: 3.6, week52High: 16.3 },
    { ticker: 'IREN', exchange: 'NASDAQ', price: 18.45, change: 6.8, name: 'Iris Energy Ltd', nameHE: 'Iris Energy', why: 'AI data center expansion news', whyHE: 'חדשות הרחבת מרכזי נתונים AI', sentiment: 'BULLISH', sentimentScore: 41, marketCap: '$3.4B', volume: 'n/a', dailyVolumeAvg: '12.6M', volume3MonthAvg: '14.1M', week52Low: 5.9, week52High: 42.2 }
  ];
  return sample.map((s) => ({ ...s, isLive: false, whyHE: `${s.whyHE} (דוגמה — לא חי)`, newsUrl: null, catalyst: null, fetchedAt: null }));
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
        // CONTROL: never let a CDN/browser serve a stale snapshot of prices.
        // The earlier bug (NOK shown at $4.18 while real price was $10.35)
        // was caused by an s-maxage/stale-while-revalidate cache serving an
        // old response after redeploy. This endpoint must always be fresh.
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
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
