import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, parseLocks, parseSettings, renameLock, toggleLock } from '../src/lib/settings'
import { MAX_CLOSED, planClosed, type SavedGroup } from '../src/lib/saved'

describe('settings', () => {
  it('fills in defaults for missing or invalid values', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({ reclassifyMode: 'nope', useAi: false })).toEqual({ ...DEFAULT_SETTINGS, useAi: false })
  })
  it('toggles and renames locks by name', () => {
    expect(toggleLock([], ' Work ')).toEqual(['Work'])
    expect(toggleLock(['Work'], 'work')).toEqual([])
    expect(toggleLock([], '  ')).toEqual([])
    expect(renameLock(['Work'], 'work', 'Client')).toEqual(['Client'])
    expect(parseLocks(['a', 1, ''])).toEqual(['a'])
  })
})

describe('recently closed groups', () => {
  const group = (title: string, closedAt?: number): SavedGroup => ({
    id: `${title}-${closedAt}`,
    title,
    color: 'blue',
    urls: ['https://a.com'],
    savedAt: closedAt ?? 0,
    closedAt,
  })
  it('replace an older closed group with the same name', () => {
    const { remove } = planClosed([group('Work', 1), group('Work')], group('work', 2))
    expect(remove).toEqual(['Work-1'])
  })
  it(`keep at most ${MAX_CLOSED}`, () => {
    const existing = Array.from({ length: MAX_CLOSED }, (_, i) => group(`g${i}`, i))
    const { remove } = planClosed(existing, group('new', 100))
    expect(remove).toEqual(['g0-0'])
  })
})
