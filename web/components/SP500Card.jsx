export default function SP500Card({ company }) {
  const hasPrice = typeof company.price === 'number';
  const isPositive = typeof company.change === 'number' && company.change >= 0;
  const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono font-bold text-lg text-white">{company.ticker}</div>
          {company.industry && <div className="text-xs text-gray-500">{company.industry}</div>}
        </div>
        {hasPrice && (
          <div className="text-right">
            <div className="font-mono font-bold text-lg text-white">${company.price.toFixed(2)}</div>
            {typeof company.change === 'number' && (
              <div className={`font-mono text-sm font-semibold ${changeColor}`}>
                {isPositive ? '+' : ''}{company.change.toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Company Name */}
      <div className="text-sm font-semibold text-gray-200 mb-2">{company.name}</div>

      {/* Business description — sourced from Wikipedia, never generated */}
      <div className="border-l-2 border-slate-600 pl-3 mb-2 text-sm text-gray-300 leading-relaxed">
        {company.description}
      </div>
      {company.descriptionHE && (
        <div className="border-r-2 border-slate-600 pr-3 mb-3 text-xs text-gray-500 leading-relaxed text-right">
          {company.descriptionHE}
        </div>
      )}

      {/* Employees + Market Cap — sourced from Wikidata / Finnhub */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-gray-300 border border-slate-600">
          👥 {company.employees.toLocaleString('en-US')} employees
        </span>
        {company.marketCap && (
          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-gray-300 border border-slate-600">
            💰 {company.marketCap}
          </span>
        )}
      </div>

      {/* Links — official site is a mandatory field for every card shown */}
      <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-slate-700 text-xs">
        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          🌐 Official Website
        </a>
        {company.wikipediaUrl && (
          <a
            href={company.wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            📖 Wikipedia
          </a>
        )}
        <a
          href={`https://finance.yahoo.com/quote/${company.ticker}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          📈 Yahoo Chart
        </a>
      </div>

      <div className="mt-2 text-[10px] text-gray-600 leading-snug">
        Description via Wikipedia · Employee count via Wikidata · Market data via Finnhub. Every field on this card comes from a real, cited source — tickers missing any required field are never shown.
      </div>
    </div>
  );
}
