// Service worker: opens the side panel from the toolbar icon, remembers groups when they are
// closed, and notes when tabs were opened (for "Reclassify by task" without AI).

import { listSaved, planClosed, restorableUrl, savedKey, type SavedGroup } from './lib/saved'
import { isOwnChange, noteManualPlacement, noteRename } from './lib/manual'
import { LIVE_KEY, OPENED_KEY, parseSettings, SETTINGS_KEY } from './lib/settings'
import { GROUP_COLORS, siteOf, tabUrl, type GroupColor } from './lib/tabs'

interface LiveGroup {
  title: string
  color: string
  urls: string[]
  tabIds: number[]
}

async function readSession<T>(key: string, fallback: T): Promise<T> {
  return ((await chrome.storage.session.get(key))[key] as T | undefined) ?? fallback
}

const setup = () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
  scheduleSnapshot()
}
chrome.runtime.onInstalled.addListener(setup)
chrome.runtime.onStartup.addListener(setup)

// A copy of every open group, so a group can still be remembered after its tabs are gone.
let timer: ReturnType<typeof setTimeout> | undefined
function scheduleSnapshot() {
  clearTimeout(timer)
  timer = setTimeout(snapshot, 300)
}

async function snapshot() {
  const [groups, tabs] = await Promise.all([chrome.tabGroups.query({}), chrome.tabs.query({})])
  const live: Record<string, LiveGroup> = {}
  for (const group of groups) {
    const groupTabs = tabs.filter((tab) => tab.groupId === group.id).sort((a, b) => a.index - b.index)
    live[group.id] = {
      title: group.title ?? '',
      color: group.color,
      urls: groupTabs.map(tabUrl).filter(restorableUrl),
      tabIds: groupTabs.map((tab) => tab.id!).filter((id) => id !== undefined),
    }
  }
  await chrome.storage.session.set({ [LIVE_KEY]: live })
}

chrome.tabs.onCreated.addListener(async (tab) => {
  scheduleSnapshot()
  if (tab.id === undefined) return
  const opened = await readSession<Record<number, number>>(OPENED_KEY, {})
  await chrome.storage.session.set({ [OPENED_KEY]: { ...opened, [tab.id]: Date.now() } })
})

chrome.tabs.onRemoved.addListener(async (tabId) => {
  scheduleSnapshot()
  const opened = await readSession<Record<number, number>>(OPENED_KEY, {})
  if (!(tabId in opened)) return
  delete opened[tabId]
  await chrome.storage.session.set({ [OPENED_KEY]: opened })
})

chrome.tabs.onUpdated.addListener(async (_tabId, change, tab) => {
  if (change.url !== undefined || change.groupId !== undefined || change.title !== undefined) scheduleSnapshot()
  // A tab moved into a named group by the user (for example in Chrome's tab bar): remember its site there.
  if (change.groupId === undefined || change.groupId === -1 || (await isOwnChange())) return
  const group = await chrome.tabGroups.get(change.groupId).catch(() => null)
  if (group?.title?.trim()) await noteManualPlacement([siteOf(tabUrl(tab))], group.title)
})

// A group renamed by the user: rules and locks follow it, and its sites now belong to it.
chrome.tabGroups.onUpdated.addListener(async (group) => {
  const live = await readSession<Record<string, LiveGroup>>(LIVE_KEY, {})
  const before = live[group.id]?.title ?? ''
  const after = group.title ?? ''
  if (before === after || (await isOwnChange())) return
  const tabs = await chrome.tabs.query({ groupId: group.id })
  await noteRename(
    before,
    after,
    tabs.map((tab) => siteOf(tabUrl(tab)))
  )
})
for (const event of [chrome.tabs.onMoved, chrome.tabs.onAttached, chrome.tabs.onDetached, chrome.tabGroups.onCreated, chrome.tabGroups.onUpdated]) {
  ;(event as chrome.events.Event<() => void>).addListener(scheduleSnapshot)
}

chrome.tabGroups.onRemoved.addListener(async (group) => {
  const live = await readSession<Record<string, LiveGroup>>(LIVE_KEY, {})
  const last: LiveGroup | undefined = live[group.id]
  if (!last?.urls.length) return
  const settings = parseSettings((await chrome.storage.sync.get(SETTINGS_KEY))[SETTINGS_KEY])
  if (!settings.rememberClosed) return

  // Ungrouping and Reclassify remove groups too, but leave their tabs open: only remember groups whose tabs closed.
  const stillOpen = await Promise.all(
    last.tabIds.map((id) =>
      chrome.tabs.get(id).then(
        () => true,
        () => false
      )
    )
  )
  if (stillOpen.some(Boolean)) return

  const now = Date.now()
  const color: GroupColor = (GROUP_COLORS as readonly string[]).includes(last.color) ? (last.color as GroupColor) : 'grey'
  const closed: SavedGroup = { id: crypto.randomUUID(), title: last.title, color, urls: last.urls, savedAt: now, closedAt: now }
  const [sync, local] = await Promise.all([chrome.storage.sync.get(null), chrome.storage.local.get(null)])
  const { write, remove } = planClosed(listSaved(sync, local), closed)
  await chrome.storage.local.remove(remove.map(savedKey))
  await chrome.storage.local.set({ [savedKey(write.id)]: write })
})
