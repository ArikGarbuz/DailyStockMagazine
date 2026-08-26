// Cloud archive writer — appends today's stock snapshots to Vercel KV
// (Upstash Redis) so the "Cloud Archive" table and "Last Updated" badge on
// the site have real historical data to show. Runs once per day in GitHub
// Actions, after the AI analyst step so ai-verdicts/latest.json already
// exists.
//
// NON-INTRUSIVE BY DESIGN, per explicit instruction: this script only
// READS ai-verdicts/latest.json (an existing output artifact) and makes
// its own minimal Finnhub /quote calls for price/change — the same
// self-contained pattern already used by scripts/ai-analyst.mjs and
// scripts/sp500-picks.mjs. It does not import, call, or modify
// generate-magazine.py, ai-analyst.mjs, sp500-picks.mjs, or
// web/app/api/stocks/route.js — none of the existing stock-retrieval or
// calculation logic is touched. Writes are additive-only (LPUSH), so
// historical runs are never overwritten, and the whole run soft-exits on
// any failure — never blocks the daily publish pipeline.
//
// STORAGE: talks to Upstash's REST API directly via plain fetch (the same
// HTTP API @vercel/kv wraps under the hood), so this script needs zero new
// npm dependencies — consistent with every other scripts/*.mjs file here.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Defensive: strip accidental surrounding quotes if a secret was pasted
// verbatim from a .env file line like KV_REST_API_URL="https://...".
function stripQuotes(v) {
  return typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '') : v;
}

const FINNHUB_API_KEY = stripQuotes(process.env.FINNHUB_API_KEY);
const KV_REST_API_URL = stripQuotes(process.env.KV_REST_API_URL);
const KV_REST_API_TOKEN = stripQuotes(process.env.KV_REST_API_TOKEN);

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FINNHUB_TIMEOUT_MS = 20000;
const KV_TIMEOUT_MS = 15000;
const PER_TICKER_PAUSE_MS = 250; // light pacing, same as sp500-picks.mjs

const HISTORY_KEY = 'stock-history';
const LAST_UPDATED_KEY = 'stock-history:last-updated';
const MAX_HISTORY_LENGTH = 5000; // keeps the list from growing unbounded

const VERDICTS_FILE = path.join(process.cwd(), 'ai-verdicts', 'latest.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Request failed: ${err.name || 'Error'}`);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFinnhubQuote(ticker) {
  try {
    const res = await fetchWithTimeout(
      `${FINNHUB_BASE}/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`,
      {},
      FINNHUB_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const q = await res.json();
    if (typeof q?.c !== 'number' || q.c <= 0) return null;
    return { price: q.c, change: typeof q.dp === 'number' ? q.dp : null };
  } catch {
    return null; // price is supplementary — a quote miss doesn't block archiving
  }
}

// Minimal wrapper around Upstash's HTTP command API: POST a JSON array
// like ["LPUSH", "key", "value"] to the REST URL with a bearer token.
async function kvCommand(command) {
  const res = await fetchWithTimeout(
    KV_REST_API_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    },
    KV_TIMEOUT_MS
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`KV command failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  if (!FINNHUB_API_KEY || !KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error(
      'Missing FINNHUB_API_KEY, KV_REST_API_URL, or KV_REST_API_TOKEN — skipping KV archive run.'
    );
    process.exit(0); // soft-exit: never break the daily publish pipeline over this
  }

  let verdicts;
  try {
    const raw = JSON.parse(await readFile(VERDICTS_FILE, 'utf-8'));
    verdicts = Array.isArray(raw.results) ? raw.results : [];
  } catch (err) {
    console.error('Could not read ai-verdicts/latest.json — skipping KV archive run:', err.message);
    process.exit(0);
  }

  if (verdicts.length === 0) {
    console.error('No verdicts to archive — skipping KV archive run.');
    process.exit(0);
  }

  const timestamp = new Date().toISOString();
  const date = todayISO();
  let archived = 0;
  let skipped = 0;

  for (const v of verdicts) {
    if (v.status !== 'ok' || !v.ticker) {
      skipped++;
      continue;
    }

    const quote = await fetchFinnhubQuote(v.ticker);

    const payload = {
      id: `${v.ticker}-${date}-${Date.now()}`,
      timestamp,
      ticker: v.ticker,
      price: quote?.price ?? null,
      metrics: {
        change: quote?.change ?? null,
        aiRecommendation: v.recommendation || null,
        aiRiskLevel: v.riskLevel || null
      },
      summary: v.rationale || null
    };

    try {
      await kvCommand(['LPUSH', HISTORY_KEY, JSON.stringify(payload)]);
      archived++;
      console.log(`Archived ${v.ticker} to KV (${archived} so far).`);
    } catch (err) {
      console.error(`Failed to archive ${v.ticker} to KV:`, err.message);
      skipped++;
    }

    await sleep(PER_TICKER_PAUSE_MS);
  }

  try {
    await kvCommand(['LTRIM', HISTORY_KEY, 0, MAX_HISTORY_LENGTH - 1]);
    await kvCommand(['SET', LAST_UPDATED_KEY, timestamp]);
  } catch (err) {
    console.error('Failed to finalize KV archive run (LTRIM/SET last-updated):', err.message);
  }

  console.log(`KV archive run complete: ${archived} archived, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error('KV archive run crashed (non-fatal):', err.message);
  process.exit(0); // still soft-exit — never take down the daily publish workflow
});
