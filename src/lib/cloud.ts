// Groupify's shared AI proxy (server/ai-proxy), used only when the user turns on "Use cloud AI".
// Sends tab titles and hostnames, never full URLs. Any failure returns null, so callers fall back.

import { siteOf, tabUrl, type TabLike } from './tabs'

export const CLOUD_AI_URL = 'https://groupify-ai.amsyeung.workers.dev'
const TIMEOUT_MS = 15_000

type Tab = Pick<TabLike, 'title' | 'url' | 'pendingUrl'>

/** The proxy's language for the UI language. */
export function cloudLang(locale: string): 'en' | 'zh-Hant' | 'zh-Hans' {
  const lang = locale.toLowerCase()
  if (!lang.startsWith('zh')) return 'en'
  return /^zh-(cn|sg|hans)/.test(lang) ? 'zh-Hans' : 'zh-Hant'
}

/** What leaves the computer: each tab's title and hostname. */
export const cloudTabs = (tabs: Tab[]) => tabs.slice(0, 40).map((tab) => ({ title: (tab.title ?? '').slice(0, 120), site: siteOf(tabUrl(tab)) }))

/** Drops half-finished characters (U+FFFD, lone surrogates) that a model sometimes returns. */
export const stripBroken = (text: string) =>
  text
    .replace(/[\uFFFD\uD800-\uDFFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

async function post<T>(path: string, tabs: Tab[], locale: string): Promise<T | null> {
  if (!tabs.length) return null
  try {
    const res = await fetch(`${CLOUD_AI_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabs: cloudTabs(tabs), lang: cloudLang(locale) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

export async function cloudName(tabs: Tab[], locale: string): Promise<string | null> {
  const body = await post<{ name?: unknown }>('/v1/name', tabs, locale)
  const name = typeof body?.name === 'string' ? stripBroken(body.name) : ''
  return name || null
}

/** Clusters as 1-based tab numbers in the order the tabs were sent. */
export async function cloudClusters(tabs: Tab[], locale: string): Promise<{ name: string; tabs: number[] }[] | null> {
  const body = await post<{ groups?: unknown }>('/v1/cluster', tabs, locale)
  if (!Array.isArray(body?.groups)) return null
  return body.groups
    .filter((g): g is { name: string; tabs: number[] } => typeof g?.name === 'string' && Array.isArray(g?.tabs))
    .map((g) => ({ ...g, name: stripBroken(g.name) }))
    .filter((g) => g.name)
}
