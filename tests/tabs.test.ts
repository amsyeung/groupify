import { describe, expect, it } from 'vitest'
import {
  currentGroupId,
  duplicateKey,
  findDuplicates,
  matchesOnlyUrl,
  matchesQuery,
  pickColor,
  planGroupBySite,
  siteOf,
  splitHighlight,
  type TabLike,
} from '../src/lib/tabs'

let nextId = 1
const tab = (url: string, extra: Partial<TabLike> = {}): TabLike => ({
  id: nextId,
  index: nextId++,
  title: url,
  url,
  pinned: false,
  active: false,
  groupId: -1,
  ...extra,
})

describe('siteOf', () => {
  it('drops www. and ignores non-web URLs', () => {
    expect(siteOf('https://www.github.com/a')).toBe('github.com')
    expect(siteOf('http://docs.github.com')).toBe('docs.github.com')
    expect(siteOf('chrome://newtab/')).toBe('')
    expect(siteOf('not a url')).toBe('')
  })
})

describe('search', () => {
  it('matches title or URL, case-insensitively', () => {
    const t = tab('https://example.com/Pricing', { title: 'Plans' })
    expect(matchesQuery(t, 'plans')).toBe(true)
    expect(matchesQuery(t, 'pricing')).toBe(true)
    expect(matchesQuery(t, 'nope')).toBe(false)
    expect(matchesQuery(t, '   ')).toBe(true)
    expect(matchesOnlyUrl(t, 'pricing')).toBe(true)
    expect(matchesOnlyUrl(t, 'plans')).toBe(false)
  })

  it('highlights regex characters literally instead of throwing', () => {
    expect(splitHighlight('a (b) c', '(b)')).toEqual(['a ', '(b)', ' c'])
    expect(splitHighlight('C++ and c++', 'c++')).toEqual(['', 'C++', ' and ', 'c++', ''])
    expect(splitHighlight('[x', '[')).toEqual(['', '[', 'x'])
  })

  it('marks every match, not every other one', () => {
    const parts = splitHighlight('aXaXa', 'a')
    expect(parts.filter((_, i) => i % 2 === 1)).toEqual(['a', 'a', 'a'])
  })
})

describe('pickColor', () => {
  it('prefers a colour no group uses', () => {
    const used = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan']
    expect(pickColor(used)).toBe('orange')
  })
  it('still returns a colour when all are used', () => {
    expect(pickColor(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'], () => 0)).toBe('grey')
  })
})

describe('planGroupBySite', () => {
  it('groups sites with two or more ungrouped tabs, skipping pinned and grouped tabs', () => {
    const tabs = [
      tab('https://github.com/a'),
      tab('https://www.github.com/b'),
      tab('https://github.com/c', { pinned: true }),
      tab('https://news.ycombinator.com'),
      tab('https://example.com/1', { groupId: 7 }),
      tab('https://example.com/2'),
      tab('chrome://settings'),
      tab('chrome://extensions'),
    ]
    const plan = planGroupBySite(tabs, [])
    expect(plan).toEqual([{ site: 'github.com', tabIds: [tabs[0].id, tabs[1].id], existingGroupId: undefined }])
  })

  it('adds a single tab to a group already named after its site', () => {
    const tabs = [tab('https://example.com/2')]
    expect(planGroupBySite(tabs, [{ id: 7, title: 'Example.com' }])).toEqual([{ site: 'example.com', tabIds: [tabs[0].id], existingGroupId: 7 }])
  })
})

describe('findDuplicates', () => {
  it('ignores the #fragment', () => {
    expect(duplicateKey('https://a.com/x#top')).toBe('https://a.com/x')
  })

  it('keeps the active tab, then a pinned one, then the leftmost', () => {
    const first = tab('https://a.com/')
    const active = tab('https://a.com/#s', { active: true })
    const third = tab('https://a.com/')
    const pinned = tab('https://b.com/', { pinned: true })
    const plainB = tab('https://b.com/')
    const unique = tab('https://c.com/')
    const blank1 = tab('')
    const blank2 = tab('')
    const closing = findDuplicates([first, active, third, plainB, pinned, unique, blank1, blank2])
    expect(closing.sort()).toEqual([first.id, third.id, plainB.id].sort())
  })
})

describe('currentGroupId', () => {
  it("uses the active tab's group", () => {
    expect(currentGroupId([tab('https://a.com', { groupId: 3, lastAccessed: 1 }), tab('https://b.com', { groupId: 5, active: true })])).toBe(5)
  })
  it('otherwise uses the most recently used grouped tab', () => {
    const tabs = [
      tab('https://a.com', { groupId: 3, lastAccessed: 10 }),
      tab('https://b.com', { groupId: 5, lastAccessed: 20 }),
      tab('https://c.com', { active: true, lastAccessed: 30 }),
    ]
    expect(currentGroupId(tabs)).toBe(5)
  })
  it('is null without groups', () => {
    expect(currentGroupId([tab('https://a.com', { active: true })])).toBeNull()
  })
})
