import { describe, expect, it } from 'vitest'
import { MAX_HISTORY, parseHistory, planRestore, pushHistory, takeSnapshot } from '../src/lib/history'

const tabs = [
  { id: 1, index: 2, groupId: 10 },
  { id: 2, index: 0, groupId: 10 },
  { id: 3, index: 1, groupId: -1 },
  { id: 4, index: 3, groupId: 20 },
]
const groups = [
  { id: 10, title: 'Client site', color: 'blue', collapsed: false },
  { id: 20, title: 'News', color: 'yellow', collapsed: true },
  { id: 30, title: 'Empty', color: 'red', collapsed: false },
]

describe('history', () => {
  it('saves each group with its tabs in tab bar order, skipping empty groups', () => {
    const s = takeSnapshot(tabs, groups, 'histReclassify', 'By purpose', 1000)
    expect(s.groups).toEqual([
      { title: 'Client site', color: 'blue', collapsed: false, tabIds: [2, 1] },
      { title: 'News', color: 'yellow', collapsed: true, tabIds: [4] },
    ])
    expect(s.label).toBe('histReclassify')
    expect(s.detail).toBe('By purpose')
  })

  it('keeps the newest entries first, up to the limit', () => {
    let h = [] as ReturnType<typeof takeSnapshot>[]
    for (let i = 0; i < MAX_HISTORY + 5; i++) h = pushHistory(h, takeSnapshot(tabs, groups, 'histMove', undefined, i))
    expect(h).toHaveLength(MAX_HISTORY)
    expect(h[0].at).toBe(MAX_HISTORY + 4)
  })

  it('restores only tabs that are still open, and drops groups left empty', () => {
    const s = takeSnapshot(tabs, groups, 'histUngroupAll')
    expect(planRestore(s, [1, 3])).toEqual([{ title: 'Client site', color: 'blue', collapsed: false, tabIds: [1] }])
  })

  it('ignores malformed stored entries', () => {
    expect(parseHistory([{ id: 'a', at: 1, groups: [] }, { nope: true }, null])).toHaveLength(1)
    expect(parseHistory('x')).toEqual([])
  })
})

describe('history labels', () => {
  it('join the action and its detail without a language-specific colon', async () => {
    const { historyLabel } = await import('../src/lib/history')
    const t = (k: string) => (k === 'histReclassify' ? 'Reclassify' : k)
    expect(historyLabel({ label: 'histReclassify', detail: 'By purpose' }, t as never)).toBe('Reclassify · By purpose')
    expect(historyLabel({ label: 'histReclassify' }, t as never)).toBe('Reclassify')
  })
})
