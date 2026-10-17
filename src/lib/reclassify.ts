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
import { dateName, sessionName, suggestClusters, type AiChoice } from './naming'
import { parseRules, planTidy, RULES_KEY, splitByRules, type SiteRule } from './rules'
import { OPENED_KEY } from './settings'
import { pickColor } from './tabs'

type TabIds = [number, ...number[]]

export interface ReclassifyResult {
  groups: number
  /** True when "by task" had to fall back to opening times because the on-device model isn't available. */
  usedFallback: boolean
  undo: () => Promise<void>
}

async function planFor(mode: ReclassifyMode, tabs: chrome.tabs.Tab[], ai: AiChoice): Promise<{ buckets: Bucket[]; usedFallback: boolean }> {
  if (mode === 'category') return { buckets: planByCategory(tabs), usedFallback: false }
  if (mode === 'site') return { buckets: planBySite(tabs), usedFallback: false }
  if (mode === 'recency') return { buckets: planByRecency(tabs), usedFallback: false }

  const clusters = await suggestClusters(tabs, ai)
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
  ai: AiChoice,
  /** Called once the plan is ready and just before any tab moves, e.g. to save the layout for history. */
  beforeChange?: () => Promise<unknown>
): Promise<ReclassifyResult | null> {
  const movable = movableTabs(tabs, groups, locks)
  // Sites the user placed by hand go back to their group first; the chosen mode sorts the rest.
  const rules = parseRules((await chrome.storage.sync.get(RULES_KEY))[RULES_KEY])
  const { claimed, rest } = splitByRules(movable, rules)
  const planned = await planFor(mode, rest, ai)
  const usedFallback = planned.usedFallback
  const buckets = mergeRuleBuckets(planned.buckets, claimed, groups, movable)
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

  await beforeChange?.()
  const grouped = movable.filter((tab) => tab.groupId !== -1).map((tab) => tab.id!)
  if (grouped.length) await chrome.tabs.ungroup(grouped as TabIds)
  const used = groups.filter((g) => !before.some((b) => b.title === (g.title ?? '') && b.color === g.color)).map((g) => g.color as string)
  for (const bucket of buckets) {
    if (bucket.joinGroupId !== undefined) {
      // A locked group a rule points to: add the tabs, leave the group as it is.
      await chrome.tabs.group({ tabIds: bucket.tabIds as TabIds, groupId: bucket.joinGroupId })
      continue
    }
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

type RuleBucket = Bucket & { joinGroupId?: number }

/**
 * Adds the tabs claimed by site rules to the plan. A rule's group that stays (locked) gains the tabs;
 * otherwise its tabs form a group with that name, joining a planned group of the same name and keeping
 * the old group's colour when there was one.
 */
export function mergeRuleBuckets(
  buckets: Bucket[],
  claimed: Map<string, { title: string; tabIds: number[] }>,
  groups: { id: number; title?: string; color: string }[],
  movable: { groupId: number }[]
): RuleBucket[] {
  const result: RuleBucket[] = buckets.map((b) => ({ ...b, tabIds: [...b.tabIds] }))
  const dissolving = new Set(movable.map((tab) => tab.groupId))
  for (const [key, { title, tabIds }] of claimed) {
    const existing = groups.find((g) => (g.title ?? '').trim().toLowerCase() === key)
    if (existing && !dissolving.has(existing.id)) {
      result.push({ title, tabIds, joinGroupId: existing.id })
      continue
    }
    const same = result.find((b) => b.joinGroupId === undefined && (b.title ?? '').trim().toLowerCase() === key)
    if (same) same.tabIds.push(...tabIds)
    else result.push({ title, tabIds, color: existing?.color as Bucket['color'] })
  }
  return result
}

/**
 * "Only tidy new tabs": puts ungrouped tabs into the group they belong to (a site rule, else the one
 * group that already has that site). Returns null when no tab has a home; otherwise how many tabs
 * moved and the layout from before, for Undo.
 */
export async function tidyNewTabs(
  tabs: chrome.tabs.Tab[],
  groups: chrome.tabGroups.TabGroup[],
  beforeChange: () => Promise<import('./history').Snapshot>
): Promise<{ moved: number; snapshot: import('./history').Snapshot } | null> {
  const rules: SiteRule[] = parseRules((await chrome.storage.sync.get(RULES_KEY))[RULES_KEY])
  const targets = planTidy(tabs, groups, rules)
  if (!targets.length) return null
  const snapshot = await beforeChange()
  const used = groups.map((g) => g.color as string)
  for (const target of targets) {
    if (target.groupId !== undefined) {
      await chrome.tabs.group({ tabIds: target.tabIds as TabIds, groupId: target.groupId })
    } else {
      const color = pickColor(used)
      used.push(color)
      const groupId = await chrome.tabs.group({ tabIds: target.tabIds as TabIds })
      await chrome.tabGroups.update(groupId, { title: target.title, color })
    }
  }
  return { moved: targets.reduce((n, t) => n + t.tabIds.length, 0), snapshot }
}
