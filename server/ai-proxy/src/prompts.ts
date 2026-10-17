// Request parsing, prompts and answer parsing for the shared AI proxy. No Cloudflare APIs here, so
// the tests in tests/ai-proxy.test.ts can run it directly.

export const MAX_TABS = 40
const MAX_TITLE = 120
const MAX_SITE = 80
const MAX_NAME = 32

export type Lang = 'en' | 'zh-Hant' | 'zh-Hans'
export interface TabInput {
  title: string
  site: string
}
export interface ProxyRequest {
  tabs: TabInput[]
  lang: Lang
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
  }
}

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** Validates a request body: up to 40 tabs, each a title and a hostname (never a full URL). */
export function parseRequest(raw: string): ProxyRequest {
  let body: { tabs?: unknown; lang?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    throw new HttpError(400, 'bad_json', 'Body must be JSON')
  }
  const tabs = (Array.isArray(body.tabs) ? body.tabs : [])
    .slice(0, MAX_TABS)
    .map((tab) => ({ title: clean(tab?.title, MAX_TITLE), site: clean(tab?.site, MAX_SITE).toLowerCase() }))
    .filter((tab) => tab.title || tab.site)
  if (!tabs.length) throw new HttpError(400, 'no_tabs', 'tabs must list at least one { title, site }')
  const lang: Lang = body.lang === 'zh-Hant' || body.lang === 'zh-Hans' ? body.lang : 'en'
  return { tabs, lang }
}

const LANGUAGE: Record<Lang, string> = {
  en: 'English',
  'zh-Hant': 'Traditional Chinese (as used in Hong Kong and Taiwan)',
  'zh-Hans': 'Simplified Chinese',
}

const list = (tabs: TabInput[]) => tabs.map((tab, i) => `${i + 1}. ${tab.title || tab.site}${tab.site ? ` (${tab.site})` : ''}`).join('\n')

type Message = { role: 'system' | 'user'; content: string }

// "/no_think" turns off Qwen3's reasoning output, which would only cost neurons.
export function namePrompt({ tabs, lang }: ProxyRequest): Message[] {
  return [
    {
      role: 'system',
      content: `You name browser tab groups. The user opened these tabs for one task or project. Reply with JSON {"name": "..."}: a short name (1 to 3 words, or up to 6 Chinese characters) in ${LANGUAGE[lang]} for what they are working on. Name the task, not the websites, unless every tab is from the same site. /no_think`,
    },
    { role: 'user', content: list(tabs) },
  ]
}

export function clusterPrompt({ tabs, lang }: ProxyRequest): Message[] {
  return [
    {
      role: 'system',
      content: `You sort browser tabs into groups, one group per task or project the user is working on. Tabs from different websites belong together when they serve the same task, e.g. a moodboard, framework docs and a hosting dashboard for one new website. Reply with JSON {"groups": [{"name": "...", "tabs": [numbers]}]}. Names are short (1 to 3 words, or up to 6 Chinese characters) in ${LANGUAGE[lang]}. Every tab number appears in at most one group. Leave out tabs that fit no group. /no_think`,
    },
    { role: 'user', content: list(tabs) },
  ]
}

/** The first JSON object in the model's answer, skipping any <think> block or surrounding prose. */
export function extractJson(text: string): unknown {
  const body = text.replace(/<think>[\s\S]*?<\/think>/g, '')
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    return null
  }
}

export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/^["'“”「」『』\s]+|["'“”「」『』.。!！\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NAME)
    .trim()
}

export function parseName(answer: unknown): string {
  const json = typeof answer === 'string' ? extractJson(answer) : answer
  return cleanName((json as { name?: unknown } | null)?.name)
}

/** Groups of two or more valid, unused tab numbers (1-based, as in the prompt). */
export function parseClusters(answer: unknown, tabCount: number): { name: string; tabs: number[] }[] {
  const json = typeof answer === 'string' ? extractJson(answer) : answer
  const groups = (json as { groups?: unknown } | null)?.groups
  if (!Array.isArray(groups)) return []
  const used = new Set<number>()
  const out: { name: string; tabs: number[] }[] = []
  for (const group of groups) {
    const name = cleanName(group?.name)
    const tabs = (Array.isArray(group?.tabs) ? group.tabs : []).filter(
      (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= tabCount && !used.has(n as number)
    )
    const unique = [...new Set(tabs)]
    if (!name || unique.length < 2) continue
    unique.forEach((n) => used.add(n))
    out.push({ name, tabs: unique })
  }
  return out
}
