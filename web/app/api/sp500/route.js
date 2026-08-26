// S&P 500 Daily Spotlight API — deliberately thin. All the expensive work
// (ranking, Finnhub profile lookups, Wikipedia/Wikidata enrichment, and the
// skip-and-replace logic that guarantees every published ticker has a real
// business description, employee count, and official website) happens once
// a day in scripts/sp500-picks.mjs via GitHub Actions, never in this
// request path. This route just serves the pre-computed result, same
// low-cost pattern as the AI Analyst verdicts fetch in /api/stocks.
const SP500_PICKS_URL = 'https://raw.githubusercontent.com/ArikGarbuz/DailyStockMagazine/main/sp500-picks/latest.json';
const REVALIDATE_SECONDS = 3600; // this file only changes once/day in practice

export async function GET() {
  try {
    const res = await fetch(SP500_PICKS_URL, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) {
      return Response.json(
        { date: null, picks: [], error: `Upstream fetch failed: HTTP ${res.status}` },
        { status: 200 }
      );
    }
    const data = await res.json();
    return Response.json(
      {
        date: data.date || null,
        generatedAt: data.generatedAt || null,
        requested: data.requested ?? null,
        picked: data.picked ?? (Array.isArray(data.picks) ? data.picks.length : 0),
        picks: Array.isArray(data.picks) ? data.picks : []
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0, must-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching S&P 500 picks:', error);
    return Response.json({ date: null, picks: [], error: error.message }, { status: 200 });
  }
}
