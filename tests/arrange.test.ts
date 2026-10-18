import { describe, expect, it } from 'vitest'
import {
  arrangeInput,
  asksForColour,
  isEmptyPlan,
  parseArrangeAnswer,
  planArrangement,
  quotaRecord,
  remainingToday,
  resetTime,
} from '../src/lib/arrange'

const listed = [
  { id: 11, groupId: -1 },
  { id: 12, groupId: -1 },
  { id: 13, groupId: 5 },
  { id: 14, groupId: 7 },
]
const groups = [
  { id: 5, title: 'Work', color: 'blue' },
  { id: 7, title: 'Fun', color: 'pink' },
]

describe('planArrangement', () => {
  it('adds tabs to a group with the same name and makes new groups for other names', () => {
    const plan = planArrangement(
      {
        groups: [
          { name: 'work', tabs: [1, 3] },
          { name: 'Shopping', color: 'green', tabs: [2] },
        ],
        ungroup: [],
      },
      listed,
      groups,
      []
    )
    // Tab 3 is already in Work, so only tab 1 moves.
    expect(plan.steps).toEqual([
      { kind: 'join', groupId: 5, color: undefined, tabIds: [11] },
      { kind: 'new', title: 'Shopping', color: 'green', tabIds: [12] },
    ])
  })
  it('uses each tab once, skips bad numbers and unknown colours', () => {
    const plan = planArrangement(
      {
        groups: [
          { name: 'A', color: 'gold', tabs: [1, 1, 9, 0] },
          { name: 'B', tabs: [1, 2] },
        ],
        ungroup: [2],
      },
      listed,
      groups,
      []
    )
    expect(plan.steps).toEqual([
      { kind: 'new', title: 'A', color: undefined, tabIds: [11] },
      { kind: 'new', title: 'B', color: undefined, tabIds: [12] },
    ])
    expect(plan.ungroup).toEqual([])
  })
  it('ungroups only tabs that are in a group', () => {
    expect(planArrangement({ groups: [], ungroup: [1, 3, 4] }, listed, groups, []).ungroup).toEqual([13, 14])
  })
  it('recolours an unlocked group when asked, but never a locked one', () => {
    const red = { groups: [{ name: 'Fun', color: 'red', tabs: [] }], ungroup: [] }
    expect(planArrangement(red, listed, groups, [], true).steps).toEqual([{ kind: 'join', groupId: 7, color: 'red', tabIds: [] }])
    expect(isEmptyPlan(planArrangement(red, listed, groups, []))).toBe(true)
    expect(isEmptyPlan(planArrangement({ groups: [{ name: 'Fun', color: 'red', tabs: [4] }], ungroup: [] }, listed, groups, ['fun'], true))).toBe(
      true
    )
  })
  it('notice when the instruction is about colour', () => {
    expect(asksForColour('make Fun red')).toBe(true)
    expect(asksForColour('工作群組改成藍色')).toBe(true)
    expect(asksForColour('work tabs together')).toBe(false)
  })
  it('merges two answers for the same group', () => {
    const plan = planArrangement(
      {
        groups: [
          { name: 'Trip', tabs: [1] },
          { name: 'trip', tabs: [2] },
        ],
        ungroup: [],
      },
      listed,
      groups,
      []
    )
    expect(plan.steps).toEqual([{ kind: 'new', title: 'Trip', color: undefined, tabIds: [11, 12] }])
  })
})

describe('on-device answers', () => {
  it('list the groups, then number the tabs and show their current group', () => {
    expect(
      arrangeInput(
        'work apart',
        [
          { title: 'Inbox', site: 'mail.google.com', group: '' },
          { title: 'PR #4', site: 'github.com', group: 'Work' },
        ],
        ['Work', 'Trip', '', 'Work']
      )
    ).toBe('Instruction: work apart\n\nGroups now: "Work", "Trip"\n\nTabs:\n1. Inbox (mail.google.com)\n2. PR #4 (github.com) [Work]')
    expect(arrangeInput('x', [{ title: 'A', site: '', group: '' }], [])).toBe('Instruction: x\n\nThere are no groups yet.\n\nTabs:\n1. A')
  })
  it('are read back, or rejected when they are not JSON groups', () => {
    expect(parseArrangeAnswer('{"groups":[{"name":"“Trip”","color":"cyan","tabs":[1,"2",3]}],"ungroup":[4]}')).toEqual({
      groups: [{ name: 'Trip', color: 'cyan', tabs: [1, 3] }],
      ungroup: [4],
    })
    expect(parseArrangeAnswer('nope')).toBeNull()
    expect(parseArrangeAnswer('{"ungroup":[1]}')).toBeNull()
  })
})

describe('daily cloud uses', () => {
  const noon = Date.UTC(2026, 9, 18, 12)
  it('start at 3 and count down within the UTC day', () => {
    expect(remainingToday(undefined, noon)).toBe(3)
    expect(remainingToday(quotaRecord(1, noon), noon)).toBe(1)
    expect(remainingToday(quotaRecord(0, noon), noon + 11 * 3600_000)).toBe(0)
  })
  it('come back on the next UTC day', () => {
    expect(remainingToday(quotaRecord(0, noon), noon + 12 * 3600_000)).toBe(3)
  })
  it('reset at 00:00 UTC, shown in local time', () => {
    expect(resetTime(noon, 'en-GB')).toMatch(/^\d{2}:00$/)
  })
})
