// Group by instruction: the user says how they want their tabs grouped ("work tabs together,
// YouTube and shopping apart"), an AI turns that into groups, and Groupify applies them. Chrome's
// on-device model goes first (no limit); otherwise Groupify's cloud AI, a few times a day.

import { isLocked, movableTabs } from './classify'
import { ARRANGE_PER_DAY, cloudArrange, type ArrangeAnswer } from './cloud'
import type { Snapshot } from './history'
import { asGroupify } from './manual'
import { cleanName, promptModel, translateName, uiLanguage, type AiChoice } from './naming'
import { GROUP_COLORS, pickColor, siteOf, tabUrl, type GroupColor } from './tabs'

type TabIds = [number, ...number[]]

export const MAX_ARRANGE_TABS = 60
export const MAX_INSTRUCTION = 200

interface GroupLike {
  id: number
  title?: string
  color: string
}

export type ArrangeStep =
  { kind: 'join'; groupId: number; color?: GroupColor; tabIds: number[] } | { kind: 'new'; title: string; color?: GroupColor; tabIds: number[] }

export interface ArrangePlan {
  ungroup: number[]
  steps: ArrangeStep[]
}

const norm = (s: string) => s.trim().toLowerCase()

/** Models add colours nobody asked for, so groups that exist only change colour when the instruction talks about colour. */
export const asksForColour = (instruction: string) => /colou?r|gr[ae]y|blue|red|yellow|green|pink|purple|cyan|orange|顏色|颜色|色/i.test(instruction)

/**
 * Turns the model's answer (1-based numbers into `listed`) into changes for Chrome. A name that
 * matches a group in the window adds the tabs to it; any other name makes a new group. Tabs already
 * where the answer puts them are left out, so an answer that changes nothing gives an empty plan.
 */
export function planArrangement(
  answer: ArrangeAnswer,
  listed: { id: number; groupId: number }[],
  groups: GroupLike[],
  locks: Iterable<string>,
  recolorExisting = false
): ArrangePlan {
  const used = new Set<number>()
  const take = (numbers: number[]) => {
    const tabs: (typeof listed)[number][] = []
    for (const n of numbers) {
      if (!Number.isInteger(n) || n < 1 || n > listed.length || used.has(n)) continue
      used.add(n)
      tabs.push(listed[n - 1])
    }
    return tabs
  }

  const locked = [...locks]
  const byName = new Map(groups.filter((g) => g.title?.trim()).map((g) => [norm(g.title!), g]))
  const steps: ArrangeStep[] = []
  const merged = new Map<string, ArrangeStep>()
  for (const group of answer.groups) {
    const name = group.name.trim()
    if (!name) continue
    const color = GROUP_COLORS.includes(group.color as GroupColor) ? (group.color as GroupColor) : undefined
    const existing = byName.get(norm(name))
    const tabs = take(group.tabs).filter((tab) => !existing || tab.groupId !== existing.id)
    // Only an unlocked group gets the new colour; a locked group stays as the user made it.
    const recolor = recolorExisting && existing && color && color !== existing.color && !isLocked(existing, locked) ? color : undefined
    if (!tabs.length && !recolor) continue
    const key = existing ? `id:${existing.id}` : `new:${norm(name)}`
    const same = merged.get(key)
    if (same) {
      same.tabIds.push(...tabs.map((tab) => tab.id))
      continue
    }
    const step: ArrangeStep = existing
      ? { kind: 'join', groupId: existing.id, color: recolor, tabIds: tabs.map((tab) => tab.id) }
      : { kind: 'new', title: name, color, tabIds: tabs.map((tab) => tab.id) }
    if (step.kind === 'new' && !step.tabIds.length) continue
    merged.set(key, step)
    steps.push(step)
  }
  const ungroup = take(answer.ungroup)
    .filter((tab) => tab.groupId !== -1)
    .map((tab) => tab.id)
  return { ungroup, steps }
}

export const isEmptyPlan = (plan: ArrangePlan) => !plan.ungroup.length && !plan.steps.length

const ON_DEVICE_PROMPT = `You arrange browser tabs into tab groups the way the user asks. Each numbered tab shows its title, its site and, in [brackets], the group it is in now.
Only list the tabs the instruction is about: tabs you leave out stay where they are. To regroup everything, list every tab.
When a group that exists now fits, use its exact name to add tabs to it, instead of making a new group with a similar name. "ungroup" lists tabs to take out of their group.
"color" is one of ${GROUP_COLORS.join(', ')}; leave it empty unless the user asks for a colour.
New group names are short (1 to 3 words) unless the user gives a name. Each tab number appears at most once.`

const ON_DEVICE_SCHEMA = {
  type: 'object',
  properties: {
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, color: { type: 'string' }, tabs: { type: 'array', items: { type: 'integer' } } },
        required: ['name', 'tabs'],
      },
    },
    ungroup: { type: 'array', items: { type: 'integer' } },
  },
  required: ['groups'],
}

/** The instruction, the window's groups and the numbered tabs, for the on-device model. */
export function arrangeInput(instruction: string, listed: { title: string; site: string; group: string }[], groupNames: string[]): string {
  const lines = listed.map((tab, i) => `${i + 1}. ${tab.title || tab.site}${tab.site ? ` (${tab.site})` : ''}${tab.group ? ` [${tab.group}]` : ''}`)
  const names = [...new Set(groupNames.map((name) => name.trim()).filter(Boolean))]
  const groupsLine = names.length ? `Groups now: ${names.map((name) => `"${name}"`).join(', ')}` : 'There are no groups yet.'
  return `Instruction: ${instruction}\n\n${groupsLine}\n\nTabs:\n${lines.join('\n')}`
}

/** Reads the on-device model's JSON answer; null when it isn't usable. */
export function parseArrangeAnswer(raw: string): ArrangeAnswer | null {
  try {
    const json = JSON.parse(raw)
    if (!Array.isArray(json?.groups)) return null
    return {
      groups: json.groups
        .filter((g: unknown) => typeof (g as { name?: unknown })?.name === 'string' && Array.isArray((g as { tabs?: unknown })?.tabs))
        .map((g: { name: string; color?: unknown; tabs: unknown[] }) => ({
          name: cleanName(g.name),
          color: typeof g.color === 'string' ? g.color : undefined,
          tabs: g.tabs.filter((n): n is number => Number.isInteger(n)),
        })),
      ungroup: Array.isArray(json.ungroup) ? json.ungroup.filter((n: unknown): n is number => Number.isInteger(n)) : [],
    }
  } catch {
    return null
  }
}

async function onDeviceArrange(
  instruction: string,
  listed: { title: string; site: string; group: string }[],
  groupNames: string[]
): Promise<ArrangeAnswer | null> {
  const raw = await promptModel(ON_DEVICE_PROMPT, arrangeInput(instruction, listed, groupNames), ON_DEVICE_SCHEMA, 45_000)
  const answer = raw && parseArrangeAnswer(raw)
  if (!answer) return null
  // The on-device model writes English: translate new names for Chinese UIs, but keep names of groups that exist.
  const existing = new Set(groupNames.map(norm))
  const groups = await Promise.all(answer.groups.map(async (g) => (existing.has(norm(g.name)) ? g : { ...g, name: await translateName(g.name) })))
  return { ...answer, groups }
}

export type ArrangeOutcome =
  | { status: 'done'; snapshot: Snapshot; remaining?: number }
  | { status: 'nothing' | 'failed' | 'noAi' | 'daily_limit' | 'budget'; remaining?: number }

/** Asks an AI how to group the tabs as the instruction says, then applies it. Pinned tabs and locked groups' tabs aren't touched. */
export async function arrangeTabs(
  instruction: string,
  tabs: chrome.tabs.Tab[],
  groups: chrome.tabGroups.TabGroup[],
  locks: string[],
  ai: AiChoice,
  /** Called just before any tab moves, to save the layout for history. */
  beforeChange: () => Promise<Snapshot>
): Promise<ArrangeOutcome> {
  const text = instruction.replace(/\s+/g, ' ').trim().slice(0, MAX_INSTRUCTION)
  if (!text) return { status: 'nothing' }
  if (!ai.onDevice && !ai.cloud) return { status: 'noAi' }
  const movable = movableTabs(tabs, groups, locks).slice(0, MAX_ARRANGE_TABS)
  if (!movable.length) return { status: 'nothing' }
  const titleOf = (groupId: number) => groups.find((g) => g.id === groupId)?.title ?? ''
  const listed = movable.map((tab) => ({ ...tab, title: (tab.title ?? '').slice(0, 120), site: siteOf(tabUrl(tab)), group: titleOf(tab.groupId) }))
  const lockedNames = groups.filter((g) => isLocked(g, locks) && g.title?.trim()).map((g) => g.title!.trim())

  let answer = ai.onDevice
    ? await onDeviceArrange(
        text,
        listed,
        groups.map((g) => g.title ?? '')
      )
    : null
  let remaining: number | undefined
  if (!answer && ai.cloud) {
    const cloud = await cloudArrange(text, listed, lockedNames, uiLanguage())
    if (!cloud.ok) return { status: cloud.error, remaining: cloud.error === 'daily_limit' ? 0 : undefined }
    answer = cloud
    remaining = cloud.remaining
  }
  if (!answer) return { status: 'failed' }

  const plan = planArrangement(
    answer,
    listed.map((tab) => ({ id: tab.id!, groupId: tab.groupId })),
    groups,
    locks,
    asksForColour(text)
  )
  if (isEmptyPlan(plan)) return { status: answer.groups.length || answer.ungroup.length ? 'nothing' : 'failed', remaining }

  const snapshot = await beforeChange()
  await asGroupify(() => applyArrangement(plan, groups))
  return { status: 'done', snapshot, remaining }
}

async function applyArrangement(plan: ArrangePlan, groups: GroupLike[]): Promise<void> {
  if (plan.ungroup.length) await chrome.tabs.ungroup(plan.ungroup as TabIds)
  const used = groups.map((g) => g.color)
  for (const step of plan.steps) {
    if (step.kind === 'join') {
      if (step.tabIds.length) await chrome.tabs.group({ tabIds: step.tabIds as TabIds, groupId: step.groupId })
      if (step.color) await chrome.tabGroups.update(step.groupId, { color: step.color })
      continue
    }
    const color = step.color ?? pickColor(used)
    used.push(color)
    const groupId = await chrome.tabs.group({ tabIds: step.tabIds as TabIds })
    await chrome.tabGroups.update(groupId, { title: step.title, color })
  }
}

// ---------------------------------------------------------------- today's cloud uses

/** chrome.storage.local: how many cloud groupings by instruction are left, and for which UTC day. */
export const ARRANGE_QUOTA_KEY = 'arrangeQuota'

const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10)

/** Uses left today, from what the proxy last reported. A new UTC day starts again at the full allowance. */
export function remainingToday(raw: unknown, now: number = Date.now()): number {
  const value = raw as { day?: unknown; remaining?: unknown } | null
  if (value?.day !== utcDay(now) || typeof value.remaining !== 'number') return ARRANGE_PER_DAY
  return Math.max(0, Math.min(ARRANGE_PER_DAY, value.remaining))
}

export const quotaRecord = (remaining: number, now: number = Date.now()) => ({ day: utcDay(now), remaining })

/** When today's uses come back, in the user's own time: the next 00:00 UTC. */
export function resetTime(now: number = Date.now(), locale = uiLanguage()): string {
  const d = new Date(now)
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(next)
}
