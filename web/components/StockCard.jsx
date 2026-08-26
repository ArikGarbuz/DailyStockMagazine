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

  // BUY = green, HOLD = amber, AVOID/SELL = red — mirrors the sentiment
  // badge styling but keyed off the AI Analyst's actual recommendation.
  const getRecommendationColor = (rec) => {
    switch (rec) {
      case 'BUY':
        return 'bg-emerald-900/30 text-emerald-400 border-emerald-600';
      case 'SELL':
      case 'AVOID':
        return 'bg-red-900/30 text-red-400 border-red-600';
      case 'HOLD':
      default:
        return 'bg-amber-900/30 text-amber-400 border-amber-600';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'LOW':
        return 'text-emerald-400';
      case 'HIGH':
        return 'text-red-400';
      case 'MEDIUM':
      default:
        return 'text-amber-400';
    }
  };

  const fetchedTime = stock.fetchedAt
    ? new Date(stock.fetchedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

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
        {stock.newsUrl ? (
          <a href={stock.newsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white underline underline-offset-2">
            {stock.why}
          </a>
        ) : (
          stock.why
        )}
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
          {typeof stock.sentimentScore === 'number' && ` (${stock.sentimentScore > 0 ? '+' : ''}${stock.sentimentScore})`}
        </span>

        {/* News source (real, only shown when we actually have one) */}
        {stock.catalyst && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-600">
            📰 Source: {stock.catalyst}
          </span>
        )}
      </div>

      {/* Market Cap, Range & Volume */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-slate-700">
        <div className="font-mono">Market Cap: {stock.marketCap}</div>
        <div className="font-mono">Day Range: {stock.volume}</div>
        {(stock.week52Low != null && stock.week52High != null) && (
          <div className="font-mono">52-Week Range: ${stock.week52Low.toFixed(2)}–${stock.week52High.toFixed(2)}</div>
        )}
        {stock.dailyVolumeAvg && (
          <div className="font-mono">Volume (10-day avg): {stock.dailyVolumeAvg} shares</div>
        )}
        {stock.volume3MonthAvg && (
          <div className="font-mono">Volume (3-month avg): {stock.volume3MonthAvg} shares</div>
        )}
        <div className="text-right text-gray-600 text-xs">
          שווי שוק: {stock.marketCap} | טווח יומי: {stock.volume}
        </div>
        {(stock.week52Low != null && stock.week52High != null) && (
          <div className="text-right text-gray-600 text-xs">טווח 52 שבועות: ${stock.week52Low.toFixed(2)}–${stock.week52High.toFixed(2)}</div>
        )}
        {stock.dailyVolumeAvg && (
          <div className="text-right text-gray-600 text-xs">נפח מסחר (ממוצע 10 ימים): {stock.dailyVolumeAvg} מניות</div>
        )}
        {stock.volume3MonthAvg && (
          <div className="text-right text-gray-600 text-xs">נפח מסחר (ממוצע 3 חודשים): {stock.volume3MonthAvg} מניות</div>
        )}
      </div>

      {/* AI Analyst View — one deep Gemini call/day per ticker, computed
          offline, modeled on a fund-analyst brief: fundamental + technical +
          risk read plus an explicit BUY/HOLD/AVOID/SELL call with entry,
          target, and stop-loss. Research heuristic from a general-purpose
          LLM, never a live call and never personalized advice — clearly
          labeled throughout. */}
      <div className="pt-2 mt-2 border-t border-slate-700">
        {stock.aiRecommendation ? (
          <>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${getRecommendationColor(stock.aiRecommendation)}`}>
                🤖 {stock.aiRecommendation}
              </span>
              {stock.aiRiskLevel && (
                <span className={`text-xs font-medium ${getRiskColor(stock.aiRiskLevel)}`}>
                  Risk: {stock.aiRiskLevel}
                </span>
              )}
            </div>

            {(stock.aiEntryZone || stock.aiTargetPrice || stock.aiStopLoss) && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500 font-mono mb-2">
                {stock.aiEntryZone && <span>Entry: {stock.aiEntryZone}</span>}
                {stock.aiTargetPrice && <span>Target: {stock.aiTargetPrice}</span>}
                {stock.aiStopLoss && <span>Stop: {stock.aiStopLoss}</span>}
              </div>
            )}

            {stock.aiFundamental && (
              <div className="mb-1.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Fundamental</div>
                <div className="text-xs text-gray-400 leading-relaxed">{stock.aiFundamental}</div>
                {stock.aiFundamentalHE && (
                  <div className="text-xs text-gray-500 leading-relaxed text-right">{stock.aiFundamentalHE}</div>
                )}
              </div>
            )}

            {stock.aiTechnical && (
              <div className="mb-1.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Technical</div>
                <div className="text-xs text-gray-400 leading-relaxed">{stock.aiTechnical}</div>
                {stock.aiTechnicalHE && (
                  <div className="text-xs text-gray-500 leading-relaxed text-right">{stock.aiTechnicalHE}</div>
                )}
              </div>
            )}

            {stock.aiRisk && (
              <div className="mb-1.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Risk</div>
                <div className="text-xs text-gray-400 leading-relaxed">{stock.aiRisk}</div>
                {stock.aiRiskHE && (
                  <div className="text-xs text-gray-500 leading-relaxed text-right">{stock.aiRiskHE}</div>
                )}
              </div>
            )}

            {stock.aiRationale && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800">
                <div className="text-xs text-gray-300 leading-relaxed italic">{stock.aiRationale}</div>
                {stock.aiRationaleHE && (
                  <div className="text-xs text-gray-400 leading-relaxed italic text-right">{stock.aiRationaleHE}</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-[10px] text-gray-600">
            🤖 AI Analyst view unavailable today · תצוגת AI לא זמינה היום
          </div>
        )}
      </div>

      {/* External links — verify data independently */}
      <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-slate-700 text-xs">
        <a
          href={`https://finance.yahoo.com/quote/${stock.ticker}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          📈 Yahoo Chart
        </a>
        <a
          href={`https://finance.yahoo.com/quote/${stock.ticker}/news`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          📰 Yahoo News
        </a>
        <a
          href={`https://www.google.com/finance/quote/${stock.ticker}:${stock.exchange}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          🔎 Google Finance
        </a>
        {stock.newsUrl && (
          <a
            href={stock.newsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            📄 Source Article
          </a>
        )}
      </div>

      {stock.isLive === false && (
        <div className="mt-1 text-[10px] text-gray-600 leading-snug">
          Sample/demo data, not a live feed — use the links above to verify against real-time sources before acting.
        </div>
      )}
      {stock.isLive === true && (
        <div className="mt-1 text-[10px] text-gray-600 leading-snug">
          Live data via Finnhub{fetchedTime ? ` · fetched ${fetchedTime}` : ''}. 52-week range, volume, and fundamental ratios are Finnhub free-tier data (not intraday). AI Analyst view is a research heuristic generated by a general-purpose language model — not personalized financial advice, and not a substitute for your own due diligence or a licensed advisor. Verify independently before acting.
        </div>
      )}
    </div>
  );
}
