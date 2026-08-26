'use client';

import { useEffect, useMemo, useState } from 'react';

// Cloud Archive table — reads previously archived daily snapshots from
// Vercel KV via /api/history (newest first, since entries are written with
// LPUSH). Purely additive: does not read from, call, or modify /api/stocks,
// /api/sp500, or any existing stock-retrieval/calculation logic.
export default function ArchiveTable() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tickerFilter, setTickerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/history?limit=300', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        setRecords(Array.isArray(data.records) ? data.records : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const tickerMatch =
        !tickerFilter || (r.ticker || '').toUpperCase().includes(tickerFilter.toUpperCase());
      const dateMatch = !dateFilter || (r.timestamp || '').slice(0, 10) === dateFilter;
      return tickerMatch && dateMatch;
    });
  }, [records, tickerFilter, dateFilter]);

  const formatDate = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || '—';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-purple-400">Cloud Archive</h2>
        <p className="text-sm text-gray-400">
          {filtered.length} of {records.length} snapshots
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Filter by ticker (e.g. NVDA)"
          value={tickerFilter}
          onChange={(e) => setTickerFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-400"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-400"
        />
        {(tickerFilter || dateFilter) && (
          <button
            onClick={() => {
              setTickerFilter('');
              setDateFilter('');
            }}
            className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-gray-400 hover:text-gray-200 hover:border-slate-500"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400 mx-auto"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-200 text-sm">
          Error: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No archived snapshots match your filters yet.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-gray-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Change</th>
                <th className="px-4 py-3 font-medium">Recommendation</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">
                    {formatDate(r.timestamp)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-white">{r.ticker}</td>
                  <td className="px-4 py-3 font-mono text-gray-200">
                    {typeof r.price === 'number' ? `$${r.price.toFixed(2)}` : '—'}
                  </td>
                  <td
                    className={`px-4 py-3 font-mono ${
                      typeof r.metrics?.change === 'number' && r.metrics.change >= 0
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {typeof r.metrics?.change === 'number'
                      ? `${r.metrics.change >= 0 ? '+' : ''}${r.metrics.change.toFixed(2)}%`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{r.metrics?.aiRecommendation || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate" title={r.summary || ''}>
                    {r.summary || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
