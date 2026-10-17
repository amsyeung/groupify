// Plans for "Reclassify": which tabs end up in which group. Pure, so it can be unit-tested; the
// AI-based project mode lives in naming.ts and only supplies clusters to `planFromClusters`.

import type { MessageKey } from './i18n'
import { groupable, siteOf, tabUrl, type GroupColor, type TabLike } from './tabs'

export const RECLASSIFY_MODES = ['project', 'category', 'site', 'recency'] as const
export type ReclassifyMode = (typeof RECLASSIFY_MODES)[number]

export const MODE_LABELS: Record<ReclassifyMode, { label: MessageKey; description: MessageKey }> = {
  project: { label: 'modeProject', description: 'modeProjectDesc' },
  category: { label: 'modeCategory', description: 'modeCategoryDesc' },
  site: { label: 'modeSite', description: 'modeSiteDesc' },
  recency: { label: 'modeRecency', description: 'modeRecencyDesc' },
}

/** One group to create. `title` is final text; `titleKey` is a message looked up by the caller. */
export interface Bucket {
  title?: string
  titleKey?: MessageKey
  color?: GroupColor
  tabIds: number[]
}

export interface GroupLike {
  id: number
  title?: string
}

const normalizeTitle = (title?: string) => (title ?? '').trim().toLowerCase()

export const isLocked = (group: GroupLike, locked: Iterable<string>) => {
  const title = normalizeTitle(group.title)
  return !!title && new Set([...locked].map(normalizeTitle)).has(title)
}

/** Tabs Reclassify may move: ungrouped or in an unlocked group, and not pinned. */
export function movableTabs<T extends TabLike>(tabs: T[], groups: GroupLike[], locked: Iterable<string>): T[] {
  const lockedIds = new Set(groups.filter((g) => isLocked(g, locked)).map((g) => g.id))
  return tabs.filter((tab) => groupable(tab) && !lockedIds.has(tab.groupId))
}

// ---------------------------------------------------------------- by purpose

interface Category {
  key: MessageKey
  color: GroupColor
  /** "example.com" matches it and its subdomains; "amazon.*" matches amazon under any TLD. */
  domains: string[]
}

/** Order matters: the first match wins, so specific Google and Microsoft hosts come before general ones. */
export const CATEGORIES: Category[] = [
  {
    key: 'catMail',
    color: 'green',
    domains: [
      'mail.google.com',
      'calendar.google.com',
      'meet.google.com',
      'outlook.live.com',
      'outlook.office.com',
      'outlook.office365.com',
      'teams.microsoft.com',
      'teams.live.com',
      'mail.yahoo.com',
      'proton.me',
      'zoom.us',
      'fastmail.com',
    ],
  },
  {
    key: 'catAi',
    color: 'purple',
    domains: [
      'chatgpt.com',
      'chat.openai.com',
      'platform.openai.com',
      'claude.ai',
      'console.anthropic.com',
      'gemini.google.com',
      'aistudio.google.com',
      'notebooklm.google.com',
      'perplexity.ai',
      'copilot.microsoft.com',
      'poe.com',
      'huggingface.co',
      'midjourney.com',
      'deepseek.com',
      'grok.com',
      'mistral.ai',
    ],
  },
  {
    key: 'catDocs',
    color: 'grey',
    domains: [
      'docs.google.com',
      'drive.google.com',
      'sheets.google.com',
      'slides.google.com',
      'notion.so',
      'notion.site',
      'notion.com',
      'dropbox.com',
      'onedrive.live.com',
      'office.com',
      'sharepoint.com',
      'evernote.com',
      'obsidian.md',
      'atlassian.net',
      'linear.app',
      'trello.com',
      'asana.com',
      'miro.com',
      'airtable.com',
      'coda.io',
      'clickup.com',
      'monday.com',
      'icloud.com',
    ],
  },
  {
    key: 'catDev',
    color: 'blue',
    domains: [
      'github.com',
      'github.io',
      'gitlab.com',
      'bitbucket.org',
      'stackoverflow.com',
      'stackexchange.com',
      'npmjs.com',
      'developer.mozilla.org',
      'developer.chrome.com',
      'developer.apple.com',
      'developer.android.com',
      'web.dev',
      'vercel.com',
      'netlify.com',
      'cloudflare.com',
      'supabase.com',
      'firebase.google.com',
      'console.cloud.google.com',
      'cloud.google.com',
      'aws.amazon.com',
      'portal.azure.com',
      'learn.microsoft.com',
      'docker.com',
      'codepen.io',
      'codesandbox.io',
      'stackblitz.com',
      'nextjs.org',
      'react.dev',
      'vuejs.org',
      'svelte.dev',
      'vite.dev',
      'vitejs.dev',
      'tailwindcss.com',
      'typescriptlang.org',
      'nodejs.org',
      'pnpm.io',
      'python.org',
      'pypi.org',
      'rust-lang.org',
      'go.dev',
      'localhost',
      '127.0.0.1',
    ],
  },
  {
    key: 'catDesign',
    color: 'pink',
    domains: [
      'figma.com',
      'pinterest.*',
      'dribbble.com',
      'behance.net',
      'canva.com',
      'unsplash.com',
      'pexels.com',
      'awwwards.com',
      'fonts.google.com',
      'coolors.co',
      'framer.com',
      'spline.design',
      'adobe.com',
      'mobbin.com',
      'are.na',
      'savee.it',
    ],
  },
  {
    key: 'catMedia',
    color: 'red',
    domains: [
      'youtube.com',
      'youtu.be',
      'netflix.com',
      'spotify.com',
      'twitch.tv',
      'vimeo.com',
      'bilibili.com',
      'disneyplus.com',
      'music.apple.com',
      'tv.apple.com',
      'soundcloud.com',
      'primevideo.com',
      'viu.com',
      'mytvsuper.com',
      'iq.com',
    ],
  },
  {
    key: 'catSocial',
    color: 'cyan',
    domains: [
      'x.com',
      'twitter.com',
      'facebook.com',
      'instagram.com',
      'threads.net',
      'threads.com',
      'reddit.com',
      'linkedin.com',
      'tiktok.com',
      'discord.com',
      'web.telegram.org',
      'web.whatsapp.com',
      'weibo.com',
      'xiaohongshu.com',
      'lihkg.com',
      'bsky.app',
      'mastodon.social',
      'messenger.com',
    ],
  },
  {
    key: 'catShopping',
    color: 'orange',
    domains: [
      'amazon.*',
      'ebay.*',
      'taobao.com',
      'tmall.com',
      'jd.com',
      'aliexpress.com',
      'shopee.*',
      'hktvmall.com',
      'etsy.com',
      'ikea.com',
      'uniqlo.com',
      'carousell.*',
      'rakuten.*',
      'temu.com',
      'shein.com',
      'zalora.*',
    ],
  },
  {
    key: 'catNews',
    color: 'yellow',
    domains: [
      'news.google.com',
      'bbc.com',
      'bbc.co.uk',
      'nytimes.com',
      'cnn.com',
      'theguardian.com',
      'reuters.com',
      'bloomberg.com',
      'wsj.com',
      'ft.com',
      'economist.com',
      'scmp.com',
      'hk01.com',
      'rthk.hk',
      'mingpao.com',
      'news.ycombinator.com',
      'theverge.com',
      'techcrunch.com',
      'arstechnica.com',
      'medium.com',
      'substack.com',
      'wikipedia.org',
    ],
  },
]

export function domainMatches(host: string, entry: string): boolean {
  if (entry.endsWith('.*')) return host.split('.').includes(entry.slice(0, -2))
  return host === entry || host.endsWith(`.${entry}`)
}

/** The purpose category of a URL, or undefined when it isn't a known site. */
export function categoryOf(url: string): Category | undefined {
  let host: string
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
  return CATEGORIES.find((c) => c.domains.some((d) => domainMatches(host, d)))
}

/** Groups tabs by purpose. Known purposes with one tab and unknown sites share an "Other" group (if two or more). */
export function planByCategory(tabs: TabLike[]): Bucket[] {
  const byKey = new Map<MessageKey, { category: Category; tabIds: number[] }>()
  const other: number[] = []
  for (const tab of tabs) {
    const category = categoryOf(tabUrl(tab))
    if (!category) other.push(tab.id!)
    else byKey.set(category.key, { category, tabIds: [...(byKey.get(category.key)?.tabIds ?? []), tab.id!] })
  }
  const buckets: Bucket[] = []
  for (const { category, tabIds } of byKey.values()) {
    if (tabIds.length >= 2) buckets.push({ titleKey: category.key, color: category.color, tabIds })
    else other.push(...tabIds)
  }
  buckets.sort((a, b) => CATEGORIES.findIndex((c) => c.key === a.titleKey) - CATEGORIES.findIndex((c) => c.key === b.titleKey))
  if (other.length >= 2) buckets.push({ titleKey: 'catOther', color: 'grey', tabIds: other })
  return buckets
}

// ---------------------------------------------------------------- by site

/** One group per site with two or more tabs, named after the site. */
export function planBySite(tabs: TabLike[]): Bucket[] {
  const bySite = new Map<string, number[]>()
  for (const tab of tabs) {
    const site = siteOf(tabUrl(tab))
    if (site) bySite.set(site, [...(bySite.get(site) ?? []), tab.id!])
  }
  return [...bySite.entries()]
    .filter(([, ids]) => ids.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([site, tabIds]) => ({ title: site, tabIds }))
}

// ---------------------------------------------------------------- by last use

const DAY_MS = 24 * 60 * 60 * 1000

/** Today / this week / older, by when each tab was last looked at. The active tab counts as now. */
export function planByRecency(tabs: TabLike[], now: number = Date.now()): Bucket[] {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const buckets: Bucket[] = [
    { titleKey: 'recToday', color: 'green', tabIds: [] },
    { titleKey: 'recWeek', color: 'yellow', tabIds: [] },
    { titleKey: 'recOlder', color: 'grey', tabIds: [] },
  ]
  for (const tab of tabs) {
    const used = tab.active ? now : (tab.lastAccessed ?? 0)
    const bucket = used >= startOfToday ? buckets[0] : used >= now - 7 * DAY_MS ? buckets[1] : buckets[2]
    bucket.tabIds.push(tab.id!)
  }
  return buckets.filter((b) => b.tabIds.length > 0)
}

// ---------------------------------------------------------------- by project, without AI

const SESSION_GAP_MS = 20 * 60 * 1000

/**
 * Without the on-device model, tabs belong to the same project when one was opened from another
 * (openerTabId), or when they were opened within 20 minutes of each other (`openedAt`, recorded by
 * the background worker). Returns clusters of two or more tabs.
 */
export function clusterWithoutAi(tabs: (TabLike & { openerTabId?: number })[], openedAt: Record<number, number>): number[][] {
  const ids = tabs.map((tab) => tab.id!)
  const parent = new Map(ids.map((id) => [id, id]))
  const find = (id: number): number => {
    while (parent.get(id) !== id) id = parent.get(id)!
    return id
  }
  const union = (a: number, b: number) => parent.set(find(a), find(b))

  for (const tab of tabs) if (tab.openerTabId !== undefined && parent.has(tab.openerTabId)) union(tab.id!, tab.openerTabId)
  const timed = ids.filter((id) => openedAt[id] !== undefined).sort((a, b) => openedAt[a] - openedAt[b])
  for (let i = 1; i < timed.length; i++) if (openedAt[timed[i]] - openedAt[timed[i - 1]] <= SESSION_GAP_MS) union(timed[i], timed[i - 1])

  const clusters = new Map<number, number[]>()
  for (const id of ids) clusters.set(find(id), [...(clusters.get(find(id)) ?? []), id])
  return [...clusters.values()].filter((c) => c.length >= 2)
}

/** The site of at least half the tabs, as a fallback name for a project group; '' when the tabs are mixed. */
export function dominantSite(tabs: TabLike[]): string {
  const counts = new Map<string, number>()
  for (const tab of tabs) {
    const site = siteOf(tabUrl(tab))
    if (site) counts.set(site, (counts.get(site) ?? 0) + 1)
  }
  const [site, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
  return count * 2 >= tabs.length ? site : ''
}

/** Validates clusters from the model: known tab ids only, each tab once, two or more tabs per group. */
export function planFromClusters(clusters: { name: string; tabIds: number[] }[], allowed: Iterable<number>): Bucket[] {
  const left = new Set(allowed)
  const buckets: Bucket[] = []
  for (const { name, tabIds } of clusters) {
    const ids = tabIds.filter((id) => left.has(id))
    if (ids.length < 2) continue
    ids.forEach((id) => left.delete(id))
    buckets.push({ title: name, tabIds: ids })
  }
  return buckets
}
