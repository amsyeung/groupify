import { describe, expect, it } from 'vitest'
import {
  findReplaced,
  fitsSyncItem,
  listSaved,
  restorableUrl,
  savedKey,
  savedMatchesQuery,
  snapshotGroup,
  SYNC_ITEM_QUOTA,
  type SavedGroup,
} from '../src/lib/saved'
import type { TabLike } from '../src/lib/tabs'

const tab = (url: string, index: number, extra: Partial<TabLike> = {}): TabLike => ({
  id: index + 1,
  index,
  title: url,
  url,
  pinned: false,
  active: false,
  groupId: 7,
  ...extra,
})

const saved = (id: string, extra: Partial<SavedGroup> = {}): SavedGroup => ({
  id,
  title: id,
  color: 'blue',
  urls: ['https://example.com/'],
  savedAt: 1,
  ...extra,
})

describe('restorableUrl', () => {
  it('skips blank pages and javascript: URLs', () => {
    expect(restorableUrl('https://example.com')).toBe(true)
    expect(restorableUrl('chrome://settings/')).toBe(true)
    expect(restorableUrl('')).toBe(false)
    expect(restorableUrl('about:blank')).toBe(false)
    expect(restorableUrl('JavaScript:alert(1)')).toBe(false)
  })
})

describe('snapshotGroup', () => {
  it('keeps title, color and URLs in tab order', () => {
    const tabs = [tab('https://b.com/', 4), tab('https://a.com/', 2), tab('', 3, { pendingUrl: 'https://loading.com/' })]
    expect(snapshotGroup({ title: 'Work', color: 'red' }, tabs, 'x', 123)).toEqual({
      id: 'x',
      title: 'Work',
      color: 'red',
      urls: ['https://a.com/', 'https://loading.com/', 'https://b.com/'],
      savedAt: 123,
    })
  })

  it('returns null when nothing can be reopened', () => {
    expect(snapshotGroup({ title: 'Empty', color: 'red' }, [tab('about:blank', 0)], 'x')).toBeNull()
  })

  it('falls back to grey for an unknown color and empty title for an untitled group', () => {
    const g = snapshotGroup({ color: 'magenta' }, [tab('https://a.com/', 0)], 'x')
    expect(g?.color).toBe('grey')
    expect(g?.title).toBe('')
  })
})

describe('fitsSyncItem', () => {
  it('compares key plus JSON size against the per-item sync quota', () => {
    expect(fitsSyncItem(saved('a'))).toBe(true)
    const big = saved('a', { urls: [`https://example.com/${'x'.repeat(SYNC_ITEM_QUOTA)}`] })
    expect(fitsSyncItem(big)).toBe(false)
  })
})

describe('findReplaced', () => {
  it('matches a non-empty title case-insensitively', () => {
    const list = [saved('1', { title: 'Work ' }), saved('2', { title: '' })]
    expect(findReplaced(list, 'work')?.id).toBe('1')
    expect(findReplaced(list, '')).toBeUndefined()
    expect(findReplaced(list, 'Home')).toBeUndefined()
  })
})

describe('listSaved', () => {
  it('merges both areas newest first, skips other keys and malformed items, and prefers sync', () => {
    const sync = {
      [savedKey('a')]: saved('a', { savedAt: 1 }),
      [savedKey('both')]: saved('both', { savedAt: 5, title: 'from sync' }),
      [savedKey('bad')]: { id: 'bad', urls: [] },
      otherSetting: true,
    }
    const local = {
      [savedKey('b')]: saved('b', { savedAt: 3 }),
      [savedKey('both')]: saved('both', { savedAt: 5, title: 'from local' }),
      [savedKey('c')]: saved('c', { color: 'magenta' as never }),
    }
    const list = listSaved(sync, local)
    expect(list.map((g) => [g.id, g.area])).toEqual([
      ['both', 'sync'],
      ['b', 'local'],
      ['a', 'sync'],
    ])
    expect(list[0].title).toBe('from sync')
  })
})

describe('savedMatchesQuery', () => {
  it('matches the title or any URL', () => {
    const g = saved('1', { title: 'Research', urls: ['https://arxiv.org/abs/1'] })
    expect(savedMatchesQuery(g, 'research')).toBe(true)
    expect(savedMatchesQuery(g, 'ARXIV')).toBe(true)
    expect(savedMatchesQuery(g, 'github')).toBe(false)
    expect(savedMatchesQuery(g, '  ')).toBe(true)
  })
})
