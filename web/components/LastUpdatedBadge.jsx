'use client';

import { useEffect, useState } from 'react';

// Formats an ISO timestamp as DD/MM/YYYY HH:mm, per spec.
function formatTimestamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Non-intrusive addition: reads the archive's last-write timestamp from
// Vercel KV via /api/history. Renders nothing until a real timestamp is
// available — no placeholder/fake time is ever shown. Does not read from
// or affect /api/stocks or /api/sp500 in any way.
export default function LastUpdatedBadge() {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/history?limit=1', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLastUpdated(data.lastUpdated || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !lastUpdated) return null;

  const formatted = formatTimestamp(lastUpdated);
  if (!formatted) return null;

  return (
    <span className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-gray-300">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
      Last Updated: {formatted}
    </span>
  );
}
