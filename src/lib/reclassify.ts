// Runs a Reclassify: works out the plan for the chosen mode, regroups the tabs, and returns a way
// to put everything back.

import {
  clusterWithoutAi,
  dominantSite,
  movableTabs,
  planByCategory,
  planByRecency,
  planBySite,
  planFromClusters,
  type Bucket,
  type ReclassifyMode,
} from './classify'
import { t } from './i18n'
import { dateName, sessionName, suggestClusters } from './naming'
import { OPENED_KEY } from './settings'
import { pickColor } from './tabs'

type TabIds = [number, ...number[]]

export interface ReclassifyResult {
  groups: number
  /** True when "by task" had to fall back to opening times because the on-device model isn't available. */
  usedFallback: boolean
  undo: () => Promise<void>
}

async function planFor(mode: ReclassifyMode, tabs: chrome.tabs.Tab[], useAi: boolean): Promise<{ buckets: Bucket[]; usedFallback: boolean }> {
  if (mode === 'category') return { buckets: planByCategory(tabs), usedFallback: false }
  if (mode === 'site') return { buckets: planBySite(tabs), usedFallback: false }
  if (mode === 'recency') return { buckets: planByRecency(tabs), usedFallback: false }

  const clusters = useAi ? await suggestClusters(tabs) : null
  if (clusters)
    return {
      buckets: planFromClusters(
        clusters,
        tabs.map((tab) => tab.id!)
      ),
      usedFallback: false,
    }
  const openedAt = ((await chrome.storage.session.get(OPENED_KEY))[OPENED_KEY] as Record<number, number> | undefined) ?? {}
  const buckets = clusterWithoutAi(tabs, openedAt).map((ids) => {
    const times = ids.map((id) => openedAt[id]).filter((time) => time !== undefined)
    const fallback = times.length ? sessionName(Math.min(...times)) : dateName()
    return { title: dominantSite(tabs.filter((tab) => ids.includes(tab.id!))) || fallback, tabIds: ids }
  })
  return { buckets, usedFallback: true }
}

/**
 * Regroups every tab that isn't pinned or in a locked group. Returns null when the plan has no group
 * to make, in which case nothing was changed.
 */
export async function reclassify(
  mode: ReclassifyMode,
  tabs: chrome.tabs.Tab[],
  groups: chrome.tabGroups.TabGroup[],
  locks: string[],
  useAi: boolean
): Promise<ReclassifyResult | null> {
  const movable = movableTabs(tabs, groups, locks)
  const { buckets, usedFallback } = await planFor(mode, movable, useAi)
  if (!buckets.length) return null

  // Remember the current layout for Undo.
  const before = groups
    .map((g) => ({
      title: g.title ?? '',
      color: g.color,
      collapsed: g.collapsed,
      tabIds: movable.filter((tab) => tab.groupId === g.id).map((tab) => tab.id!),
    }))
    .filter((g) => g.tabIds.length)
  const movableIds = movable.map((tab) => tab.id!)

  const grouped = movable.filter((tab) => tab.groupId !== -1).map((tab) => tab.id!)
  if (grouped.length) await chrome.tabs.ungroup(grouped as TabIds)
  const used = groups.filter((g) => !before.some((b) => b.title === (g.title ?? '') && b.color === g.color)).map((g) => g.color as string)
  for (const bucket of buckets) {
    const color = bucket.color ?? pickColor(used)
    used.push(color)
    const groupId = await chrome.tabs.group({ tabIds: bucket.tabIds as TabIds })
    await chrome.tabGroups.update(groupId, { title: bucket.title ?? (bucket.titleKey ? t(bucket.titleKey) : ''), color })
  }

  const undo = async () => {
    const open = (await chrome.tabs.query({})).map((tab) => tab.id)
    const still = movableIds.filter((id) => open.includes(id))
    if (still.length) await chrome.tabs.ungroup(still as TabIds)
    for (const g of before) {
      const ids = g.tabIds.filter((id) => open.includes(id))
      if (!ids.length) continue
      const groupId = await chrome.tabs.group({ tabIds: ids as TabIds })
      await chrome.tabGroups.update(groupId, { title: g.title, color: g.color, collapsed: g.collapsed })
    }
  }
  return { groups: buckets.length, usedFallback, undo }
}
