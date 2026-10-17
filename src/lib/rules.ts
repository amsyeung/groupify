// "Manual first": what the user decided by hand wins over automatic sorting.
// A site rule says "tabs from this site belong in the group with this name"; it is written when the
// user moves a tab into a named group themselves. Pure helpers here; storage in lib/manual.ts.

import { groupable, siteOf, tabUrl, type TabLike } from './tabs'

/** [site, group name]; newest first. Kept small: chrome.storage.sync allows 8 KB per item. */
export type SiteRule = [site: string, group: string]

export const RULES_KEY = 'siteRules'
export const MAX_RULES = 100

const norm = (s: string) => s.trim().toLowerCase()

export function parseRules(raw: unknown): SiteRule[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((r): r is SiteRule => Array.isArray(r) && typeof r[0] === 'string' && typeof r[1] === 'string' && !!r[0] && !!r[1].trim())
}

/** Records that `site` belongs in `group`, replacing any older rule for that site. */
export function setRule(rules: SiteRule[], site: string, group: string): SiteRule[] {
  if (!site || !group.trim()) return rules
  return [[site, group.trim()] as SiteRule, ...rules.filter(([s]) => s !== site)].slice(0, MAX_RULES)
}

export const removeRule = (rules: SiteRule[], site: string) => rules.filter(([s]) => s !== site)

/** Keeps rules pointing at a group when it is renamed. */
export function renameRuleGroup(rules: SiteRule[], from: string, to: string): SiteRule[] {
  if (!norm(from) || !to.trim()) return rules
  return rules.map(([s, g]) => (norm(g) === norm(from) ? ([s, to.trim()] as SiteRule) : ([s, g] as SiteRule)))
}

export const ruleFor = (rules: SiteRule[], site: string) => rules.find(([s]) => s === site)?.[1]

/**
 * Splits tabs into the ones a rule claims, by target group name, and the rest. Group names are
 * matched without case, and the name as written in the newest rule is kept.
 */
export function splitByRules<T extends TabLike>(
  tabs: T[],
  rules: SiteRule[]
): { claimed: Map<string, { title: string; tabIds: number[] }>; rest: T[] } {
  const claimed = new Map<string, { title: string; tabIds: number[] }>()
  const rest: T[] = []
  for (const tab of tabs) {
    const group = ruleFor(rules, siteOf(tabUrl(tab)))
    if (!group || tab.id === undefined) {
      rest.push(tab)
      continue
    }
    const key = norm(group)
    claimed.set(key, { title: claimed.get(key)?.title ?? group, tabIds: [...(claimed.get(key)?.tabIds ?? []), tab.id] })
  }
  return { claimed, rest }
}

export interface TidyTarget {
  /** An existing group to add to, or undefined to make a new group named `title`. */
  groupId?: number
  title: string
  tabIds: number[]
}

/**
 * "Only tidy new tabs": each ungrouped tab goes to the group a rule names, otherwise to the one
 * existing group that already has tabs from the same site. Tabs with no clear home stay put, and
 * no existing group is changed apart from gaining tabs.
 */
export function planTidy(tabs: TabLike[], groups: { id: number; title?: string }[], rules: SiteRule[]): TidyTarget[] {
  const byTitle = new Map(groups.filter((g) => g.title?.trim()).map((g) => [norm(g.title!), g]))
  const sitesByGroup = new Map<number, Set<string>>()
  for (const tab of tabs) {
    if (tab.groupId === -1) continue
    const site = siteOf(tabUrl(tab))
    if (site) sitesByGroup.set(tab.groupId, (sitesByGroup.get(tab.groupId) ?? new Set()).add(site))
  }

  const targets = new Map<string, TidyTarget>()
  const add = (key: string, target: Omit<TidyTarget, 'tabIds'>, tabId: number) => {
    const existing = targets.get(key)
    if (existing) existing.tabIds.push(tabId)
    else targets.set(key, { ...target, tabIds: [tabId] })
  }

  for (const tab of tabs) {
    if (tab.groupId !== -1 || !groupable(tab)) continue
    const site = siteOf(tabUrl(tab))
    if (!site) continue
    const ruled = ruleFor(rules, site)
    if (ruled) {
      const group = byTitle.get(norm(ruled))
      add(group ? `id:${group.id}` : `new:${norm(ruled)}`, { groupId: group?.id, title: group?.title ?? ruled }, tab.id!)
      continue
    }
    const homes = [...sitesByGroup.entries()].filter(([, sites]) => sites.has(site)).map(([id]) => id)
    if (homes.length === 1) {
      const group = groups.find((g) => g.id === homes[0])
      add(`id:${homes[0]}`, { groupId: homes[0], title: group?.title ?? '' }, tab.id!)
    }
  }
  return [...targets.values()]
}
