// Names for new groups: Chrome's on-device model suggests one from the tab titles; without it,
// the group is named after today's date. Nothing leaves the computer.

import { siteOf, tabUrl, type TabLike } from './tabs'

const MAX_TABS = 15
const MAX_LENGTH = 32
const TIMEOUT_MS = 10_000

export const uiLanguage = () => (typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n.getUILanguage() : navigator.language)

/** "10月17日" in Chinese, "Oct 17" in English. */
export function dateName(date = new Date(), locale = uiLanguage()): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
}

/** The tabs as the model sees them: one "title (site)" per line. */
export function describeTabs(tabs: Pick<TabLike, 'title' | 'url' | 'pendingUrl'>[]): string {
  return tabs
    .slice(0, MAX_TABS)
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

/**
 * Asks Chrome's on-device model for a group name. Returns null when the model isn't already on
 * this computer (it is never downloaded from here), or when anything goes wrong.
 */
export async function suggestName(tabs: Pick<TabLike, 'title' | 'url' | 'pendingUrl'>[]): Promise<string | null> {
  const model = globalThis.LanguageModel
  if (!model || !tabs.length) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    if ((await model.availability(ENGLISH)) !== 'available') return null
    const session = await model.create({ ...ENGLISH, initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }], signal: controller.signal })
    try {
      const raw = await session.prompt(describeTabs(tabs), {
        signal: controller.signal,
        responseConstraint: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      })
      const name = cleanName(raw)
      return name ? await translateName(name, controller.signal) : null
    } finally {
      session.destroy()
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** The model only writes English (and a few other languages), so Chinese UIs get the name translated when possible. */
async function translateName(name: string, signal: AbortSignal): Promise<string> {
  const target = translationTarget(uiLanguage())
  const api = globalThis.Translator
  if (!target || !api) return name
  try {
    if ((await api.availability({ sourceLanguage: 'en', targetLanguage: target })) !== 'available') return name
    const translator = await api.create({ sourceLanguage: 'en', targetLanguage: target, signal })
    try {
      return cleanName(await translator.translate(name, { signal })) || name
    } finally {
      translator.destroy()
    }
  } catch {
    return name
  }
}
