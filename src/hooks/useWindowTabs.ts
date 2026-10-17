import { useCallback, useEffect, useState } from 'react'

export interface WindowTabs {
  tabs: chrome.tabs.Tab[]
  groups: chrome.tabGroups.TabGroup[]
  refresh: () => Promise<void>
}

/** Tabs and tab groups of the panel's window, kept in sync with changes made anywhere in Chrome. */
export function useWindowTabs(): WindowTabs {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])
  const [groups, setGroups] = useState<chrome.tabGroups.TabGroup[]>([])

  const refresh = useCallback(async () => {
    const [currentTabs, currentGroups] = await Promise.all([
      chrome.tabs.query({ currentWindow: true }),
      chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT }),
    ])
    // Order groups as they appear in the tab bar.
    const firstIndex = new Map<number, number>()
    for (const tab of currentTabs) if (tab.groupId !== -1 && !firstIndex.has(tab.groupId)) firstIndex.set(tab.groupId, tab.index)
    currentGroups.sort((a, b) => (firstIndex.get(a.id) ?? 0) - (firstIndex.get(b.id) ?? 0))
    setTabs(currentTabs)
    setGroups(currentGroups)
  }, [])

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return
    // Tab events come in bursts (a page load fires several onUpdated), so refresh once per burst.
    let timer = setTimeout(refresh, 0)
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(refresh, 80)
    }
    const events = [
      chrome.tabs.onCreated,
      chrome.tabs.onRemoved,
      chrome.tabs.onUpdated,
      chrome.tabs.onMoved,
      chrome.tabs.onAttached,
      chrome.tabs.onDetached,
      chrome.tabGroups.onCreated,
      chrome.tabGroups.onUpdated,
      chrome.tabGroups.onRemoved,
      chrome.tabGroups.onMoved,
    ] as chrome.events.Event<() => void>[]
    events.forEach((e) => e.addListener(schedule))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => e.removeListener(schedule))
    }
  }, [refresh])

  return { tabs, groups, refresh }
}
