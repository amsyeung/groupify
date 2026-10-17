import { useState, type ReactNode } from 'react'
import { t } from '../lib/i18n'
import { getDraggedTab, isTabDrag } from '../lib/drag'
import GroupMenu from './GroupMenu'
import Highlight from './Highlight'

interface Props {
  id: string
  title: string
  /** A chrome tab group colour; omitted for the ungrouped section. */
  color?: string
  count: number
  query: string
  open: boolean
  onToggle: () => void
  onDropTab: (tabId: number) => void
  /** The group itself, to show the rename/colour/close menu. */
  group?: chrome.tabGroups.TabGroup
  /** Extra controls above the tab list (the ungrouped section's grouping tools). */
  toolbar?: ReactNode
  children: ReactNode
}

export default function GroupSection({ id, title, color, count, query, open, onToggle, onDropTab, group, toolbar, children }: Props) {
  const [dropping, setDropping] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const accent = color ? `var(--group-${color})` : 'var(--color-slate-400)'

  return (
    <section
      id={`section-${id}`}
      onDragOver={(e) => {
        if (!isTabDrag(e)) return
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropping(false)}
      onDrop={(e) => {
        setDropping(false)
        const tabId = getDraggedTab(e)
        if (tabId !== null) {
          e.preventDefault()
          onDropTab(tabId)
        }
      }}
      className={`scroll-mt-28 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200/70 transition dark:bg-slate-900 dark:ring-slate-800 ${
        dropping ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
      }`}
    >
      <div className="flex items-center" style={{ boxShadow: `inset 4px 0 0 ${accent}` }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-2 pl-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
        >
          <span className="truncate text-sm font-semibold" style={color ? { color: accent } : undefined}>
            <Highlight text={title} query={query} />
          </span>
          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {count}
          </span>
          <span className={`ml-auto text-[10px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
            ▼
          </span>
        </button>
        {group && (
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            title={t('groupActions')}
            aria-label={t('groupActions')}
            className="mr-1 rounded px-2 py-1 text-base leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ⋯
          </button>
        )}
      </div>
      {group && menuOpen && <GroupMenu group={group} tabCount={count} />}
      {open && toolbar}
      {open && (
        <div className="space-y-px px-1.5 pb-1.5">
          {count === 0 ? <p className="px-2 py-2 text-center text-[11px] text-slate-400">{t('dropHere')}</p> : children}
        </div>
      )}
    </section>
  )
}
