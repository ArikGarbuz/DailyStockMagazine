// S&P 500 Daily Spotlight — a rotating, in-depth profile of S&P 500
// constituents, run once per day via GitHub Actions (never inside the
// Vercel request path, same reasoning as ai-analyst.mjs).
//
// SCOPE, per explicit user requirement: every featured ticker MUST have all
// three of: (1) a real business-description explaining what the company
// does, (2) a real employee-count figure, (3) a link to the company's
// official website. If ANY of these three cannot be obtained from a real
// source, that ticker is skipped entirely and a different S&P 500 company
// is tried in its place — never a placeholder, never an invented figure.
//
// DATA SOURCES (all real, no LLM-generated facts, so "unavailable" can be
// detected honestly instead of papered over with a hallucination):
//   - Official website + industry + market cap: Finnhub /stock/profile2
//     (weburl is the gating field for "official website").
//   - Business description: English Wikipedia's REST summary API, resolved
//     via Wikipedia's own search API so name variants like "Fox Corporation
//     (Class A)" still match the right page. A disambiguation-page result
//     or a too-short extract is treated as unavailable.
//   - Employee count: Wikidata property P1128 ("employees"), reached via
//     Wikipedia's pageprops -> Wikidata QID -> entity claims. This is
//     genuinely sourced (Wikidata), not an LLM guess.
//   - Hebrew description: best-effort via Wikipedia language links to the
//     Hebrew article, if one exists. Non-gating — English-only is fine if
//     no Hebrew article exists, since English Wikipedia is the primary
//     source of truth here.
//
// COST/SCOPE NOTE: ranking all 503 constituents by today's price move (like
// the small-cap "Top Movers" section does) would require ~503 extra Finnhub
// quote calls just to rank candidates, which is slow and wasn't actually
// requested here. Instead this uses a deterministic, non-overlapping daily
// rotation through the full S&P 500 list, so the whole index gets covered
// every ~WINDOW_SIZE-day cycle, at a fraction of the API cost.
//
// CONTROL / OBSERVABILITY (same pattern as ai-analyst.mjs, requested
// explicitly by the user for this project): every run appends one line to
// sp500-picks/log.jsonl with how many tickers were picked vs skipped and
// why, so a systematic data-source problem is visible immediately instead
// of silently degrading the picks list.

import { writeFile, mkdir, appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const WIKI_UA = 'DailyStockMagazine/1.0 (+https://magazines-jade.vercel.app)';

const OUT_DIR = path.join(process.cwd(), 'sp500-picks');
const TICKERS_FILE = path.join(process.cwd(), 'data', 'sp500-tickers.json');

const N_PICKS = 15; // how many fully-qualified companies to publish today
const WINDOW_SIZE = 40; // candidates tried per run (buffer for skip-and-replace)
const FINNHUB_TIMEOUT_MS = 20000;
const WIKI_TIMEOUT_MS = 15000;
const TELEGRAM_TIMEOUT_MS = 10000;
const PER_CANDIDATE_PAUSE_MS = 250; // light pacing; well under all providers' limits at this volume

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeUrlForLog(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return String(url).split('?')[0];
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const safeUrl = sanitizeUrlForLog(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${safeUrl}`);
    }
    throw new Error(`Request failed: ${safeUrl} (${err.name || 'Error'})`);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options = {}, timeoutMs = FINNHUB_TIMEOUT_MS) {
  const res = await fetchWithTimeout(url, options, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${sanitizeUrlForLog(url)}`);
  return res.json();
}

function formatMarketCap(millions) {
  if (typeof millions !== 'number' || millions <= 0) return null;
  if (millions >= 1_000_000) return `$${(millions / 1_000_000).toFixed(2)}T`;
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${millions.toFixed(0)}M`;
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

// The S&P 500 has exactly two dotted-class tickers in the source table
// (BRK.B, BF.B), stored here as BRK-B/BF-B. Finnhub's own notation for
// these varies by data vintage, so try the stored form first and the
// dotted form as a fallback rather than guessing once and failing silently.
function finnhubSymbolVariants(ticker) {
  if (ticker.includes('-')) return [ticker, ticker.replace('-', '.')];
  return [ticker];
}

async function fetchFinnhubQuote(ticker) {
  let lastErr;
  for (const sym of finnhubSymbolVariants(ticker)) {
    try {
      const q = await fetchJson(`${FINNHUB_BASE}/quote?symbol=${sym}&token=${FINNHUB_API_KEY}`);
      if (typeof q?.c === 'number' && q.c > 0) return q;
      lastErr = new Error('empty/invalid quote');
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('quote fetch failed');
}

async function fetchFinnhubProfile(ticker) {
  let lastErr;
  for (const sym of finnhubSymbolVariants(ticker)) {
    try {
      const p = await fetchJson(`${FINNHUB_BASE}/stock/profile2?symbol=${sym}&token=${FINNHUB_API_KEY}`);
      if (p && (p.weburl || p.name)) return p;
      lastErr = new Error('empty profile response');
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('profile fetch failed');
}

// Strips trailing share-class / holding-company qualifiers so search
// matches the actual Wikipedia article, e.g. "Fox Corporation (Class A)"
// -> "Fox Corporation", "Campbell's Company (The)" -> "Campbell's Company".
function cleanNameForSearch(name) {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

async function searchWikipediaTitle(name) {
  const q = cleanNameForSearch(name);
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=1`;
  const data = await fetchJson(url, { headers: { 'User-Agent': WIKI_UA } }, WIKI_TIMEOUT_MS);
  const hit = data?.query?.search?.[0];
  if (!hit?.title) throw new Error('no Wikipedia search match');
  return hit.title;
}

async function fetchWikipediaSummary(title, lang = 'en') {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': WIKI_UA } }, WIKI_TIMEOUT_MS);
  if (!res.ok) throw new Error(`Wikipedia summary HTTP ${res.status}`);
  const data = await res.json();
  if (data.type === 'disambiguation') throw new Error('resolved to a disambiguation page');
  if (!data.extract || data.extract.length < 40) throw new Error('summary missing or too short');
  return { extract: data.extract, resolvedTitle: data.title, pageUrl: data.content_urls?.desktop?.page || null };
}

// Best-effort Hebrew description via Wikipedia's cross-language links.
// Non-gating: if no Hebrew article exists, the ticker still qualifies on
// its English description alone.
async function fetchHebrewSummary(enTitle) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&titles=${encodeURIComponent(enTitle)}&lllang=he&format=json`;
    const data = await fetchJson(url, { headers: { 'User-Agent': WIKI_UA } }, WIKI_TIMEOUT_MS);
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0];
    const heTitle = page?.langlinks?.[0]?.['*'];
    if (!heTitle) return null;
    const summary = await fetchWikipediaSummary(heTitle, 'he');
    return summary.extract;
  } catch (err) {
    return null; // non-fatal, purely a nice-to-have
  }
}

async function fetchWikidataEmployees(enTitle) {
  const propsUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(enTitle)}&format=json`;
  const propsData = await fetchJson(propsUrl, { headers: { 'User-Agent': WIKI_UA } }, WIKI_TIMEOUT_MS);
  const pages = propsData?.query?.pages || {};
  const page = Object.values(pages)[0];
  const qid = page?.pageprops?.wikibase_item;
  if (!qid) throw new Error('no Wikidata item linked to this article');

  const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const entityData = await fetchJson(entityUrl, { headers: { 'User-Agent': WIKI_UA } }, WIKI_TIMEOUT_MS);
  const claims = entityData?.entities?.[qid]?.claims?.P1128;
  if (!claims || claims.length === 0) throw new Error('no employee count (P1128) on Wikidata');

  const candidates = claims
    .map((c) => ({
      amount: c?.mainsnak?.datavalue?.value?.amount,
      time: c?.qualifiers?.P585?.[0]?.datavalue?.value?.time || '',
      preferred: c?.rank === 'preferred'
    }))
    .filter((c) => c.amount != null);
  if (candidates.length === 0) throw new Error('employee claim had no numeric amount');

  candidates.sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    return b.time.localeCompare(a.time);
  });

  const employees = Math.round(Math.abs(parseFloat(candidates[0].amount)));
  if (!employees || employees <= 0) throw new Error('invalid employee count value');
  return employees;
}

// Attempts to fully qualify one candidate. Returns either a complete pick
// or a { skipped: true, reason } record — never a partial/placeholder pick.
async function tryEnrichCandidate(entry) {
  const { ticker, name } = entry;

  let profile;
  try {
    profile = await fetchFinnhubProfile(ticker);
  } catch (err) {
    return { ticker, name, skipped: true, reason: `profile lookup failed: ${err.message}` };
  }
  if (!profile.weburl) {
    return { ticker, name, skipped: true, reason: 'no official website (Finnhub weburl empty)' };
  }

  let resolvedTitle;
  let summary;
  try {
    resolvedTitle = await searchWikipediaTitle(name);
    summary = await fetchWikipediaSummary(resolvedTitle);
  } catch (err) {
    return { ticker, name, skipped: true, reason: `business description unavailable: ${err.message}` };
  }

  let employees;
  try {
    employees = await fetchWikidataEmployees(summary.resolvedTitle);
  } catch (err) {
    return { ticker, name, skipped: true, reason: `employee count unavailable: ${err.message}` };
  }

  const descriptionHE = await fetchHebrewSummary(summary.resolvedTitle);

  let quote = null;
  try {
    quote = await fetchFinnhubQuote(ticker);
  } catch (err) {
    // Price is a supplementary display field, not one of the three
    // mandatory fields — a quote miss doesn't disqualify the ticker.
  }

  return {
    ticker,
    name,
    skipped: false,
    website: profile.weburl,
    industry: profile.finnhubIndustry || null,
    marketCap: formatMarketCap(profile.marketCapitalization),
    description: summary.extract,
    descriptionHE,
    wikipediaUrl: summary.pageUrl,
    employees,
    price: typeof quote?.c === 'number' ? quote.c : null,
    change: typeof quote?.dp === 'number' ? quote.dp : null
  };
}

async function main() {
  if (!FINNHUB_API_KEY) {
    console.error('FINNHUB_API_KEY not set — skipping S&P 500 picks run.');
    process.exit(0); // soft-exit: never break the daily publish pipeline over this
  }

  await mkdir(OUT_DIR, { recursive: true });

  let tickers;
  try {
    tickers = JSON.parse(await readFile(TICKERS_FILE, 'utf-8'));
    if (!Array.isArray(tickers) || tickers.length === 0) throw new Error('empty ticker list');
  } catch (err) {
    console.error('Could not load data/sp500-tickers.json:', err.message);
    process.exit(0);
  }

  const date = todayISO();
  const runStarted = new Date().toISOString();

  // Deterministic, non-overlapping daily rotation: a fresh WINDOW_SIZE slice
  // of the full list each day, cycling back to the start once the whole
  // index has been covered (~every ceil(503/40) ≈ 13 days).
  const totalWindows = Math.ceil(tickers.length / WINDOW_SIZE);
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const cyclePos = daysSinceEpoch % totalWindows;
  const startIdx = cyclePos * WINDOW_SIZE;
  const window = [];
  for (let i = 0; i < WINDOW_SIZE; i++) {
    window.push(tickers[(startIdx + i) % tickers.length]);
  }

  const picks = [];
  const skipped = [];
  for (const entry of window) {
    if (picks.length >= N_PICKS) break;
    const result = await tryEnrichCandidate(entry);
    if (result.skipped) {
      skipped.push({ ticker: result.ticker, reason: result.reason });
      console.log(`Skipped ${result.ticker}: ${result.reason}`);
    } else {
      picks.push(result);
      console.log(`Picked ${result.ticker} (${picks.length}/${N_PICKS})`);
    }
    await sleep(PER_CANDIDATE_PAUSE_MS);
  }

  const output = {
    date,
    generatedAt: new Date().toISOString(),
    windowStart: startIdx,
    windowSize: WINDOW_SIZE,
    cyclePosition: cyclePos,
    totalWindows,
    requested: N_PICKS,
    picked: picks.length,
    skippedCount: skipped.length,
    skipped,
    picks
  };

  await writeFile(path.join(OUT_DIR, 'latest.json'), JSON.stringify(output, null, 2));
  await writeFile(path.join(OUT_DIR, `${date}.json`), JSON.stringify(output, null, 2));

  await appendFile(
    path.join(OUT_DIR, 'log.jsonl'),
    JSON.stringify({
      date,
      runStarted,
      finishedAt: output.generatedAt,
      windowStart: startIdx,
      windowSize: WINDOW_SIZE,
      cyclePosition: cyclePos,
      requested: N_PICKS,
      picked: picks.length,
      skippedCount: skipped.length,
      skippedTickers: skipped.map((s) => ({ ticker: s.ticker, reason: s.reason }))
    }) + '\n'
  );

  console.log(`S&P 500 picks run complete: ${picks.length}/${N_PICKS} picked from a window of ${WINDOW_SIZE} (${skipped.length} skipped).`);

  // Only alert when the shortfall is severe enough that the published list
  // would look thin — a handful of skips per run is routine and expected.
  if (picks.length < N_PICKS / 2) {
    await notifyTelegram(
      `⚠️ S&P 500 picks: only ${picks.length}/${N_PICKS} tickers had complete data today ` +
      `(window ${WINDOW_SIZE}). First skip: ${skipped[0]?.ticker} — ${skipped[0]?.reason}`
    );
  }
}

main().catch(async (err) => {
  console.error('S&P 500 picks run crashed:', err);
  try {
    await appendFile(
      path.join(OUT_DIR, 'log.jsonl'),
      JSON.stringify({ date: todayISO(), error: 'crash', message: err.message }) + '\n'
    );
  } catch {}
  await notifyTelegram(`🔴 S&P 500 picks crashed: ${err.message}`);
  process.exit(0); // still soft-exit — never take down the daily publish workflow
});
