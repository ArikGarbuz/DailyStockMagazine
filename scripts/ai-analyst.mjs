// AI Analyst — lean, single-call-per-ticker sentiment layer inspired by
// TauricResearch/TradingAgents (multi-agent LLM trading framework), but
// deliberately NOT the full framework: that project runs 4 analysts + a
// bull/bear debate + trader + risk team + portfolio manager per ticker
// (8-15+ LLM calls). Running that live, per pageview, for 15 tickers/day
// would be slow and needlessly expensive. This script instead makes ONE
// Gemini call per ticker, using the same real Finnhub-derived numbers the
// site already shows (price, % change, 52-week range, volume trend, news
// headline), and asks for a single structured bull/bear-style verdict.
//
// Runs once per day via GitHub Actions (see .github/workflows/daily-publish.yml),
// never inside the Vercel request path — so it costs nothing extra per visitor
// and never competes with Finnhub's own rate limit.
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

import { writeFile, mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SITE_STOCKS_URL = process.env.SITE_STOCKS_URL || 'https://magazines-jade.vercel.app/api/stocks';
const MODEL = 'gemini-flash-lite-latest'; // cheapest current Gemini tier; always resolves to latest lite version
const OUT_DIR = path.join(process.cwd(), 'ai-verdicts');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GEMINI_TIMEOUT_MS = 25000;
const SITE_FETCH_TIMEOUT_MS = 20000;
const TELEGRAM_TIMEOUT_MS = 10000;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function buildPrompt(stock) {
  return `You are one analyst giving a single, concise research take on a stock — not financial advice. ` +
    `Reply with STRICT JSON only, no markdown fences, no extra text: ` +
    `{"verdict":"BULLISH|BEARISH|NEUTRAL","rationale":"one short English sentence","rationaleHE":"one short Hebrew sentence, same meaning"}\n\n` +
    `Ticker: ${stock.ticker} (${stock.exchange})\n` +
    `Price: $${stock.price} (${stock.change >= 0 ? '+' : ''}${Number(stock.change).toFixed(2)}% today)\n` +
    `Market cap: ${stock.marketCap || 'n/a'}\n` +
    `52-week range: ${stock.week52Low != null ? '$' + stock.week52Low.toFixed(2) : 'n/a'}-${stock.week52High != null ? '$' + stock.week52High.toFixed(2) : 'n/a'}\n` +
    `Volume trend: 10-day avg ${stock.dailyVolumeAvg || 'n/a'} vs 3-month avg ${stock.volume3MonthAvg || 'n/a'} shares\n` +
    `Recent headline: ${stock.why || 'none available'}`;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GOOGLE_API_KEY}`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
    })
  }, GEMINI_TIMEOUT_MS);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`);
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
  if (!['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.verdict)) {
    throw new Error(`Gemini returned unexpected verdict: ${JSON.stringify(parsed).slice(0, 200)}`);
  }
  return { ...parsed, tokens };
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

  for (const stock of stocks) {
    try {
      const verdict = await callGemini(buildPrompt(stock));
      results.push({
        ticker: stock.ticker,
        status: 'ok',
        verdict: verdict.verdict,
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
