// Thin wrapper around @vercel/kv, isolated in its own file so nothing
// else in the app needs to import '@vercel/kv' directly. This is a purely
// additive module for the Cloud Archive / Last Updated feature — nothing
// in the existing stock-retrieval or calculation code (route.js for
// /api/stocks, /api/sp500) imports or depends on this file.
import { kv } from '@vercel/kv';

export const HISTORY_KEY = 'stock-history';
export const LAST_UPDATED_KEY = 'stock-history:last-updated';

// Fetches the most recent `limit` archived snapshots. Entries are appended
// with LPUSH by scripts/archive-to-kv.mjs, so index 0 is always the newest
// — no extra sort needed here.
export async function getHistory(limit = 200) {
  const raw = await kv.lrange(HISTORY_KEY, 0, Math.max(limit - 1, 0));
  if (!raw) return [];
  return raw.map((entry) => {
    if (typeof entry === 'string') {
      try {
        return JSON.parse(entry);
      } catch {
        return null;
      }
    }
    return entry;
  }).filter(Boolean);
}

// The single "last archive write" timestamp, set alongside every LPUSH by
// the archive script. This is what the "Last Updated" badge reads.
export async function getLastUpdated() {
  const value = await kv.get(LAST_UPDATED_KEY);
  return value || null;
}
