import { describe, expect, it } from 'vitest'
import {
  categoryOf,
  clusterWithoutAi,
  dominantSite,
  domainMatches,
  isLocked,
  movableTabs,
  planByCategory,
  planByRecency,
  planBySite,
  planFromClusters,
} from '../src/lib/classify'
import type { TabLike } from '../src/lib/tabs'

let nextId = 1
const tab = (url: string, extra: Partial<TabLike & { openerTabId: number }> = {}) => ({
  id: nextId,
  index: nextId++,
  title: url,
  url,
  pinned: false,
  active: false,
  groupId: -1,
  ...extra,
})

describe('locks', () => {
  it('match group names ignoring case and spaces', () => {
    expect(isLocked({ id: 1, title: ' Work ' }, ['work'])).toBe(true)
    expect(isLocked({ id: 1, title: '' }, [''])).toBe(false)
  })
  it('keep locked groups and pinned tabs out of a reclassify', () => {
    const tabs = [
      tab('https://a.com', { groupId: 1 }),
      tab('https://b.com', { groupId: 2 }),
      tab('https://c.com'),
      tab('https://d.com', { pinned: true }),
    ]
    const moved = movableTabs(
      tabs,
      [
        { id: 1, title: 'Locked' },
        { id: 2, title: 'Free' },
      ],
      ['locked']
    )
    expect(moved.map((t) => t.url)).toEqual(['https://b.com', 'https://c.com'])
  })
})

describe('by purpose', () => {
  it('matches subdomains and any TLD for wildcard entries', () => {
    expect(domainMatches('gist.github.com', 'github.com')).toBe(true)
    expect(domainMatches('notgithub.com', 'github.com')).toBe(false)
    expect(domainMatches('www.amazon.co.jp', 'amazon.*')).toBe(true)
    expect(domainMatches('hk.pinterest.com', 'pinterest.*')).toBe(true)
  })
  it('puts Gmail under mail, not under a general Google category', () => {
    expect(categoryOf('https://mail.google.com/mail/u/0')?.key).toBe('catMail')
    expect(categoryOf('https://www.google.com/search?q=x')).toBeUndefined()
  })
  it('groups known purposes and collects the rest under Other', () => {
    const tabs = [
      tab('https://github.com/a'),
      tab('https://vercel.com/dash'),
      tab('https://www.pinterest.com/pin/1'),
      tab('https://dribbble.com/shots/2'),
      tab('https://www.youtube.com/watch?v=1'),
      tab('https://example.com'),
      tab('https://another.example.org'),
    ]
    const plan = planByCategory(tabs)
    expect(plan.map((b) => [b.titleKey, b.tabIds.length])).toEqual([
      ['catDev', 2],
      ['catDesign', 2],
      ['catOther', 3],
    ])
  })
})

describe('by site', () => {
  it('makes one group per site with two or more tabs', () => {
    const plan = planBySite([tab('https://github.com/a'), tab('https://www.github.com/b'), tab('https://x.com')])
    expect(plan).toEqual([{ title: 'github.com', tabIds: [expect.any(Number), expect.any(Number)] }])
  })
})

describe('by last use', () => {
  it('splits into today, this week and older', () => {
    const now = new Date(2026, 9, 17, 15, 0).getTime()
    const tabs = [
      tab('https://a.com', { lastAccessed: now - 60_000 }),
      tab('https://b.com', { lastAccessed: now - 3 * 86_400_000 }),
      tab('https://c.com', { lastAccessed: now - 30 * 86_400_000 }),
      tab('https://d.com', { active: true, lastAccessed: 0 }),
    ]
    expect(planByRecency(tabs, now).map((b) => [b.titleKey, b.tabIds.length])).toEqual([
      ['recToday', 2],
      ['recWeek', 1],
      ['recOlder', 1],
    ])
  })
})

describe('by task without AI', () => {
  it('joins tabs opened from each other or within 20 minutes', () => {
    const a = tab('https://pinterest.com')
    const b = tab('https://nextjs.org', { openerTabId: a.id })
    const c = tab('https://vercel.com')
    const d = tab('https://news.com')
    const e = tab('https://bbc.com')
    const t0 = 1_000_000_000
    const clusters = clusterWithoutAi([a, b, c, d, e], { [c.id]: t0, [d.id]: t0 + 60 * 60_000, [e.id]: t0 + 65 * 60_000 })
    expect(clusters.map((c) => c.sort())).toEqual([
      [a.id, b.id],
      [d.id, e.id],
    ])
  })
  it('names a cluster after its most common site', () => {
    expect(dominantSite([tab('https://nextjs.org/a'), tab('https://nextjs.org/b'), tab('https://vercel.com')])).toBe('nextjs.org')
    expect(dominantSite([tab('https://nextjs.org/a'), tab('https://vercel.com'), tab('https://pinterest.com')])).toBe('')
  })
})

describe('planFromClusters', () => {
  it('drops unknown or repeated tabs and groups of one', () => {
    expect(
      planFromClusters(
        [
          { name: 'New site', tabIds: [1, 2, 99] },
          { name: 'Again', tabIds: [2, 3] },
          { name: 'Pair', tabIds: [3, 4] },
        ],
        [1, 2, 3, 4]
      )
    ).toEqual([
      { title: 'New site', tabIds: [1, 2] },
      { title: 'Pair', tabIds: [3, 4] },
    ])
  })
})
