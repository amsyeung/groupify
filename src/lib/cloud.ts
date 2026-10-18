// Groupify's shared AI proxy (server/ai-proxy), used only when the user turns on "Use cloud AI".
// Sends tab titles and hostnames, never full URLs, plus the instruction when grouping by
// instruction. Any failure returns null (or a failed result), so callers fall back.

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
const cloudTab = (tab: Tab) => ({ title: (tab.title ?? '').slice(0, 120), site: siteOf(tabUrl(tab)) })
export const cloudTabs = (tabs: Tab[]) => tabs.slice(0, 40).map(cloudTab)

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

// ---------------------------------------------------------------- group by instruction

/** Groupings by instruction the proxy allows per install per day (ARRANGE_PER_DAY in server/ai-proxy/wrangler.toml). */
export const ARRANGE_PER_DAY = 3
const CLIENT_KEY = 'clientId'

/**
 * A random id made once per install, so the proxy can count today's groupings by instruction.
 * It isn't tied to the user's Google account, and the proxy only keeps it hashed, for the day.
 */
export async function clientId(): Promise<string> {
  const stored = (await chrome.storage.local.get(CLIENT_KEY))[CLIENT_KEY]
  if (typeof stored === 'string' && stored) return stored
  const id = crypto.randomUUID()
  await chrome.storage.local.set({ [CLIENT_KEY]: id })
  return id
}

export interface ArrangeAnswer {
  groups: { name: string; color?: string; tabs: number[] }[]
  ungroup: number[]
}

export type CloudArrange = ({ ok: true; remaining?: number } & ArrangeAnswer) | { ok: false; error: 'daily_limit' | 'budget' | 'failed' }

/** Asks the proxy to group the tabs as the instruction says. Tab numbers in the answer are 1-based, in the order sent. */
export async function cloudArrange(instruction: string, tabs: (Tab & { group: string })[], locked: string[], locale: string): Promise<CloudArrange> {
  try {
    const res = await fetch(`${CLOUD_AI_URL}/v1/arrange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: instruction.slice(0, 200),
        tabs: tabs.slice(0, 60).map((tab) => ({ ...cloudTab(tab), group: tab.group })),
        locked,
        lang: cloudLang(locale),
        client: await clientId(),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS * 2),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: body?.error === 'daily_limit' || body?.error === 'budget' ? body.error : 'failed' }
    const groups = (Array.isArray(body?.groups) ? body.groups : [])
      .filter(
        (g: unknown): g is ArrangeAnswer['groups'][number] =>
          typeof (g as { name?: unknown })?.name === 'string' && Array.isArray((g as { tabs?: unknown })?.tabs)
      )
      .map((g: ArrangeAnswer['groups'][number]) => ({ ...g, name: stripBroken(g.name) }))
      .filter((g: ArrangeAnswer['groups'][number]) => g.name)
    const ungroup = Array.isArray(body?.ungroup) ? body.ungroup.filter((n: unknown): n is number => Number.isInteger(n)) : []
    return { ok: true, groups, ungroup, remaining: typeof body?.remaining === 'number' ? body.remaining : undefined }
  } catch {
    return { ok: false, error: 'failed' }
  }
}
