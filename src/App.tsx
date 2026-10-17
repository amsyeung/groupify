import { useEffect, useMemo, useRef, useState } from 'react'
import GroupSection from './components/GroupSection'
import Menu from './components/Menu'
import NavPill from './components/NavPill'
import ReclassifyMenu from './components/ReclassifyMenu'
import SavedSection from './components/SavedSection'
import TabRow from './components/TabRow'
import { deleteSaved, keepClosed, openSaved, restoreDeleted, useSavedGroups } from './hooks/useSavedGroups'
import { useLocks, useSettings } from './hooks/useSynced'
import { useWindowTabs } from './hooks/useWindowTabs'
import { isLocked, type ReclassifyMode } from './lib/classify'
import { t, tn } from './lib/i18n'
import { dateName, suggestName } from './lib/naming'
import { reclassify } from './lib/reclassify'
import { savedMatchesQuery, type ListedGroup } from './lib/saved'
import { renameLock, toggleLock } from './lib/settings'
import { currentGroupId, findDuplicates, groupable, matchesQuery, pickColor, tabUrl } from './lib/tabs'

/**
 * Opens the settings page in a tab, or switches to it if it's already open. Not
 * chrome.runtime.openOptionsPage(): from a side panel it fails with "Could not create an options page".
 */
async function openSettings() {
  const url = chrome.runtime.getURL('options.html')
  const [open] = await chrome.tabs.query({ url })
  if (open?.id !== undefined) {
    await chrome.tabs.update(open.id, { active: true })
    await chrome.windows.update(open.windowId, { focused: true })
  } else {
    await chrome.tabs.create({ url })
  }
}

const UNGROUPED = 'ungrouped'
const SAVED = 'saved'
const CLOSED = 'closed'

interface Toast {
  message: string
  undo?: () => void
  /** Stays until replaced, e.g. while a reclassify is running. */
  sticky?: boolean
}

type TabIds = [number, ...number[]]
const asTabIds = (ids: number[]) => ids as TabIds

export default function App() {
  const { tabs, groups } = useWindowTabs()
  const saved = useSavedGroups()
  const [settings] = useSettings()
  const [locks, setLocks] = useLocks()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [newGroupName, setNewGroupName] = useState('')
  // Null until the user opens or closes a section: until then, only the current group (and Ungrouped) is open.
  const [openIds, setOpenIds] = useState<Set<string> | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const searching = query.trim().length > 0
  const visibleTabs = useMemo(() => tabs.filter((tab) => matchesQuery(tab, query)), [tabs, query])
  const ungrouped = visibleTabs.filter((tab) => tab.groupId === -1)
  const selectable = ungrouped.filter(groupable)
  const selectedVisible = selectable.filter((tab) => selected.has(tab.id!)).map((tab) => tab.id!)
  const duplicates = useMemo(() => findDuplicates(tabs), [tabs])
  const visibleSaved = useMemo(() => saved.filter((g) => savedMatchesQuery(g, query)), [saved, query])
  const keptGroups = visibleSaved.filter((g) => g.closedAt === undefined)
  const closedGroups = visibleSaved.filter((g) => g.closedAt !== undefined).sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
  const currentId = currentGroupId(tabs)
  const currentGroup = groups.find((g) => g.id === currentId)

  useEffect(() => {
    const start = () => setDragging(true)
    const end = () => setDragging(false)
    document.addEventListener('dragstart', start)
    document.addEventListener('dragend', end)
    document.addEventListener('drop', end)
    return () => {
      document.removeEventListener('dragstart', start)
      document.removeEventListener('dragend', end)
      document.removeEventListener('drop', end)
    }
  }, [])

  useEffect(() => {
    if (!toast || toast.sticky) return
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const defaultOpen = useMemo(() => new Set([UNGROUPED, SAVED, String(currentId)]), [currentId])
  const effectiveOpen = openIds ?? defaultOpen
  // While searching, every section with a match is open; otherwise the user decides.
  const isOpen = (id: string) => searching || effectiveOpen.has(id)
  const toggle = (id: string) => {
    const next = new Set(effectiveOpen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpenIds(next)
  }

  const jumpTo = (id: string) => {
    setOpenIds(new Set(effectiveOpen).add(id))
    requestAnimationFrame(() => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const moveTab = async (tabId: number, groupId: number | null) => {
    if (groupId === null) await chrome.tabs.ungroup(tabId)
    else await chrome.tabs.group({ tabIds: tabId, groupId })
  }

  /**
   * Groups the tabs under the typed name. Without one, the group starts out named after today's
   * date and is renamed when the on-device model suggests something better.
   */
  const createGroup = async (ids: number[]) => {
    if (!ids.length) return
    const typed = newGroupName.trim()
    const placeholder = typed || dateName()
    const groupId = await chrome.tabs.group({ tabIds: asTabIds(ids) })
    await chrome.tabGroups.update(groupId, { title: placeholder, color: pickColor(groups.map((g) => g.color)) })
    setNewGroupName('')
    setSelected(new Set())
    setToast({ message: t('madeGroup'), undo: () => chrome.tabs.ungroup(asTabIds(ids)).catch(() => {}) })
    if (typed || !settings.useAi) return
    const suggested = await suggestName(tabs.filter((tab) => ids.includes(tab.id!)))
    if (!suggested) return
    // Keep a name the user has typed in the meantime.
    const group = await chrome.tabGroups.get(groupId).catch(() => null)
    if (group?.title === placeholder) await chrome.tabGroups.update(groupId, { title: suggested })
  }

  const addToCurrentGroup = async () => {
    if (!currentGroup || !selectable.length) return
    const ids = selectable.map((tab) => tab.id!)
    await chrome.tabs.group({ tabIds: asTabIds(ids), groupId: currentGroup.id })
    setToast({
      message: t('addedToGroup', currentGroup.title || t('untitledGroup')),
      undo: () => chrome.tabs.ungroup(asTabIds(ids)).catch(() => {}),
    })
  }

  const runReclassify = async (mode: ReclassifyMode) => {
    setBusy(true)
    setToast({ message: t('reclassifying'), sticky: true })
    try {
      const result = await reclassify(mode, tabs, groups, locks, settings.useAi)
      if (!result) return setToast({ message: t('reclassifyNothing') })
      setOpenIds(null)
      setToast({ message: result.usedFallback ? t('projectNoAi') : tn('reclassified', result.groups), undo: () => result.undo().catch(() => {}) })
    } catch {
      setToast(null)
    } finally {
      setBusy(false)
    }
  }

  const closeDuplicates = async () => {
    const closing = tabs.filter((tab) => duplicates.includes(tab.id!))
    await chrome.tabs.remove(duplicates)
    setToast({
      message: tn('closedTabs', closing.length),
      undo: () => {
        for (const tab of closing) chrome.tabs.create({ url: tabUrl(tab), index: tab.index, pinned: tab.pinned, active: false })
      },
    })
  }

  const openSavedGroup = async (group: ListedGroup) => {
    const opened = await openSaved(group)
    setToast({ message: opened ? t('openedSaved', group.title || t('untitledGroup')) : t('openSavedFailed') })
  }

  const deleteSavedGroup = async (group: ListedGroup) => {
    await deleteSaved(group)
    setToast({ message: t('deletedSaved', group.title || t('untitledGroup')), undo: () => restoreDeleted(group) })
  }

  // ↑/↓ move between the search box and the tab rows; Enter in the search box opens the first match.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const rows = [...document.querySelectorAll<HTMLElement>('[data-tab-row]')]
    const stops = [searchRef.current!, ...rows]
    const at = stops.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (at === -1) return
      e.preventDefault()
      const next = e.key === 'ArrowDown' ? Math.min(at + 1, stops.length - 1) : Math.max(at - 1, 0)
      stops[next].focus()
      stops[next].scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && at === 0 && rows[0]) {
      e.preventDefault()
      rows[0].click()
    } else if (e.key === 'Escape' && query) {
      e.preventDefault()
      setQuery('')
      searchRef.current?.focus()
    }
  }

  const selectionBar = selectedVisible.length > 0 && (
    <div className="mx-2 mb-2 flex items-center gap-2 rounded-md bg-slate-900 p-1.5 pl-2.5 text-white dark:bg-white dark:text-slate-900">
      <span className="shrink-0 text-[11px] font-semibold">{t('selectedCount', selectedVisible.length)}</span>
      <input
        type="text"
        placeholder={t('newGroupPlaceholder')}
        spellCheck={false}
        value={newGroupName}
        onChange={(e) => setNewGroupName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && createGroup(selectedVisible)}
        className="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white outline-none placeholder:text-white/50 focus:bg-white/20 dark:bg-slate-900/10 dark:text-slate-900 dark:placeholder:text-slate-500"
      />
      <button
        type="button"
        onClick={() => createGroup(selectedVisible)}
        className="shrink-0 rounded bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900 hover:bg-slate-200 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-700"
      >
        {t('groupThem')}
      </button>
      <button
        type="button"
        onClick={() => setSelected(new Set())}
        title={t('clearSelection')}
        aria-label={t('clearSelection')}
        className="shrink-0 rounded px-1.5 text-sm leading-none opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  )

  const showUngrouped = ungrouped.length > 0 || (dragging && !searching)
  const visibleGroups = groups.filter((g) => !searching || visibleTabs.some((tab) => tab.groupId === g.id))
  const menuItem =
    'block w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-slate-800'

  return (
    <div onKeyDown={onKeyDown} className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 space-y-2 bg-slate-50/90 px-3 pt-3 pb-2 backdrop-blur-md dark:bg-slate-950/90">
        <div className="flex gap-2">
          <input
            ref={searchRef}
            type="search"
            placeholder={t('searchPlaceholder')}
            title={t('searchHint')}
            autoFocus
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 dark:bg-slate-900 dark:ring-slate-700 dark:focus:ring-slate-300"
          />
          <Menu
            label="⋯"
            title={t('moreActions')}
            align="right"
            buttonClassName="h-full rounded-lg bg-white px-3 text-base leading-none text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            {(close) => (
              <>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!duplicates.length}
                  title={t('closeDuplicatesTitle')}
                  onClick={() => {
                    close()
                    closeDuplicates()
                  }}
                  className={menuItem}
                >
                  {duplicates.length ? tn('closeDuplicates', duplicates.length) : t('noDuplicates')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close()
                    openSettings()
                  }}
                  className={menuItem}
                >
                  {t('settings')}
                </button>
              </>
            )}
          </Menu>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => createGroup(selectable.map((tab) => tab.id!))}
            disabled={!selectable.length}
            title={t('groupSeriesTitle')}
            className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:disabled:hover:bg-white"
          >
            {t('groupSeries', selectable.length)}
          </button>
          <ReclassifyMenu defaultMode={settings.reclassifyMode} busy={busy} onPick={runReclassify} />
        </div>
        {currentGroup && selectable.length > 0 && (
          <button
            type="button"
            onClick={addToCurrentGroup}
            title={t('addToCurrentTitle')}
            className="flex w-full min-w-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ring-slate-200 ring-inset hover:bg-white dark:ring-slate-700 dark:hover:bg-slate-900"
          >
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--group-${currentGroup.color})` }} />
            <span className="truncate">{t('addToCurrent', currentGroup.title || t('untitledGroup'))}</span>
          </button>
        )}
        {groups.length > 0 && (
          <nav className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
            <NavPill title={t('ungrouped')} onClick={() => jumpTo(UNGROUPED)} onDropTab={(id) => moveTab(id, null)} />
            {groups.map((g) => (
              <NavPill
                key={g.id}
                title={`${isLocked(g, locks) ? '🔒 ' : ''}${g.title || t('untitledGroup')}`}
                color={g.color}
                onClick={() => jumpTo(String(g.id))}
                onDropTab={(id) => moveTab(id, g.id)}
              />
            ))}
          </nav>
        )}
      </header>

      <main className={`space-y-2 px-3 ${toast ? 'pb-16' : 'pb-3'}`}>
        {showUngrouped && (
          <GroupSection
            id={UNGROUPED}
            title={t('ungrouped')}
            count={ungrouped.length}
            query={query}
            open={isOpen(UNGROUPED) || dragging}
            onToggle={() => toggle(UNGROUPED)}
            onDropTab={(id) => moveTab(id, null)}
            icons={ungrouped.map((tab) => ({ src: tab.favIconUrl, label: tab.title ?? '' }))}
            toolbar={selectionBar}
          >
            {ungrouped.map((tab) => (
              <TabRow
                key={tab.id}
                tab={tab}
                query={query}
                selectable={groupable(tab)}
                selected={selected.has(tab.id!)}
                onToggle={() =>
                  setSelected((prev) => {
                    const next = new Set(prev)
                    if (next.has(tab.id!)) next.delete(tab.id!)
                    else next.add(tab.id!)
                    return next
                  })
                }
              />
            ))}
          </GroupSection>
        )}

        {visibleGroups.map((g) => {
          const groupTabs = visibleTabs.filter((tab) => tab.groupId === g.id)
          return (
            <GroupSection
              key={g.id}
              id={String(g.id)}
              title={g.title || t('untitledGroup')}
              color={g.color}
              count={groupTabs.length}
              query={query}
              open={isOpen(String(g.id))}
              onToggle={() => toggle(String(g.id))}
              onDropTab={(id) => moveTab(id, g.id)}
              group={g}
              locked={isLocked(g, locks)}
              onToggleLock={() => setLocks(toggleLock(locks, g.title ?? ''))}
              onRenamed={(from, to) => setLocks(renameLock(locks, from, to))}
              icons={groupTabs.map((tab) => ({ src: tab.favIconUrl, label: tab.title ?? '' }))}
            >
              {groupTabs.map((tab) => (
                <TabRow key={tab.id} tab={tab} query={query} />
              ))}
            </GroupSection>
          )
        })}

        {keptGroups.length > 0 && (
          <SavedSection
            id={SAVED}
            title={t('saved')}
            saved={keptGroups}
            query={query}
            open={isOpen(SAVED)}
            onToggle={() => toggle(SAVED)}
            onOpenGroup={openSavedGroup}
            onDelete={deleteSavedGroup}
          />
        )}

        {closedGroups.length > 0 && (
          <SavedSection
            id={CLOSED}
            title={t('recentlyClosed')}
            saved={closedGroups}
            query={query}
            open={isOpen(CLOSED)}
            onToggle={() => toggle(CLOSED)}
            onOpenGroup={openSavedGroup}
            onDelete={deleteSavedGroup}
            onKeep={(g) => keepClosed(g)}
          />
        )}

        {searching && visibleTabs.length === 0 && visibleSaved.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500">{t('noResults', query.trim())}</p>
        )}
      </main>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-3 z-30 flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          <span className="flex-1">{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.()
                setToast(null)
              }}
              className="font-semibold text-amber-300 hover:underline dark:text-blue-700"
            >
              {t('undo')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
