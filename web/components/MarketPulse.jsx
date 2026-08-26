export default function MarketPulse({ date }) {
  const pulseText = {
    en: "Mixed sentiment with trade tensions and tariff concerns dominating headlines. SPY and QQQ showed weakness due to U.S.-Canada trade escalation and weakening consumer confidence. Tech sector remains focal point ahead of Nvidia earnings and Jackson Hole symposium. Healthcare and Financial Services leading market performance. Risk-off mood early, watching for potential reversal on dovish Fed signals or positive earnings surprises.",
    he: "אווירה מעורבת עם מתחי סחר והשפעה של דירוג מס. SPY ו-QQQ הראו חולשה בגלל הגברת המתח בין ארה״ב וקנדה וירידה בביטחון של צרכנים. סקטור הטכנולוגיה נשאר במוקד הביקורת לפני הכרזת רווחי Nvidia וכנס Jackson Hole. סקטור בריאות ושירותים פיננסיים מובילים בביצוע. אווירה של הסתכנות נמוכה בתחילת היום."
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-8">
      <div className="flex items-center mb-4">
        <h2 className="text-lg font-bold text-gray-400 tracking-widest">📡 MARKET PULSE</h2>
      </div>

      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-300">
          {pulseText.en}
        </p>

        <div className="border-t border-slate-700 pt-4">
          <p className="text-sm leading-relaxed text-gray-500 text-right">
            🇮🇱 <strong>דעה בשוק:</strong> {pulseText.he}
          </p>
        </div>
      </div>
    </div>
  );
}
