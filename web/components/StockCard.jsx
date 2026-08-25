export default function StockCard({ stock }) {
  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400';

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish':
        return 'bg-emerald-900/30 text-emerald-400 border-emerald-600';
      case 'bearish':
        return 'bg-red-900/30 text-red-400 border-red-600';
      default:
        return 'bg-amber-900/30 text-amber-400 border-amber-600';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono font-bold text-lg text-white">{stock.ticker}</div>
          <div className="text-xs text-gray-500">{stock.exchange}</div>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-lg text-white">${stock.price?.toFixed(2)}</div>
          <div className={`font-mono text-sm font-semibold ${changeColor}`}>
            {isPositive ? '+' : ''}{stock.change?.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Company Name */}
      <div className="text-sm text-gray-400 mb-2">{stock.name}</div>
      <div className="text-xs text-gray-600 mb-3 text-right">{stock.nameHE}</div>

      {/* Why */}
      <div className="border-l-2 border-slate-600 pl-3 mb-3 text-sm text-gray-300 leading-relaxed">
        {stock.why}
      </div>
      <div className="border-r-2 border-slate-600 pr-3 mb-3 text-xs text-gray-500 leading-relaxed text-right">
        {stock.whyHE}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Sentiment */}
        <span className={`text-xs px-2 py-1 rounded-full border ${getSentimentColor(stock.sentiment)}`}>
          {stock.sentiment === 'BULLISH' && '📈 BULLISH'}
          {stock.sentiment === 'BEARISH' && '📉 BEARISH'}
          {stock.sentiment === 'NEUTRAL' && '👁️ WATCH'}
        </span>

        {/* Reddit */}
        {stock.reddit && (
          <span className="text-xs px-2 py-1 rounded-full bg-orange-900/30 text-orange-400 border border-orange-600">
            🤖 Reddit Buzz
          </span>
        )}

        {/* Catalyst */}
        {stock.catalyst && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-600">
            🚀 {stock.catalyst}
          </span>
        )}
      </div>

      {/* Market Cap & Volume */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-slate-700">
        <div className="font-mono">Market Cap: {stock.marketCap}</div>
        <div className="font-mono">Vol: {stock.volume}</div>
        <div className="text-right text-gray-600 text-xs">שווי שוק: {stock.marketCapHE}</div>
      </div>
    </div>
  );
}
