// Names for new groups: Chrome's on-device model suggests one from the tab titles; without it,
// the group is named after today's date. Nothing leaves the computer.

import { cloudClusters, cloudName } from './cloud'
import { siteOf, tabUrl, type TabLike } from './tabs'

const MAX_TABS = 15
const MAX_LENGTH = 32
const TIMEOUT_MS = 10_000
const CLUSTER_TIMEOUT_MS = 30_000

export const uiLanguage = () => (typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n.getUILanguage() : navigator.language)

/** "10月17日" in Chinese, "Oct 17" in English. */
export function dateName(date = new Date(), locale = uiLanguage()): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
}

/** "10月17日 下午3:05" in Chinese, "Oct 17, 3:05 PM" in English: names tabs opened together at that time. */
export function sessionName(time: number, locale = uiLanguage()): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(time)
}

/** The tabs as the model sees them: one "title (site)" per line. */
export function describeTabs(tabs: Pick<TabLike, 'title' | 'url' | 'pendingUrl'>[], max = MAX_TABS): string {
  return tabs
    .slice(0, max)
    .map((tab) => {
      const site = siteOf(tabUrl(tab))
      const title = (tab.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
      return `- ${title || site || 'Untitled'}${site ? ` (${site})` : ''}`
    })
    .join('\n')
}

/** Tidies what the model returned: no quotes or trailing punctuation, at most 32 characters. */
export function cleanName(raw: string): string {
  let name = raw.trim()
  try {
    const parsed = JSON.parse(name)
    if (typeof parsed?.name === 'string') name = parsed.name
  } catch {
    // Plain text is fine too.
  }
  name = name
    .split('\n')[0]
    .replace(/^["'“”「」『』\s]+|["'“”「」『』.。!！\s]+$/g, '')
    .replace(/\s+/g, ' ')
  if (name.length > MAX_LENGTH) name = name.slice(0, MAX_LENGTH).replace(/\s+\S*$/, '')
  return name
}

/** The Translator language for the UI language, or null when names should stay in English. */
export function translationTarget(locale: string): string | null {
  const lang = locale.toLowerCase()
  if (!lang.startsWith('zh')) return null
  return /^zh-(cn|sg|hans)/.test(lang) ? 'zh' : 'zh-Hant'
}

const SYSTEM_PROMPT = `You name browser tab groups. The user opened these tabs for one task or project.
Reply with a short name (1 to 3 words) for what they are working on, like "Portfolio redesign", "Japan trip" or "Next.js deploy".
Name the task, not the websites, unless every tab is from the same site.`

const ENGLISH = { expectedInputs: [{ type: 'text' as const, languages: ['en'] }], expectedOutputs: [{ type: 'text' as const, languages: ['en'] }] }

/** Runs one prompt on Chrome's on-device model, or returns null if the model isn't already on this computer. */
async function promptModel(system: string, input: string, schema: object, timeoutMs: number): Promise<string | null> {
  const model = globalThis.LanguageModel
  if (!model) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // Never download the model from here: it is several gigabytes.
    if ((await model.availability(ENGLISH)) !== 'available') return null
    const session = await model.create({ ...ENGLISH, initialPrompts: [{ role: 'system', content: system }], signal: controller.signal })
    try {
      return await session.prompt(input, { signal: controller.signal, responseConstraint: schema })
    } finally {
      session.destroy()
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Which AI may be asked: Chrome's on-device model first, then Groupify's cloud proxy if the user turned it on. */
export interface AiChoice {
  onDevice: boolean
  cloud: boolean
}

/** A name for a new group from the tab titles, or null when no AI is allowed or available. */
export async function suggestName(tabs: Pick<TabLike, 'title' | 'url' | 'pendingUrl'>[], ai: AiChoice): Promise<string | null> {
  const local = ai.onDevice ? await onDeviceName(tabs) : null
  if (local) return local
  return ai.cloud ? cloudName(tabs, uiLanguage()) : null
}

/** Tabs grouped by task, or null when no AI is allowed or available. */
export async function suggestClusters(
  tabs: (Pick<TabLike, 'title' | 'url' | 'pendingUrl'> & { id?: number })[],
  ai: AiChoice
): Promise<{ name: string; tabIds: number[] }[] | null> {
  const local = ai.onDevice ? await onDeviceClusters(tabs) : null
  if (local) return local
  if (!ai.cloud) return null
  const listed = tabs.slice(0, MAX_CLUSTER_TABS)
  const clusters = await cloudClusters(listed, uiLanguage())
  return clusters && clusters.map((c) => ({ name: c.name, tabIds: c.tabs.filter((n) => n >= 1 && n <= listed.length).map((n) => listed[n - 1].id!) }))
}

/** Asks the on-device model for a group name. Null when the model isn't available or anything goes wrong. */
async function onDeviceName(tabs: Pick<TabLike, 'title' | 'url' | 'pendingUrl'>[]): Promise<string | null> {
  if (!tabs.length) return null
  const result = await promptModel(
    SYSTEM_PROMPT,
    describeTabs(tabs),
    { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    TIMEOUT_MS
  )
  const name = result && cleanName(result)
  return name ? translateName(name) : null
}

const CLUSTER_PROMPT = `You sort browser tabs into groups, one group per task or project the user is working on.
Tabs from different websites belong together when they serve the same task, e.g. a moodboard, framework docs and a hosting dashboard for one new website.
Give each group a short name (1 to 3 words) for the task. Every tab number appears in at most one group. Leave out tabs that fit no group.`

const MAX_CLUSTER_TABS = 40

/** Numbered lines, so the model can refer to tabs by number. */
export function numberTabs(tabs: Pick<TabLike, 'title' | 'url' | 'pendingUrl'>[]): string {
  return describeTabs(tabs, MAX_CLUSTER_TABS)
    .split('\n')
    .map((line, i) => `${i + 1}. ${line.slice(2)}`)
    .join('\n')
}

/** Reads the model's {groups: [{name, tabs: [numbers]}]} answer back into tab ids. */
export function parseClusters(raw: string, tabIds: number[]): { name: string; tabIds: number[] }[] {
  try {
    const groups = JSON.parse(raw)?.groups
    if (!Array.isArray(groups)) return []
    return groups
      .filter((g) => typeof g?.name === 'string' && Array.isArray(g?.tabs))
      .map((g) => ({
        name: cleanName(g.name),
        tabIds: g.tabs
          .filter((n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= tabIds.length)
          .map((n: number) => tabIds[n - 1]),
      }))
      .filter((g) => g.name)
  } catch {
    return []
  }
}

/** Groups tabs by task with the on-device model. Null when the model isn't available. */
async function onDeviceClusters(
  tabs: (Pick<TabLike, 'title' | 'url' | 'pendingUrl'> & { id?: number })[]
): Promise<{ name: string; tabIds: number[] }[] | null> {
  const listed = tabs.slice(0, MAX_CLUSTER_TABS)
  const schema = {
    type: 'object',
    properties: {
      groups: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, tabs: { type: 'array', items: { type: 'integer' } } },
          required: ['name', 'tabs'],
        },
      },
    },
    required: ['groups'],
  }
  const result = await promptModel(CLUSTER_PROMPT, numberTabs(listed), schema, CLUSTER_TIMEOUT_MS)
  if (!result) return null
  const clusters = parseClusters(
    result,
    listed.map((tab) => tab.id!)
  )
  return Promise.all(clusters.map(async (c) => ({ ...c, name: await translateName(c.name) })))
}

/** The model only writes English (and a few other languages), so Chinese UIs get the name translated when possible. */
export async function translateName(name: string): Promise<string> {
  const target = translationTarget(uiLanguage())
  const api = globalThis.Translator
  if (!target || !api) return name
  try {
    if ((await api.availability({ sourceLanguage: 'en', targetLanguage: target })) !== 'available') return name
    const translator = await api.create({ sourceLanguage: 'en', targetLanguage: target })
    try {
      return cleanName(await translator.translate(name)) || name
    } finally {
      translator.destroy()
    }
  } catch {
    return name
  }
}

/** Whether Chrome's on-device model can be used here, for the settings page. */
export async function aiStatus(): Promise<'available' | 'downloadable' | 'unavailable'> {
  try {
    const status = await globalThis.LanguageModel?.availability(ENGLISH)
    if (status === 'available') return 'available'
    return status === 'downloadable' || status === 'downloading' ? 'downloadable' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

/**
 * Downloads Chrome's on-device model, reporting progress from 0 to 1. Only call this from a click:
 * Chrome needs a user gesture, and the model is several gigabytes. Resolves true once it's ready.
 */
export async function downloadModel(onProgress: (loaded: number) => void): Promise<boolean> {
  const model = globalThis.LanguageModel
  if (!model) return false
  try {
    const session = await model.create({
      ...ENGLISH,
      monitor: (m) => m.addEventListener('downloadprogress', (event) => onProgress(event.loaded)),
    })
    session.destroy()
    return true
  } catch {
    return false
  }
}
