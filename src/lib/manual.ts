// Telling Groupify's own changes apart from the user's, and recording what the user decided by
// hand. Used by the side panel and by the background worker (which sees changes made in Chrome's
// own tab bar).

import { parseRules, removeRule, renameRuleGroup, RULES_KEY, setRule } from './rules'
import { LOCKS_KEY, parseLocks, parseSettings, renameLock, SETTINGS_KEY } from './settings'

/** chrome.storage.session: until when tab and group changes are Groupify's own (ms since the epoch). */
export const OWN_CHANGES_KEY = 'ownChangesUntil'

/**
 * Runs a change Groupify makes itself, so the background worker doesn't mistake it for the user's.
 * The window stays open briefly afterwards because Chrome's events can arrive a little late.
 */
export async function asGroupify<T>(change: () => Promise<T>): Promise<T> {
  await chrome.storage.session.set({ [OWN_CHANGES_KEY]: Date.now() + 15_000 })
  try {
    return await change()
  } finally {
    await chrome.storage.session.set({ [OWN_CHANGES_KEY]: Date.now() + 1_000 })
  }
}

export async function isOwnChange(): Promise<boolean> {
  const until = (await chrome.storage.session.get(OWN_CHANGES_KEY))[OWN_CHANGES_KEY]
  return typeof until === 'number' && until > Date.now()
}

const addLock = (locks: string[], title: string) =>
  locks.some((l) => l.trim().toLowerCase() === title.trim().toLowerCase()) ? locks : [...locks, title.trim()]

/**
 * The user put tabs from these sites into the group named `title` by hand: remember the sites,
 * and lock the group if "Lock groups I make or change" is on.
 */
export async function noteManualPlacement(sites: string[], title: string): Promise<void> {
  if (!title.trim()) return
  const stored = await chrome.storage.sync.get([SETTINGS_KEY, LOCKS_KEY, RULES_KEY])
  let rules = parseRules(stored[RULES_KEY])
  for (const site of new Set(sites.filter(Boolean))) rules = setRule(rules, site, title)
  const update: Record<string, unknown> = { [RULES_KEY]: rules }
  if (parseSettings(stored[SETTINGS_KEY]).autoLock) update[LOCKS_KEY] = addLock(parseLocks(stored[LOCKS_KEY]), title)
  await chrome.storage.sync.set(update)
}

/** A group was renamed by hand: its rules and lock follow the new name, and a renamed group counts as the user's. */
export async function noteRename(from: string, to: string, sites: string[]): Promise<void> {
  const stored = await chrome.storage.sync.get([SETTINGS_KEY, LOCKS_KEY, RULES_KEY])
  let rules = renameRuleGroup(parseRules(stored[RULES_KEY]), from, to)
  let locks = renameLock(parseLocks(stored[LOCKS_KEY]), from, to)
  if (to.trim()) {
    for (const site of new Set(sites.filter(Boolean))) rules = setRule(rules, site, to)
    if (parseSettings(stored[SETTINGS_KEY]).autoLock) locks = addLock(locks, to)
  }
  await chrome.storage.sync.set({ [RULES_KEY]: rules, [LOCKS_KEY]: locks })
}

export async function forgetSite(site: string): Promise<void> {
  const rules = parseRules((await chrome.storage.sync.get(RULES_KEY))[RULES_KEY])
  await chrome.storage.sync.set({ [RULES_KEY]: removeRule(rules, site) })
}
