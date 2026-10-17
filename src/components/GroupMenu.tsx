import { useState } from 'react'
import { saveGroup } from '../hooks/useSavedGroups'
import { t, type MessageKey } from '../lib/i18n'
import { GROUP_COLORS } from '../lib/tabs'

interface Props {
  group: chrome.tabGroups.TabGroup
  locked: boolean
  onToggleLock: () => void
  /** Called after a rename from here, so a lock can follow the new name. */
  onRenamed: (from: string, to: string) => void
}

const colorName = (c: string) => t(`color${c[0].toUpperCase()}${c.slice(1)}` as MessageKey)

/** Rename, recolour, lock, collapse, save, ungroup or close one tab group. */
export default function GroupMenu({ group, locked, onToggleLock, onRenamed }: Props) {
  const [title, setTitle] = useState(group.title ?? '')
  const [saveResult, setSaveResult] = useState<'saved' | 'nothing' | null>(null)

  const saveTitle = () => {
    const from = group.title ?? ''
    if (title === from) return
    chrome.tabGroups.update(group.id, { title })
    onRenamed(from, title)
  }

  const ungroup = async () => {
    const tabs = await chrome.tabs.query({ groupId: group.id })
    const ids = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined)
    if (ids.length) await chrome.tabs.ungroup(ids as [number, ...number[]])
  }

  const save = async () => {
    const saved = await saveGroup(group)
    setSaveResult(saved ? 'saved' : 'nothing')
  }

  const closeGroup = async () => {
    const tabs = await chrome.tabs.query({ groupId: group.id })
    await chrome.tabs.remove(tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined))
  }

  const button = 'rounded px-2 py-1 text-[11px] font-medium ring-1 ring-slate-200 hover:bg-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800'

  return (
    <div className="space-y-2 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
      <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="w-12 shrink-0">{t('rename')}</span>
        <input
          type="text"
          value={title}
          spellCheck={false}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="min-w-0 flex-1 rounded bg-white px-2 py-1 text-xs text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
        />
      </label>
      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="w-12 shrink-0">{t('color')}</span>
        <div className="flex flex-wrap gap-1.5">
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={colorName(c)}
              aria-label={colorName(c)}
              aria-pressed={group.color === c}
              onClick={() => chrome.tabGroups.update(group.id, { color: c })}
              className={`h-4 w-4 rounded-full ${group.color === c ? 'ring-2 ring-slate-900 ring-offset-1 dark:ring-white dark:ring-offset-slate-900' : ''}`}
              style={{ backgroundColor: `var(--group-${c})` }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <button
          type="button"
          onClick={onToggleLock}
          disabled={!locked && !(group.title ?? '').trim()}
          title={!locked && !(group.title ?? '').trim() ? t('lockNeedsName') : t('lockTitle')}
          aria-pressed={locked}
          className={`${button} disabled:opacity-40 ${locked ? 'bg-slate-900 text-white ring-slate-900 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:ring-white' : ''}`}
        >
          {locked ? `🔒 ${t('unlockGroup')}` : t('lockGroup')}
        </button>
        <button type="button" className={button} onClick={() => chrome.tabGroups.update(group.id, { collapsed: !group.collapsed })}>
          {group.collapsed ? t('expandInChrome') : t('collapseInChrome')}
        </button>
        <button type="button" className={button} onClick={save} onBlur={() => setSaveResult(null)} title={t('saveGroupTitle')}>
          {saveResult === 'saved' ? t('savedGroupDone') : saveResult === 'nothing' ? t('saveGroupNothing') : t('saveGroup')}
        </button>
        <button type="button" className={button} onClick={ungroup}>
          {t('ungroup')}
        </button>
        <button type="button" onClick={closeGroup} className={`${button} text-red-600 dark:text-red-400`}>
          {t('closeGroup')}
        </button>
      </div>
    </div>
  )
}
