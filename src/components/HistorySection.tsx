import { t } from '../lib/i18n'
import type { Snapshot } from '../lib/history'
import { uiLanguage } from '../lib/naming'

interface Props {
  history: Snapshot[]
  onRestore: (snapshot: Snapshot) => void
  onClose: () => void
}

const time = (at: number) => new Intl.DateTimeFormat(uiLanguage(), { hour: 'numeric', minute: '2-digit' }).format(at)

/** Every layout saved before a Groupify change in this window, newest first, each one restorable. */
export default function HistorySection({ history, onRestore, onClose }: Props) {
  return (
    <section
      id="section-history"
      className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="flex items-center gap-2 py-2.5 pr-2 pl-4">
        <span className="text-sm font-semibold">{t('history')}</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('historyHint')}</span>
        <button
          type="button"
          onClick={onClose}
          title={t('clearSelection')}
          aria-label={t('clearSelection')}
          className="ml-auto rounded px-2 py-0.5 text-base leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          ×
        </button>
      </div>
      {history.length === 0 ? (
        <p className="px-4 pb-3 text-xs text-slate-500 dark:text-slate-400">{t('historyEmpty')}</p>
      ) : (
        <ol className="space-y-px px-1.5 pb-1.5">
          {history.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <span className="w-14 shrink-0 text-[11px] text-slate-400 tabular-nums">{time(s.at)}</span>
              <span className="min-w-0 flex-1 truncate text-xs">{t('historyBefore', s.detail ? `${t(s.label)}：${s.detail}` : t(s.label))}</span>
              <span className="shrink-0 text-[10px] text-slate-400">{t('historyGroups', s.groups.length)}</span>
              <button
                type="button"
                onClick={() => onRestore(s)}
                title={t('restoreTitle')}
                className="shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-slate-200 hover:bg-blue-50 dark:text-blue-400 dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                {t('restore')}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
