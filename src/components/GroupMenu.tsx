import { ArrowsPointingInIcon, ArrowsPointingOutIcon, BookmarkIcon, LinkSlashIcon, LockOpenIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkSolid, LockClosedIcon as LockClosedSolid } from '@heroicons/react/24/solid'
import { useState, type ReactNode } from 'react'
import { recordHistory } from '../hooks/useHistory'
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

interface IconButtonProps {
  label: string
  /** Extra explanation for the tooltip. */
  hint?: string
  onClick: () => void
  onBlur?: () => void
  disabled?: boolean
  pressed?: boolean
  danger?: boolean
  className?: string
  children: ReactNode
}

/** A square icon button; the label is its tooltip and accessible name. */
function IconButton({ label, hint, onClick, onBlur, disabled, pressed, danger, className = '', children }: IconButtonProps) {
  const tone = pressed
    ? 'bg-slate-900 text-white ring-slate-900 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:ring-white dark:hover:bg-slate-200'
    : danger
      ? 'text-red-600 ring-slate-200 hover:bg-red-50 hover:ring-red-200 dark:text-red-400 dark:ring-slate-700 dark:hover:bg-red-950/40'
      : 'text-slate-600 ring-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-white'
  return (
    <button
      type="button"
      title={hint ? `${label} · ${hint}` : label}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      onBlur={onBlur}
      disabled={disabled}
      className={`shrink-0 rounded-md p-1.5 ring-1 transition disabled:opacity-40 disabled:hover:bg-transparent ${tone} ${className}`}
    >
      {children}
    </button>
  )
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
    if (!ids.length) return
    await recordHistory('histUngroup', group.title || undefined)
    await chrome.tabs.ungroup(ids as [number, ...number[]])
  }

  const save = async () => {
    const saved = await saveGroup(group)
    setSaveResult(saved ? 'saved' : 'nothing')
  }

  const closeGroup = async () => {
    const tabs = await chrome.tabs.query({ groupId: group.id })
    await chrome.tabs.remove(tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined))
  }

  const needsName = !locked && !(group.title ?? '').trim()

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
      <div className="flex items-center gap-1.5 pt-1">
        <IconButton
          label={locked ? t('unlockGroup') : t('lockGroup')}
          hint={needsName ? t('lockNeedsName') : t('lockTitle')}
          onClick={onToggleLock}
          disabled={needsName}
          pressed={locked}
        >
          {locked ? <LockClosedSolid className="h-4 w-4" /> : <LockOpenIcon className="h-4 w-4" />}
        </IconButton>
        <IconButton
          label={group.collapsed ? t('expandInChrome') : t('collapseInChrome')}
          onClick={() => chrome.tabGroups.update(group.id, { collapsed: !group.collapsed })}
        >
          {group.collapsed ? <ArrowsPointingOutIcon className="h-4 w-4" /> : <ArrowsPointingInIcon className="h-4 w-4" />}
        </IconButton>
        <IconButton
          label={t('saveGroup')}
          hint={t('saveGroupTitle')}
          onClick={save}
          onBlur={() => setSaveResult(null)}
          pressed={saveResult === 'saved'}
        >
          {saveResult === 'saved' ? <BookmarkSolid className="h-4 w-4" /> : <BookmarkIcon className="h-4 w-4" />}
        </IconButton>
        <IconButton label={t('ungroup')} onClick={ungroup}>
          <LinkSlashIcon className="h-4 w-4" />
        </IconButton>
        {saveResult && (
          <span role="status" className={`text-[11px] ${saveResult === 'saved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
            {saveResult === 'saved' ? t('savedGroupDone') : t('saveGroupNothing')}
          </span>
        )}
        <IconButton label={t('closeGroup')} onClick={closeGroup} danger className="ml-auto">
          <XMarkIcon className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  )
}
