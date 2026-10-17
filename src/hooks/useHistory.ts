import { useCallback, useEffect, useState } from 'react'
import type { MessageKey } from '../lib/i18n'
import { parseHistory, planRestore, pushHistory, takeSnapshot, type Snapshot } from '../lib/history'

type TabIds = [number, ...number[]]

/** Session storage: kept while the browser is open (tab ids don't survive a restart anyway). */
const keyFor = (windowId: number) => `history:${windowId}`

async function currentWindowId(): Promise<number> {
  return (await chrome.windows.getCurrent()).id!
}

/** Saves the current layout of this window before a change, so it can be put back later. */
export async function recordHistory(label: MessageKey, detail?: string): Promise<Snapshot> {
  const windowId = await currentWindowId()
  const [tabs, groups] = await Promise.all([chrome.tabs.query({ windowId }), chrome.tabGroups.query({ windowId })])
  const key = keyFor(windowId)
  const history = parseHistory((await chrome.storage.session.get(key))[key])
  const snapshot = takeSnapshot(tabs, groups, label, detail)
  await chrome.storage.session.set({ [key]: pushHistory(history, snapshot) })
  return snapshot
}

/**
 * Puts the window's groups back the way a snapshot had them: every tab is ungrouped, then the
 * snapshot's groups are recreated with the tabs that are still open. The layout being replaced
 * is saved first, so a restore can itself be undone.
 */
export async function restoreSnapshot(snapshot: Snapshot): Promise<void> {
  await recordHistory('histRestore')
  const windowId = await currentWindowId()
  const tabs = await chrome.tabs.query({ windowId })
  const grouped = tabs.filter((tab) => tab.groupId !== -1).map((tab) => tab.id!)
  if (grouped.length) await chrome.tabs.ungroup(grouped as TabIds)
  for (const g of planRestore(
    snapshot,
    tabs.map((tab) => tab.id!)
  )) {
    const groupId = await chrome.tabs.group({ tabIds: g.tabIds as TabIds, createProperties: { windowId } })
    await chrome.tabGroups.update(groupId, { title: g.title, color: g.color as chrome.tabGroups.TabGroup['color'], collapsed: g.collapsed })
  }
}

/** This window's history, newest first, kept current as it changes. */
export function useHistory(): Snapshot[] {
  const [history, setHistory] = useState<Snapshot[]>([])
  const [key, setKey] = useState<string | null>(null)

  const load = useCallback(async (k: string) => setHistory(parseHistory((await chrome.storage.session.get(k))[k])), [])

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.session) return
    currentWindowId().then((id) => {
      const k = keyFor(id)
      setKey(k)
      load(k)
    })
  }, [load])

  useEffect(() => {
    if (!key) return
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'session' && key in changes) setHistory(parseHistory(changes[key].newValue))
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [key])

  return history
}
