import { useCallback, useEffect, useState } from 'react'
import { findReplaced, fitsSyncItem, listSaved, SAVED_PREFIX, savedKey, snapshotGroup, type ListedGroup, type SavedGroup } from '../lib/saved'

async function loadSaved(): Promise<ListedGroup[]> {
  const [sync, local] = await Promise.all([chrome.storage.sync.get(null), chrome.storage.local.get(null)])
  return listSaved(sync, local)
}

/**
 * Stores a group in chrome.storage.sync, or in .local when it is too big for sync (or sync is full).
 * Returns the area it went to.
 */
async function writeSaved({ id, title, color, urls, savedAt }: SavedGroup): Promise<'sync' | 'local'> {
  // Only the stored fields: not the `area` a listed group carries, nor `closedAt` (writing here means keeping it).
  const group: SavedGroup = { id, title, color, urls, savedAt }
  const key = savedKey(id)
  if (fitsSyncItem(group)) {
    try {
      await chrome.storage.sync.set({ [key]: group })
      await chrome.storage.local.remove(key)
      return 'sync'
    } catch {
      // Over QUOTA_BYTES, MAX_ITEMS or the write rate limit: keep it on this device instead.
    }
  }
  await chrome.storage.local.set({ [key]: group })
  await chrome.storage.sync.remove(key)
  return 'local'
}

/** Saves a live tab group. Saving a group with the same name as a saved one replaces it. Returns null if it has no tab worth saving. */
export async function saveGroup(group: chrome.tabGroups.TabGroup): Promise<SavedGroup | null> {
  const tabs = await chrome.tabs.query({ groupId: group.id })
  const replaced = findReplaced(
    (await loadSaved()).filter((g) => g.closedAt === undefined),
    group.title ?? ''
  )
  const saved = snapshotGroup(group, tabs, replaced?.id ?? crypto.randomUUID())
  if (saved) await writeSaved(saved)
  return saved
}

export async function deleteSaved(group: SavedGroup): Promise<void> {
  const key = savedKey(group.id)
  await Promise.all([chrome.storage.sync.remove(key), chrome.storage.local.remove(key)])
}

/** Puts a deleted group back (for Undo), as it was: recently closed groups stay on this device. */
export const restoreDeleted = (group: SavedGroup) =>
  group.closedAt !== undefined ? chrome.storage.local.set({ [savedKey(group.id)]: stored(group) }) : writeSaved(group)

/** Moves a recently closed group to Saved, replacing a saved group with the same name. */
export async function keepClosed(group: SavedGroup): Promise<void> {
  const replaced = findReplaced(
    (await loadSaved()).filter((g) => g.closedAt === undefined),
    group.title
  )
  await chrome.storage.local.remove(savedKey(group.id))
  await writeSaved({ ...group, id: replaced?.id ?? group.id, savedAt: Date.now() })
}

const stored = ({ id, title, color, urls, savedAt, closedAt }: SavedGroup): SavedGroup => ({ id, title, color, urls, savedAt, closedAt })

/** Opens a saved group as a new tab group at the end of the current window, without leaving the panel. */
export async function openSaved(group: SavedGroup): Promise<number> {
  const { id: windowId } = await chrome.windows.getCurrent()
  const tabIds: number[] = []
  for (const url of group.urls) {
    // Some URLs can't be opened any more (e.g. an extension that was removed); skip those.
    const tab = await chrome.tabs.create({ windowId, url, active: false }).catch(() => undefined)
    if (tab?.id !== undefined) tabIds.push(tab.id)
  }
  if (!tabIds.length) return 0
  const groupId = await chrome.tabs.group({ tabIds: tabIds as [number, ...number[]], createProperties: { windowId } })
  await chrome.tabGroups.update(groupId, { title: group.title, color: group.color })
  return tabIds.length
}

/** Saved groups from both storage areas, kept current when they change (here or on another synced device). */
export function useSavedGroups(): ListedGroup[] {
  const [saved, setSaved] = useState<ListedGroup[]>([])

  const refresh = useCallback(() => {
    loadSaved().then(setSaved, () => setSaved([]))
  }, [])

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) return
    refresh()
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if ((area === 'sync' || area === 'local') && Object.keys(changes).some((key) => key.startsWith(SAVED_PREFIX))) refresh()
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [refresh])

  return saved
}
