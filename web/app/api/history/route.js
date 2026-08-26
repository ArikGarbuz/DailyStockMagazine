// History API — deliberately thin, same pattern as /api/sp500. Reads
// pre-archived daily snapshots from Vercel KV (written once/day by
// scripts/archive-to-kv.mjs in GitHub Actions). This route never
// recomputes, re-fetches, or touches the existing stock-retrieval or
// calculation logic in /api/stocks or /api/sp500 — it only reads what was
// already archived.
import { getHistory, getLastUpdated } from '@/lib/kv';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get('limit'));
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 500)
      : 200;

    const [records, lastUpdated] = await Promise.all([
      getHistory(limit),
      getLastUpdated()
    ]);

    return Response.json(
      { lastUpdated, count: records.length, records },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0, must-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching stock history from KV:', error);
    return Response.json(
      { lastUpdated: null, count: 0, records: [], error: error.message },
      { status: 200 }
    );
  }
}
