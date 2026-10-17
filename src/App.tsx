import { useEffect, useMemo, useRef, useState } from 'react'
import GroupSection from './components/GroupSection'
import NavPill from './components/NavPill'
import SavedSection from './components/SavedSection'
import TabRow from './components/TabRow'
import { deleteSaved, openSaved, restoreDeleted, useSavedGroups } from './hooks/useSavedGroups'
import { useWindowTabs } from './hooks/useWindowTabs'
import { t, tn } from './lib/i18n'
import { dateName, suggestName } from './lib/naming'
import { savedMatchesQuery, type ListedGroup } from './lib/saved'
import { currentGroupId, findDuplicates, groupable, matchesQuery, pickColor, planGroupBySite, tabUrl } from './lib/tabs'

const UNGROUPED = 'ungrouped'
const SAVED = 'saved'

interface Toast {
  message: string
  undo?: () => void
}

type TabIds = [number, ...number[]]
const asTabIds = (ids: number[]) => ids as TabIds

export default function App() {
  const { tabs, groups } = useWindowTabs()
  const saved = useSavedGroups()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [newGroupName, setNewGroupName] = useState('')
  const [openIds, setOpenIds] = useState<Set<string>>(new Set([UNGROUPED, SAVED]))
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const searching = query.trim().length > 0
  const visibleTabs = useMemo(() => tabs.filter((tab) => matchesQuery(tab, query)), [tabs, query])
  const ungrouped = visibleTabs.filter((tab) => tab.groupId === -1)
  const selectable = ungrouped.filter(groupable)
  const selectedVisible = selectable.filter((tab) => selected.has(tab.id!)).map((tab) => tab.id!)
  const duplicates = useMemo(() => findDuplicates(tabs), [tabs])
  const sitePlan = useMemo(() => planGroupBySite(tabs, groups), [tabs, groups])
  const visibleSaved = useMemo(() => saved.filter((g) => savedMatchesQuery(g, query)), [saved, query])
  const currentGroup = groups.find((g) => g.id === currentGroupId(tabs))

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
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  // While searching, every section with a match is open; otherwise the user decides.
  const isOpen = (id: string) => searching || openIds.has(id)
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const jumpTo = (id: string) => {
    setOpenIds((prev) => new Set(prev).add(id))
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
    if (typed) return
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

  const groupBySite = async () => {
    if (!sitePlan.length) return setToast({ message: t('groupBySiteNone') })
    const used = groups.map((g) => g.color as string)
    for (const plan of sitePlan) {
      if (plan.existingGroupId !== undefined) {
        await chrome.tabs.group({ tabIds: asTabIds(plan.tabIds), groupId: plan.existingGroupId })
      } else {
        const color = pickColor(used)
        used.push(color)
        const groupId = await chrome.tabs.group({ tabIds: asTabIds(plan.tabIds) })
        await chrome.tabGroups.update(groupId, { title: plan.site, color })
      }
    }
    const moved = sitePlan.flatMap((plan) => plan.tabIds)
    setToast({
      message: tn('groupedTabs', sitePlan.length),
      undo: () => chrome.tabs.ungroup(asTabIds(moved)).catch(() => {}),
    })
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
      // Without this, Esc closes the popup.
      e.preventDefault()
      setQuery('')
      searchRef.current?.focus()
    }
  }

  const secondaryLink =
    'underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-50 disabled:hover:no-underline disabled:hover:text-inherit dark:hover:text-white'

  const ungroupedToolbar = selectable.length > 0 && (
    <div className="mx-2 mb-2 space-y-2 rounded-md bg-slate-50 p-2 dark:bg-slate-800/60">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          aria-label={t('selectAll')}
          title={t('selectAll')}
          checked={selectedVisible.length === selectable.length}
          ref={(el) => {
            if (el) el.indeterminate = selectedVisible.length > 0 && selectedVisible.length < selectable.length
          }}
          onChange={() => setSelected(selectedVisible.length === selectable.length ? new Set() : new Set(selectable.map((tab) => tab.id!)))}
          className="h-3.5 w-3.5 shrink-0 accent-slate-900 dark:accent-slate-100"
        />
        <input
          type="text"
          placeholder={t('newGroupPlaceholder')}
          spellCheck={false}
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createGroup(selectedVisible.length ? selectedVisible : selectable.map((tab) => tab.id!))}
          className="min-w-0 flex-1 rounded bg-white px-2 py-1 text-xs ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:ring-slate-700"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={selectedVisible.length === 0}
          onClick={() => createGroup(selectedVisible)}
          className="flex-1 rounded bg-white py-1.5 text-[11px] font-semibold ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white dark:bg-slate-900 dark:ring-slate-700 dark:hover:bg-slate-800"
        >
          {t('groupSelected', selectedVisible.length)}
        </button>
      </div>
    </div>
  )

  const showUngrouped = ungrouped.length > 0 || (dragging && !searching)
  const visibleGroups = groups.filter((g) => !searching || visibleTabs.some((tab) => tab.groupId === g.id))

  return (
    <div onKeyDown={onKeyDown} className="flex min-h-[200px] flex-col">
      <header className="sticky top-0 z-20 space-y-2.5 bg-slate-50/90 px-3 pt-3 pb-2.5 backdrop-blur-md dark:bg-slate-950/90">
        <input
          ref={searchRef}
          type="search"
          placeholder={t('searchPlaceholder')}
          title={t('searchHint')}
          autoFocus
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg bg-white px-3 py-2.5 text-sm font-medium shadow-sm ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 dark:bg-slate-900 dark:ring-slate-700 dark:focus:ring-slate-300"
        />
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
          {currentGroup && selectable.length > 0 && (
            <button
              type="button"
              onClick={addToCurrentGroup}
              title={t('addToCurrentTitle')}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-semibold shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:ring-slate-700 dark:hover:bg-slate-800"
            >
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--group-${currentGroup.color})` }} />
              <span className="truncate">{t('addToCurrent', currentGroup.title || t('untitledGroup'))}</span>
            </button>
          )}
        </div>
        <div className="flex gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <button type="button" onClick={groupBySite} title={t('groupBySiteTitle')} className={secondaryLink}>
            {t('groupBySite')}
          </button>
          <button type="button" onClick={closeDuplicates} disabled={!duplicates.length} title={t('closeDuplicatesTitle')} className={secondaryLink}>
            {duplicates.length ? tn('closeDuplicates', duplicates.length) : t('noDuplicates')}
          </button>
        </div>
        {groups.length > 0 && (
          <nav className="no-scrollbar flex max-h-[68px] flex-wrap gap-1.5 overflow-y-auto">
            <NavPill title={t('ungrouped')} onClick={() => jumpTo(UNGROUPED)} onDropTab={(id) => moveTab(id, null)} />
            {groups.map((g) => (
              <NavPill
                key={g.id}
                title={g.title || t('untitledGroup')}
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
            toolbar={ungroupedToolbar}
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
            >
              {groupTabs.map((tab) => (
                <TabRow key={tab.id} tab={tab} query={query} />
              ))}
            </GroupSection>
          )
        })}

        {visibleSaved.length > 0 && (
          <SavedSection
            saved={visibleSaved}
            query={query}
            open={isOpen(SAVED)}
            onToggle={() => toggle(SAVED)}
            onOpenGroup={openSavedGroup}
            onDelete={deleteSavedGroup}
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
