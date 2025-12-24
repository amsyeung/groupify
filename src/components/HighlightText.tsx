export default function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className="font-medium text-slate-700 dark:text-slate-200">
      {parts.map((part, i) => regex.test(part) ? (
        <mark key={i} className="bg-amber-400/90 text-slate-900 rounded-sm px-0.5 shadow-sm font-bold">{part}</mark>
      ) : <span key={i}>{part}</span>)}
    </span>
  );
};

