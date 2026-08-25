export default function Header({ date }) {
  const formatDate = (d) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(d);
  };

  const formatDateHE = (d) => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    const day = days[d.getDay()];
    const date = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    return `${day}, ${date} ב${month} ${year}`;
  };

  return (
    <div className="mb-8">
      <div className="border-b-2 border-emerald-400 pb-4">
        <h1 className="text-4xl font-bold text-emerald-400 mb-2 tracking-wider">
          🗞 PRE-MARKET INTELLIGENCE
        </h1>
        <div className="text-sm text-gray-400 space-y-1">
          <p>{formatDate(date)} • NYSE opens in 10 minutes • 🇮🇱 Israel Edition</p>
          <p className="text-right text-gray-500 text-xs">
            {formatDateHE(date)} • NYSE נפתח בעוד 10 דקות
          </p>
        </div>
      </div>
    </div>
  );
}
