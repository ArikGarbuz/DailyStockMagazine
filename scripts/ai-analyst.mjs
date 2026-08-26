// AI Analyst — lean, single-call-per-ticker fund-style research brief,
// inspired by TauricResearch/TradingAgents (multi-agent LLM trading
// framework), but deliberately NOT the full framework: that project runs
// 4 analysts + a bull/bear debate + trader + risk team + portfolio manager
// per ticker (8-15+ LLM calls). Running that live for 15 tickers/day would
// be far slower, more expensive, and more failure-prone than this app
// needs. This script instead makes ONE Gemini call per ticker, but asks
// for real fund-analyst-style depth in that single call: a fundamental
// read (using real P/E, EPS, margins, ROE, debt/equity, revenue growth
// pulled from Finnhub), a technical read (price momentum, position in the
// 52-week range, volume trend), a risk assessment, and an explicit
// investment recommendation (BUY/HOLD/AVOID/SELL) with entry zone, target,
// and stop-loss. If the risk/reward doesn't look favorable, the model is
// explicitly told the conclusion must be AVOID or SELL, not a vague HOLD.
//
// Runs once per day via GitHub Actions (see .github/workflows/daily-publish.yml),
// never inside the Vercel request path — so it costs nothing extra per visitor
// and never competes with Finnhub's own rate limit.
//
// NOT PERSONALIZED FINANCIAL ADVICE: this is a general-purpose LLM's read
// of public data, clearly labeled as a research heuristic in the UI. It has
// no knowledge of any individual's portfolio, risk tolerance, or goals.
//
// CONTROL / OBSERVABILITY (requested explicitly): every run appends one line
// to ai-verdicts/log.jsonl with per-ticker success/failure and an error
// reason, plus a run-level summary. Nothing fails silently. A majority-failure
// run also pings the existing Telegram bot so problems surface immediately
// instead of being discovered days later.
//
// TIMEOUT NOTE: every network call (Gemini, site stocks fetch) is wrapped
// with an AbortController timeout. Discovered live: without this, a single
// stalled Gemini request hangs the entire sequential loop indefinitely,
// since GitHub Actions has no default per-step timeout — a 4+ minute hang
// was observed on a re-run vs. a normal ~20s run. Timeouts turn a hang into
// a fast, logged per-ticker failure instead.
//
// SECRET-SAFETY NOTE: the Gemini request URL includes the API key as a query
// parameter (?key=...). Discovered live: an earlier version of this script's
// timeout error included the raw URL, which then got written into
// ai-verdicts/*.json and log.jsonl — GitHub's push protection correctly
// blocked the commit before it went public, but the bug was real. Every
// error message that could reference a request URL now goes through
// sanitizeUrlForLog(), which strips query parameters, so no error text can
// ever contain the API key.
//
// RATE-LIMIT NOTE: discovered live — running this script twice in quick
// succession (e.g. a manual test run soon after another run) hit Gemini's
// free-tier per-minute request limit (HTTP 429) on 3/15 tickers, even
// though calls are already sequential. A fixed delay between calls keeps
// us comfortably under the free-tier RPM ceiling; on 429 specifically we
// also back off and retry once before giving up on that ticker, since a
// single retry after a short wait usually succeeds.

import { writeFile, mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SITE_STOCKS_URL = process.env.SITE_STOCKS_URL || 'https://magazines-jade.vercel.app/api/stocks';
const MODEL = 'gemini-flash-lite-latest'; // cheapest current Gemini tier; always resolves to latest lite version
const OUT_DIR = path.join(process.cwd(), 'ai-verdicts');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GEMINI_TIMEOUT_MS = 35000; // slightly higher than before: the richer prompt/response takes a bit longer
const SITE_FETCH_TIMEOUT_MS = 20000;
const TELEGRAM_TIMEOUT_MS = 10000;
// Live run discovered 700 was too low: 4/6 failures on the first deep-analysis
// run were valid responses truncated mid-JSON by the output cap (13 fields,
// bilingual EN+HE, sometimes verbose fundamentals). Raised with headroom.
const GEMINI_MAX_OUTPUT_TOKENS = 1300;
const GEMINI_MIN_INTERVAL_MS = 4500; // keeps us under free-tier RPM even back-to-back with another run
const GEMINI_429_RETRY_DELAY_MS = 8000; // one extra breather before a single retry on rate-limit

const VALID_RECOMMENDATIONS = ['BUY', 'HOLD', 'AVOID', 'SELL'];
const VALID_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Strips query parameters (and thus any API key) before a URL can ever end
// up in an error message that gets logged or committed.
function sanitizeUrlForLog(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return String(url).split('?')[0];
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const safeUrl = sanitizeUrlForLog(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${safeUrl}`);
    }
    // Never surface err.message raw here either — some runtimes embed the
    // full failing URL (including query string) in network error text.
    throw new Error(`Request failed: ${safeUrl} (${err.name || 'Error'})`);
  } finally {
    clearTimeout(timer);
  }
}

// Builds the fundamentals line from whatever real Finnhub ratios route.js
// was able to pull — never invents a number that wasn't actually provided.
function buildFundamentalsSummary(stock) {
  const parts = [
    stock.peTTM != null ? `P/E (TTM): ${stock.peTTM.toFixed(1)}` : null,
    stock.epsTTM != null ? `EPS (TTM): $${stock.epsTTM.toFixed(2)}` : null,
    stock.revenueGrowthYoY != null ? `Revenue growth (YoY): ${stock.revenueGrowthYoY.toFixed(1)}%` : null,
    stock.grossMarginTTM != null ? `Gross margin (TTM): ${stock.grossMarginTTM.toFixed(1)}%` : null,
    stock.netMarginTTM != null ? `Net margin (TTM): ${stock.netMarginTTM.toFixed(1)}%` : null,
    stock.roeTTM != null ? `ROE (TTM): ${stock.roeTTM.toFixed(1)}%` : null,
    stock.debtToEquity != null ? `Debt/Equity: ${stock.debtToEquity.toFixed(2)}` : null
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'not available from data provider';
}

function buildPrompt(stock) {
  return `You are a research analyst at an investment fund writing a concise but rigorous single-stock brief for internal use — ` +
    `this is general research, NOT personalized financial advice, and the reader knows that. ` +
    `Base your read strictly on the data given below; if a figure is marked "not available", say so rather than inventing a number. ` +
    `Be willing to recommend AVOID or SELL when the risk/reward genuinely looks unfavorable — do not default to HOLD just to be safe. ` +
    `Reply with STRICT JSON only, no markdown fences, no extra commentary, matching exactly this shape:\n` +
    `{"recommendation":"BUY|HOLD|AVOID|SELL","riskLevel":"LOW|MEDIUM|HIGH","entryZone":"short price range or n/a","targetPrice":"short price target or n/a","stopLoss":"short stop-loss price or n/a","fundamental":"1-2 English sentences","fundamentalHE":"Hebrew, same meaning","technical":"1-2 English sentences","technicalHE":"Hebrew, same meaning","risk":"1-2 English sentences","riskHE":"Hebrew, same meaning","rationale":"one English sentence, overall conclusion","rationaleHE":"Hebrew, same meaning"}\n\n` +
    `Ticker: ${stock.ticker} (${stock.exchange})\n` +
    `Price: $${stock.price} (${stock.change >= 0 ? '+' : ''}${Number(stock.change).toFixed(2)}% today)\n` +
    `Market cap: ${stock.marketCap || 'n/a'}\n` +
    `52-week range: ${stock.week52Low != null ? '$' + stock.week52Low.toFixed(2) : 'n/a'}-${stock.week52High != null ? '$' + stock.week52High.toFixed(2) : 'n/a'}\n` +
    `Volume trend: 10-day avg ${stock.dailyVolumeAvg || 'n/a'} vs 3-month avg ${stock.volume3MonthAvg || 'n/a'} shares\n` +
    `Fundamentals: ${buildFundamentalsSummary(stock)}\n` +
    `Recent headline: ${stock.why || 'none available'}`;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GOOGLE_API_KEY}`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS }
    })
  }, GEMINI_TIMEOUT_MS);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    // errText is Gemini's own response body, never the request URL — safe to include.
    const err = new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`);
    err.isRateLimit = res.status === 429;
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text content');
  const tokens = data?.usageMetadata?.totalTokenCount ?? null;

  let parsed;
  try {
    // Defensive: strip accidental markdown fences if the model adds them anyway
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Gemini response was not valid JSON: ${text.slice(0, 200)}`);
  }
  if (!VALID_RECOMMENDATIONS.includes(parsed.recommendation)) {
    throw new Error(`Gemini returned unexpected recommendation: ${JSON.stringify(parsed).slice(0, 200)}`);
  }
  if (!VALID_RISK_LEVELS.includes(parsed.riskLevel)) {
    throw new Error(`Gemini returned unexpected riskLevel: ${JSON.stringify(parsed).slice(0, 200)}`);
  }
  return { ...parsed, tokens };
}

// One retry, only for 429s, after an extra breather beyond the normal
// per-call spacing — a single retry after backing off usually clears a
// transient per-minute quota bump instead of burning the whole ticker.
async function callGeminiWithRetry(prompt) {
  try {
    return await callGemini(prompt);
  } catch (err) {
    if (err.isRateLimit) {
      await sleep(GEMINI_429_RETRY_DELAY_MS);
      return await callGemini(prompt);
    }
    throw err;
  }
}

async function notifyTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetchWithTimeout(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
    }, TELEGRAM_TIMEOUT_MS);
  } catch (err) {
    console.error('Telegram notification failed (non-fatal):', err.message);
  }
}

async function main() {
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY not set — skipping AI analyst run.');
    process.exit(0); // soft-exit: never break the daily publish pipeline over this
  }

  await mkdir(OUT_DIR, { recursive: true });

  const date = todayISO();
  const runStarted = new Date().toISOString();

  let stocks = [];
  try {
    const res = await fetchWithTimeout(SITE_STOCKS_URL, { cache: 'no-store' }, SITE_FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`Site stocks fetch failed: HTTP ${res.status}`);
    const data = await res.json();
    stocks = Array.isArray(data.stocks) ? data.stocks : [];
  } catch (err) {
    console.error('Could not load today\'s stock list:', err.message);
    await appendFile(
      path.join(OUT_DIR, 'log.jsonl'),
      JSON.stringify({ date, runStarted, error: 'stock-list-fetch-failed', message: err.message }) + '\n'
    );
    await notifyTelegram(`⚠️ AI Analyst: couldn't load today's stock list (${err.message}). Skipped run.`);
    process.exit(0);
  }

  const results = [];
  const failures = [];
  let totalTokens = 0;

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    try {
      const verdict = await callGeminiWithRetry(buildPrompt(stock));
      results.push({
        ticker: stock.ticker,
        status: 'ok',
        recommendation: verdict.recommendation,
        riskLevel: verdict.riskLevel,
        entryZone: verdict.entryZone,
        targetPrice: verdict.targetPrice,
        stopLoss: verdict.stopLoss,
        fundamental: verdict.fundamental,
        fundamentalHE: verdict.fundamentalHE,
        technical: verdict.technical,
        technicalHE: verdict.technicalHE,
        risk: verdict.risk,
        riskHE: verdict.riskHE,
        rationale: verdict.rationale,
        rationaleHE: verdict.rationaleHE,
        tokens: verdict.tokens
      });
      if (verdict.tokens) totalTokens += verdict.tokens;
    } catch (err) {
      console.error(`AI analysis failed for ${stock.ticker}:`, err.message);
      failures.push({ ticker: stock.ticker, error: err.message });
      results.push({ ticker: stock.ticker, status: 'error', error: err.message });
    }

    // Space out requests to stay under Gemini's free-tier per-minute limit —
    // skip the wait after the last ticker.
    if (i < stocks.length - 1) {
      await sleep(GEMINI_MIN_INTERVAL_MS);
    }
  }

  const output = {
    date,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    tickersAttempted: stocks.length,
    succeeded: results.filter((r) => r.status === 'ok').length,
    failed: failures.length,
    totalTokens,
    results
  };

  await writeFile(path.join(OUT_DIR, 'latest.json'), JSON.stringify(output, null, 2));
  await writeFile(path.join(OUT_DIR, `${date}.json`), JSON.stringify(output, null, 2));

  // CONTROL LOG — append-only, one line per run, never overwritten.
  // This is the record to check first if something looks wrong later.
  await appendFile(
    path.join(OUT_DIR, 'log.jsonl'),
    JSON.stringify({
      date,
      runStarted,
      finishedAt: output.generatedAt,
      model: MODEL,
      attempted: output.tickersAttempted,
      succeeded: output.succeeded,
      failed: output.failed,
      failedTickers: failures.map((f) => ({ ticker: f.ticker, error: f.error })),
      totalTokens
    }) + '\n'
  );

  console.log(`AI Analyst run complete: ${output.succeeded}/${output.tickersAttempted} succeeded, ${totalTokens} tokens.`);

  // Only alert on a majority failure — a single flaky ticker is routine and
  // shouldn't cause alert fatigue; the log.jsonl still records it either way.
  if (stocks.length > 0 && failures.length > stocks.length / 2) {
    await notifyTelegram(
      `⚠️ AI Analyst: ${failures.length}/${stocks.length} tickers failed today. ` +
      `First error: ${failures[0].ticker} — ${failures[0].error}`
    );
  }
}

main().catch(async (err) => {
  console.error('AI Analyst run crashed:', err);
  try {
    await appendFile(
      path.join(OUT_DIR, 'log.jsonl'),
      JSON.stringify({ date: todayISO(), error: 'crash', message: err.message }) + '\n'
    );
  } catch {}
  await notifyTelegram(`🔴 AI Analyst crashed: ${err.message}`);
  process.exit(0); // still soft-exit — never take down the daily publish workflow
});
