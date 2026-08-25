"use client';

import { useEffect, useState } from 'react';
import StockCard from '@/components/StockCard';
import Header from '@/components/Header';
import MarketPulse from '@/components/MarketPulse';

export default function Home() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date());

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

    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Header date={date} />

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

        <footer className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-gray-500">
          <p>Generated at 4:20 PM IST • Data: WebSearch + Market Aggregators</p>
          <p className="mt-2">For informational purposes only • Not financial advice</p>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} Daily Stock Magazine</p>
        </footer>
      </div>
    </main>
  );
}
