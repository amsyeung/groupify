import { RECLASSIFY_MODES, type ReclassifyMode } from './classify'

/** Stored in chrome.storage.sync under SETTINGS_KEY, so they follow the user to other computers. */
export interface Settings {
  reclassifyMode: ReclassifyMode
  /** Use Chrome's on-device model to name groups and to sort by task. */
  useAi: boolean
  /** Keep recently closed groups so they can be reopened. */
  rememberClosed: boolean
  /** Send tab titles and hostnames to Groupify's shared AI proxy when the on-device model isn't available. */
  cloudAi: boolean
}

export const SETTINGS_KEY = 'settings'
export const LOCKS_KEY = 'lockedGroups'

/** chrome.storage.session keys written by the background worker: cleared when the browser closes. */
export const LIVE_KEY = 'liveGroups'
export const OPENED_KEY = 'openedAt'

export const DEFAULT_SETTINGS: Settings = { reclassifyMode: 'project', useAi: true, rememberClosed: true, cloudAi: false }

/** Fills in defaults for anything missing or invalid, e.g. settings written by an older version. */
export function parseSettings(raw: unknown): Settings {
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    reclassifyMode: RECLASSIFY_MODES.includes(value.reclassifyMode as ReclassifyMode)
      ? (value.reclassifyMode as ReclassifyMode)
      : DEFAULT_SETTINGS.reclassifyMode,
    useAi: typeof value.useAi === 'boolean' ? value.useAi : DEFAULT_SETTINGS.useAi,
    rememberClosed: typeof value.rememberClosed === 'boolean' ? value.rememberClosed : DEFAULT_SETTINGS.rememberClosed,
    cloudAi: typeof value.cloudAi === 'boolean' ? value.cloudAi : DEFAULT_SETTINGS.cloudAi,
  }
}

/** Locked groups are remembered by name: Chrome gives groups new ids when it restarts. */
export function parseLocks(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : []
}

export function toggleLock(locks: string[], title: string): string[] {
  const key = title.trim().toLowerCase()
  if (!key) return locks
  return locks.some((l) => l.trim().toLowerCase() === key) ? locks.filter((l) => l.trim().toLowerCase() !== key) : [...locks, title.trim()]
}

/** Keeps a lock when its group is renamed from Groupify. */
export function renameLock(locks: string[], from: string, to: string): string[] {
  const key = from.trim().toLowerCase()
  if (!key || !to.trim()) return locks
  return locks.map((l) => (l.trim().toLowerCase() === key ? to.trim() : l))
}
