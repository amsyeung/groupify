// Pure helpers for tab data. Nothing here calls the chrome API, so it can be unit-tested.

export const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'] as const
export type GroupColor = (typeof GROUP_COLORS)[number]

/** The subset of chrome.tabs.Tab these helpers read. */
export interface TabLike {
  id?: number
  index: number
  title?: string
  url?: string
  pendingUrl?: string
  pinned: boolean
  active: boolean
  groupId: number
}

export const tabUrl = (tab: TabLike) => tab.url || tab.pendingUrl || ''

/** "www.github.com" → "github.com"; '' for URLs without a web host (chrome://, file://, about:blank…). */
export function siteOf(url: string): string {
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'http:' && protocol !== 'https:') return ''
    return hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function matchesQuery(tab: TabLike, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (tab.title ?? '').toLowerCase().includes(q) || tabUrl(tab).toLowerCase().includes(q)
}

/** True when the query matches the URL but not the title, so the UI should show the URL to explain the match. */
export function matchesOnlyUrl(tab: TabLike, query: string): boolean {
  const q = query.trim().toLowerCase()
  return !!q && !(tab.title ?? '').toLowerCase().includes(q) && tabUrl(tab).toLowerCase().includes(q)
}

/** Splits text around case-insensitive matches of query. Odd indexes of the result are the matches. */
export function splitHighlight(text: string, query: string): string[] {
  const q = query.trim()
  if (!q) return [text]
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.split(new RegExp(`(${escaped})`, 'gi'))
}

/** A colour not used by any existing group, or a random one when all nine are taken. */
export function pickColor(used: Iterable<string>, random: () => number = Math.random): GroupColor {
  const taken = new Set(used)
  const free = GROUP_COLORS.filter((c) => !taken.has(c))
  const pool = free.length ? free : GROUP_COLORS
  return pool[Math.floor(random() * pool.length)]
}

/** Tabs that can be put in a group. Chrome doesn't allow pinned tabs in groups. */
export const groupable = (tab: TabLike) => !tab.pinned && tab.id !== undefined

export interface SitePlan {
  site: string
  tabIds: number[]
  /** An existing group already named after this site, to add the tabs to instead of making a new one. */
  existingGroupId?: number
}

/**
 * Plans "group by site": every site with at least `minTabs` ungrouped tabs gets a group named after it.
 * When a group with that exact name already exists, a single ungrouped tab is enough to join it.
 */
export function planGroupBySite(tabs: TabLike[], groups: { id: number; title?: string }[], minTabs = 2): SitePlan[] {
  const bySite = new Map<string, number[]>()
  for (const tab of tabs) {
    if (tab.groupId !== -1 || !groupable(tab)) continue
    const site = siteOf(tabUrl(tab))
    if (!site) continue
    bySite.set(site, [...(bySite.get(site) ?? []), tab.id!])
  }
  const groupByTitle = new Map(groups.filter((g) => g.title).map((g) => [g.title!.toLowerCase(), g.id]))
  const plans: SitePlan[] = []
  for (const [site, tabIds] of bySite) {
    const existingGroupId = groupByTitle.get(site)
    if (existingGroupId !== undefined || tabIds.length >= minTabs) plans.push({ site, tabIds, existingGroupId })
  }
  return plans.sort((a, b) => b.tabIds.length - a.tabIds.length || a.site.localeCompare(b.site))
}

/** The URL used to decide whether two tabs are the same page: everything but the #fragment. */
export function duplicateKey(url: string): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    u.hash = ''
    return u.href
  } catch {
    return url
  }
}

/**
 * Tab ids to close so each page stays open once. Within a set of duplicates the kept tab is
 * the active one, else a pinned one, else the leftmost.
 */
export function findDuplicates(tabs: TabLike[]): number[] {
  const byKey = new Map<string, TabLike[]>()
  for (const tab of tabs) {
    const key = duplicateKey(tabUrl(tab))
    if (!key || tab.id === undefined) continue
    byKey.set(key, [...(byKey.get(key) ?? []), tab])
  }
  const rank = (t: TabLike) => (t.active ? 0 : t.pinned ? 1 : 2)
  const close: number[] = []
  for (const set of byKey.values()) {
    if (set.length < 2) continue
    const [, ...rest] = [...set].sort((a, b) => rank(a) - rank(b) || a.index - b.index)
    close.push(...rest.map((t) => t.id!))
  }
  return close
}
