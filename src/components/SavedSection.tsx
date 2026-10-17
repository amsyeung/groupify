import { t, tn } from '../lib/i18n'
import type { ListedGroup } from '../lib/saved'
import Highlight from './Highlight'

interface Props {
  id: string
  title: string
  saved: ListedGroup[]
  query: string
  open: boolean
  onToggle: () => void
  onOpenGroup: (group: ListedGroup) => void
  onDelete: (group: ListedGroup) => void
  /** Recently closed groups can be moved to Saved. */
  onKeep?: (group: ListedGroup) => void
}

/** Saved (or recently closed) tab groups, each one reopenable as a new group in this window. */
export default function SavedSection({ id, title, saved, query, open, onToggle, onOpenGroup, onDelete, onKeep }: Props) {
  return (
    <section
      id={`section-${id}`}
      className="scroll-mt-28 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 py-2.5 pr-3 pl-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
      >
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {saved.length}
        </span>
        <span className={`ml-auto text-[10px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▼
        </span>
      </button>
      {open && (
        <ul className="space-y-px px-1.5 pb-1.5">
          {saved.map((g) => (
            <li
              key={g.id}
              data-saved-group
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--group-${g.color})` }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-xs font-medium" title={g.urls.join('\n')}>
                <Highlight text={g.title || t('untitledGroup')} query={query} />
              </span>
              {g.area === 'local' && !onKeep && (
                <span className="shrink-0 text-[10px] text-slate-400" title={t('savedLocalOnlyTitle')}>
                  {t('savedLocalOnly')}
                </span>
              )}
              <span className="shrink-0 text-[10px] text-slate-400">{tn('tabCount', g.urls.length)}</span>
              {onKeep && (
                <button
                  type="button"
                  onClick={() => onKeep(g)}
                  title={t('keepGroupTitle')}
                  className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ring-1 ring-slate-200 hover:bg-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
                >
                  {t('keepGroup')}
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenGroup(g)}
                title={t('openSavedTitle')}
                className="shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-slate-200 hover:bg-blue-50 dark:text-blue-400 dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                {t('openSaved')}
              </button>
              <button
                type="button"
                onClick={() => onDelete(g)}
                title={t('deleteSaved')}
                aria-label={t('deleteSaved')}
                className="shrink-0 rounded px-1 text-sm leading-none text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
