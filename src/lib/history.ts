// Multi-step undo: before each change Groupify makes, the window's group layout is saved, so any
// earlier layout can be put back. Pure helpers here; storage lives in hooks/useHistory.ts.

import type { MessageKey } from './i18n'

export interface SnapshotGroup {
  title: string
  color: string
  collapsed: boolean
  tabIds: number[]
}

export interface Snapshot {
  id: string
  /** Milliseconds since the epoch. */
  at: number
  /** What was about to happen, e.g. "Reclassify: by purpose". */
  label: MessageKey
  detail?: string
  groups: SnapshotGroup[]
}

export const MAX_HISTORY = 20

/** The layout of a window: every group with the ids of its tabs, in tab bar order. */
export function takeSnapshot(
  tabs: { id?: number; index: number; groupId: number }[],
  groups: { id: number; title?: string; color: string; collapsed: boolean }[],
  label: MessageKey,
  detail?: string,
  now: number = Date.now()
): Snapshot {
  const ordered = [...tabs].sort((a, b) => a.index - b.index)
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    at: now,
    label,
    detail,
    groups: groups
      .map((g) => ({
        title: g.title ?? '',
        color: g.color,
        collapsed: g.collapsed,
        tabIds: ordered.filter((tab) => tab.groupId === g.id && tab.id !== undefined).map((tab) => tab.id!),
      }))
      .filter((g) => g.tabIds.length > 0),
  }
}

/** Newest first, at most MAX_HISTORY entries. */
export const pushHistory = (history: Snapshot[], snapshot: Snapshot) => [snapshot, ...history].slice(0, MAX_HISTORY)

/** The groups to recreate from a snapshot, keeping only tabs that are still open. */
export function planRestore(snapshot: Snapshot, openTabIds: Iterable<number>): SnapshotGroup[] {
  const open = new Set(openTabIds)
  return snapshot.groups.map((g) => ({ ...g, tabIds: g.tabIds.filter((id) => open.has(id)) })).filter((g) => g.tabIds.length > 0)
}

export function parseHistory(raw: unknown): Snapshot[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (s): s is Snapshot => !!s && typeof s === 'object' && typeof s.id === 'string' && typeof s.at === 'number' && Array.isArray(s.groups)
  )
}
