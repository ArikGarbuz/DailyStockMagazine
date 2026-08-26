'use client';

import { useEffect, useState } from 'react';
import StockCard from '@/components/StockCard';
import SP500Card from '@/components/SP500Card';
import Header from '@/components/Header';
import MarketPulse from '@/components/MarketPulse';
import LastUpdatedBadge from '@/components/LastUpdatedBadge';
import ArchiveTable from '@/components/ArchiveTable';

export default function Home() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date());

  const [sp500, setSp500] = useState([]);
  const [sp500Loading, setSp500Loading] = useState(true);
  const [sp500Error, setSp500Error] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stocks', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch stocks');

        const data = await response.json();
        setStocks(data.stocks || []);
        if (data.date) setDate(new Date(data.date));
      } catch (err) {
        setError(err.message);
        console.error('Error fetching stocks:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchSp500 = async () => {
      try {
        setSp500Loading(true);
        const response = await fetch('/api/sp500', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch S&P 500 picks');

        const data = await response.json();
        setSp500(data.picks || []);
      } catch (err) {
        setSp500Error(err.message);
        console.error('Error fetching S&P 500 picks:', err);
      } finally {
        setSp500Loading(false);
      }
    };

    fetchData();
    fetchSp500();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Header date={date} />

        {/* Last Updated badge — reads the Cloud Archive's last write
            timestamp from Vercel KV. Purely additive: does not read from
            or affect the /api/stocks or /api/sp500 data paths above. */}
        <div className="flex justify-end mb-4">
          <LastUpdatedBadge />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading market data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200">
            <p>Error: {error}</p>
          </div>
        ) : (
          <>
            <MarketPulse date={date} />

            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-emerald-400">
                  🔥 Top Movers
                </h2>
                <p className="text-sm text-gray-400">
                  {stocks.length} stocks | Under $30 | Market Cap &gt; $500M
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {stocks.map((stock, index) => (
                  <StockCard key={index} stock={stock} />
                ))}
              </div>
            </div>

            {stocks.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>No stocks available yet. Check back tomorrow!</p>
              </div>
            )}
          </>
        )}

        {/* S&P 500 Daily Spotlight — a rotating, in-depth profile of S&P 500
            constituents, refreshed once/day via GitHub Actions. Every card
            shown here has a real business description (Wikipedia), a real
            employee count (Wikidata), and a link to the company's official
            website (Finnhub) — a ticker missing any of the three is skipped
            and replaced automatically, never shown with placeholder data. */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-blue-400">
              🏛️ S&P 500 Daily Spotlight
            </h2>
            {!sp500Loading && !sp500Error && (
              <p className="text-sm text-gray-400">
                {sp500.length} companies | Rotating daily coverage of the full index
              </p>
            )}
          </div>

          {sp500Loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading S&P 500 profiles...</p>
            </div>
          ) : sp500Error ? (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200">
              <p>Error: {sp500Error}</p>
            </div>
          ) : sp500.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No S&P 500 profiles available yet. Check back tomorrow!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sp500.map((company) => (
                <SP500Card key={company.ticker} company={company} />
              ))}
            </div>
          )}
        </div>

        {/* Cloud Archive — historical daily snapshots read from Vercel KV.
            Purely additive; independent of the two sections above. */}
        <ArchiveTable />

        <footer className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-gray-500">
          <p>Generated at 4:20 PM IST • Data: WebSearch + Market Aggregators</p>
          <p className="mt-2">For informational purposes only • Not financial advice</p>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} Daily Stock Magazine</p>
        </footer>
      </div>
    </main>
  );
}
