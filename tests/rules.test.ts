import { describe, expect, it } from 'vitest'
import { MAX_RULES, parseRules, planTidy, removeRule, renameRuleGroup, setRule, splitByRules, type SiteRule } from '../src/lib/rules'
import { mergeRuleBuckets } from '../src/lib/reclassify'
import type { TabLike } from '../src/lib/tabs'

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

describe('site rules', () => {
  it('keep one rule per site, newest first, and a bounded list', () => {
    let rules: SiteRule[] = []
    rules = setRule(rules, 'amsyn.org', 'Me')
    rules = setRule(rules, 'vercel.com', 'Website')
    rules = setRule(rules, 'amsyn.org', 'Portfolio')
    expect(rules).toEqual([
      ['amsyn.org', 'Portfolio'],
      ['vercel.com', 'Website'],
    ])
    for (let i = 0; i < MAX_RULES + 10; i++) rules = setRule(rules, `s${i}.com`, 'X')
    expect(rules).toHaveLength(MAX_RULES)
  })
  it('follow a renamed group and can be forgotten', () => {
    const rules: SiteRule[] = [['amsyn.org', 'Me']]
    expect(renameRuleGroup(rules, 'me', 'About me')).toEqual([['amsyn.org', 'About me']])
    expect(removeRule(rules, 'amsyn.org')).toEqual([])
    expect(parseRules([['a.com', 'A'], ['b.com', ''], 'x'])).toEqual([['a.com', 'A']])
  })
  it('claim tabs by site before any automatic sorting', () => {
    const a = tab('https://amsyn.org/blog')
    const b = tab('https://github.com/x')
    const { claimed, rest } = splitByRules([a, b], [['amsyn.org', 'Me']])
    expect([...claimed.values()]).toEqual([{ title: 'Me', tabIds: [a.id] }])
    expect(rest).toEqual([b])
  })
})

describe('reclassify with rules', () => {
  const groups = [
    { id: 10, title: 'Me', color: 'purple' },
    { id: 20, title: 'Website', color: 'blue' },
  ]
  it('adds claimed tabs to a group that stays (locked)', () => {
    const plan = mergeRuleBuckets([{ titleKey: 'catDev', tabIds: [5] }], new Map([['me', { title: 'Me', tabIds: [1] }]]), groups, [{ groupId: 20 }])
    expect(plan).toContainEqual({ title: 'Me', tabIds: [1], joinGroupId: 10 })
  })
  it('rebuilds a dissolved group under its old name and color', () => {
    const plan = mergeRuleBuckets([], new Map([['me', { title: 'Me', tabIds: [1, 2] }]]), groups, [{ groupId: 10 }])
    expect(plan).toEqual([{ title: 'Me', tabIds: [1, 2], color: 'purple' }])
  })
  it('joins a planned group with the same name', () => {
    const plan = mergeRuleBuckets([{ title: 'github.com', tabIds: [7] }], new Map([['github.com', { title: 'github.com', tabIds: [8] }]]), [], [])
    expect(plan).toEqual([{ title: 'github.com', tabIds: [7, 8] }])
  })
})

describe('only tidy new tabs', () => {
  it('uses a rule first, then the one group that already has the site, and leaves the rest', () => {
    const inMe = tab('https://amsyn.org/', { groupId: 10 })
    const inWeb = tab('https://vercel.com/', { groupId: 20 })
    const newBlog = tab('https://amsyn.org/blog')
    const newDash = tab('https://vercel.com/dash')
    const newNews = tab('https://bbc.com/')
    const ruled = tab('https://notion.so/page')
    const targets = planTidy(
      [inMe, inWeb, newBlog, newDash, newNews, ruled],
      [
        { id: 10, title: 'Me' },
        { id: 20, title: 'Website' },
      ],
      [['notion.so', 'Notes']]
    )
    expect(targets).toEqual([
      { groupId: 10, title: 'Me', tabIds: [newBlog.id] },
      { groupId: 20, title: 'Website', tabIds: [newDash.id] },
      { groupId: undefined, title: 'Notes', tabIds: [ruled.id] },
    ])
  })
  it("doesn't guess when two groups have the site", () => {
    const a = tab('https://github.com/a', { groupId: 1 })
    const b = tab('https://github.com/b', { groupId: 2 })
    const c = tab('https://github.com/c')
    expect(
      planTidy(
        [a, b, c],
        [
          { id: 1, title: 'A' },
          { id: 2, title: 'B' },
        ],
        []
      )
    ).toEqual([])
  })
})
