import { t } from '../lib/i18n'
import { setDraggedTab } from '../lib/drag'
import { matchesOnlyUrl, tabUrl } from '../lib/tabs'
import Favicon from './Favicon'
import Highlight from './Highlight'

interface Props {
  tab: chrome.tabs.Tab
  query: string
  selectable?: boolean
  selected?: boolean
  onToggle?: () => void
}

function activate(tab: chrome.tabs.Tab) {
  if (tab.id === undefined) return
  chrome.tabs.update(tab.id, { active: true })
  chrome.windows.update(tab.windowId, { focused: true })
}

export default function TabRow({ tab, query, selectable, selected, onToggle }: Props) {
  const title = tab.title || tabUrl(tab) || ''
  const showUrl = matchesOnlyUrl(tab, query)

  return (
    <div
      draggable={tab.id !== undefined}
      onDragStart={(e) => tab.id !== undefined && setDraggedTab(e, tab.id)}
      className={`group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 ${tab.discarded ? 'opacity-60' : ''}`}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onToggle}
          aria-label={title}
          className="h-3.5 w-3.5 shrink-0 accent-slate-900 dark:accent-slate-100"
        />
      )}
      <button
        type="button"
        data-tab-row
        onClick={() => activate(tab)}
        title={tabUrl(tab)}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded py-1 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Favicon src={tab.favIconUrl} label={title} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate ${tab.active ? 'font-semibold' : ''}`}>
            <Highlight text={title} query={query} />
          </span>
          {showUrl && (
            <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
              <Highlight text={tabUrl(tab)} query={query} />
            </span>
          )}
        </span>
        {tab.audible && (
          <span className="shrink-0 text-[10px]" aria-hidden>
            🔊
          </span>
        )}
        {tab.pinned && (
          <span title={t('pinned')} className="shrink-0 text-[10px] text-slate-400">
            📌
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => tab.id !== undefined && chrome.tabs.remove(tab.id)}
        title={t('closeTab')}
        aria-label={t('closeTab')}
        className="shrink-0 rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 focus-visible:opacity-100 dark:hover:bg-red-900/40 dark:hover:text-red-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}
