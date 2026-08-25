export default function Header({ date }) {
  const formatDate = (d) => {
    // Use current date if not provided
    const displayDate = d ? new Date(d) : new Date();
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Jerusalem'
    }).format(displayDate);
  };

  const formatDateHE = (d) => {
    const displayDate = d ? new Date(d) : new Date();
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    const day = days[displayDate.getDay()];
    const date = displayDate.getDate();
    const month = months[displayDate.getMonth()];
    const year = displayDate.getFullYear();

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
