import { splitHighlight } from '../lib/tabs'

export default function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitHighlight(text, query).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-amber-300 px-px text-slate-900 dark:bg-amber-400">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}
