// Pure helpers for saved tab groups. Nothing here calls the chrome API, so it can be unit-tested.
import { GROUP_COLORS, tabUrl, type GroupColor, type TabLike } from './tabs'

/** A tab group kept in chrome.storage so it can be reopened later. */
export interface SavedGroup {
  id: string
  title: string
  color: GroupColor
  urls: string[]
  /** Milliseconds since the epoch. */
  savedAt: number
  /** Set on groups remembered automatically when they were closed (listed under "Recently closed"). */
  closedAt?: number
}

export type StorageArea = 'sync' | 'local'

/** A saved group as listed in the panel, with the storage area it was found in. */
export interface ListedGroup extends SavedGroup {
  area: StorageArea
}

/** Each saved group is its own storage item, so one large group can't push the others over the sync quota. */
export const SAVED_PREFIX = 'saved:'
export const savedKey = (id: string) => `${SAVED_PREFIX}${id}`

/** chrome.storage.sync.QUOTA_BYTES_PER_ITEM, measured as key length + JSON length of the value. */
export const SYNC_ITEM_QUOTA = 8192

export const fitsSyncItem = (group: SavedGroup) => savedKey(group.id).length + JSON.stringify(group).length <= SYNC_ITEM_QUOTA

/** URLs a new tab can be opened with. chrome.tabs.create refuses javascript: URLs, and blank pages aren't worth keeping. */
export function restorableUrl(url: string): boolean {
  if (!url || url === 'about:blank') return false
  return !url.toLowerCase().startsWith('javascript:')
}

/** Turns a live group and its tabs into something to store. Returns null when no tab can be reopened. */
export function snapshotGroup(group: { title?: string; color: string }, tabs: TabLike[], id: string, now: number = Date.now()): SavedGroup | null {
  const urls = [...tabs]
    .sort((a, b) => a.index - b.index)
    .map(tabUrl)
    .filter(restorableUrl)
  if (!urls.length) return null
  const color = (GROUP_COLORS as readonly string[]).includes(group.color) ? (group.color as GroupColor) : 'grey'
  return { id, title: group.title ?? '', color, urls, savedAt: now }
}

/** The saved group a new save replaces: one with the same non-empty title, so saving "Work" again updates it. */
export function findReplaced(saved: SavedGroup[], title: string): SavedGroup | undefined {
  const t = title.trim().toLowerCase()
  if (!t) return undefined
  return saved.find((g) => g.title.trim().toLowerCase() === t)
}

function isSavedGroup(value: unknown): value is SavedGroup {
  if (!value || typeof value !== 'object') return false
  const g = value as Record<string, unknown>
  return (
    typeof g.id === 'string' &&
    typeof g.title === 'string' &&
    typeof g.color === 'string' &&
    (GROUP_COLORS as readonly string[]).includes(g.color) &&
    Array.isArray(g.urls) &&
    g.urls.length > 0 &&
    g.urls.every((u) => typeof u === 'string') &&
    typeof g.savedAt === 'number' &&
    (g.closedAt === undefined || typeof g.closedAt === 'number')
  )
}

/**
 * Reads saved groups out of everything in chrome.storage.sync and .local, newest first. Malformed
 * items are skipped. If the same id is in both areas (a move between areas that didn't finish), sync wins.
 */
export function listSaved(sync: Record<string, unknown>, local: Record<string, unknown>): ListedGroup[] {
  const byId = new Map<string, ListedGroup>()
  for (const [area, items] of [
    ['local', local],
    ['sync', sync],
  ] as const) {
    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith(SAVED_PREFIX) && isSavedGroup(value)) byId.set(value.id, { ...value, area })
    }
  }
  return [...byId.values()].sort((a, b) => b.savedAt - a.savedAt || a.title.localeCompare(b.title))
}

export function savedMatchesQuery(group: SavedGroup, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return group.title.toLowerCase().includes(q) || group.urls.some((u) => u.toLowerCase().includes(q))
}

/** How many recently closed groups are kept; older ones are dropped. */
export const MAX_CLOSED = 20

/**
 * What to change when a group is closed: the entry to write, and the ids of entries to remove
 * (an older closed entry with the same name, and anything beyond MAX_CLOSED).
 */
export function planClosed(existing: SavedGroup[], closed: SavedGroup): { write: SavedGroup; remove: string[] } {
  const title = closed.title.trim().toLowerCase()
  const previous = existing.filter((g) => g.closedAt !== undefined)
  const replaced = title ? previous.filter((g) => g.title.trim().toLowerCase() === title).map((g) => g.id) : []
  const kept = previous.filter((g) => !replaced.includes(g.id)).sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
  const overflow = kept.slice(MAX_CLOSED - 1).map((g) => g.id)
  return { write: closed, remove: [...replaced, ...overflow] }
}
