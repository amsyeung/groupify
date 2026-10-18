import { describe, expect, it } from 'vitest'
import { check, DEFAULT_LIMITS, readLimits, utcDay } from '../server/ai-proxy/src/budget'
import {
  arrangePrompt,
  clusterPrompt,
  extractJson,
  hasBrokenText,
  HttpError,
  namePrompt,
  neuronsFor,
  parseArrangement,
  parseArrangeRequest,
  parseClusters,
  parseName,
  parseRequest,
} from '../server/ai-proxy/src/prompts'
import { cloudLang, cloudTabs, stripBroken } from '../src/lib/cloud'

describe('proxy requests', () => {
  it('keep titles and hostnames only, at most 40 tabs', () => {
    const tabs = Array.from({ length: 50 }, (_, i) => ({ title: `  Doc   ${i} `, site: 'NextJS.org', url: 'https://secret' }))
    const req = parseRequest(JSON.stringify({ tabs, lang: 'zh-Hant' }))
    expect(req.tabs).toHaveLength(40)
    expect(req.tabs[0]).toEqual({ title: 'Doc 0', site: 'nextjs.org' })
    expect(req.lang).toBe('zh-Hant')
  })
  it('reject bodies without tabs', () => {
    expect(() => parseRequest('{"tabs":[]}')).toThrow(HttpError)
    expect(() => parseRequest('nope')).toThrow(HttpError)
  })
  it('ask for the UI language and turn off Qwen thinking', () => {
    const req = parseRequest(JSON.stringify({ tabs: [{ title: 'Pins', site: 'pinterest.com' }], lang: 'zh-Hant' }))
    expect(namePrompt(req)[0].content).toContain('Traditional Chinese')
    expect(clusterPrompt(req)[0].content).toContain('/no_think')
    expect(namePrompt(req)[1].content).toBe('1. Pins (pinterest.com)')
  })
})

describe('model answers', () => {
  it('find JSON after a think block or prose', () => {
    expect(extractJson('<think>hmm {"x":1}</think>Here: {"name": "新網站"} done')).toEqual({ name: '新網站' })
    expect(extractJson('no json')).toBeNull()
  })
  it('drop half-finished characters and spot answers worth retrying', () => {
    expect(parseName('{"name": "Next.js �專案"}')).toBe('Next.js 專案')
    expect(hasBrokenText({ response: 'Next.js �' })).toBe(true)
    expect(hasBrokenText('{"name":"網站開發"}')).toBe(false)
    expect(stripBroken('Next.js �專案')).toBe('Next.js 專案')
  })
  it('clean names', () => {
    expect(parseName('{"name": "「新專案」。"}')).toBe('新專案')
    expect(parseName({ name: 42 })).toBe('')
  })
  it('keep valid clusters of two or more unused tabs', () => {
    const answer =
      '{"groups":[{"name":"New site","tabs":[1,2,2,9]},{"name":"Dup","tabs":[2,3]},{"name":"Read","tabs":[3,4]},{"name":"","tabs":[5,6]}]}'
    expect(parseClusters(answer, 6)).toEqual([
      { name: 'New site', tabs: [1, 2] },
      { name: 'Read', tabs: [3, 4] },
    ])
  })
})

describe('extension side', () => {
  it('maps the UI language', () => {
    expect(cloudLang('zh-HK')).toBe('zh-Hant')
    expect(cloudLang('zh-CN')).toBe('zh-Hans')
    expect(cloudLang('en-GB')).toBe('en')
  })
  it('sends hostnames, not full addresses', () => {
    expect(cloudTabs([{ title: 'Dashboard', url: 'https://vercel.com/team/project?token=abc' }])).toEqual([
      { title: 'Dashboard', site: 'vercel.com' },
    ])
  })
})

const CLIENT = '0f8fad5b-d9cb-469f-a165-70867728950e'

describe('grouping by instruction', () => {
  it('needs an instruction and an install id, and keeps each tab’s current group', () => {
    const body = {
      instruction: '  work   apart ',
      client: CLIENT.toUpperCase(),
      tabs: [{ title: 'PR', site: 'GitHub.com', group: 'Work' }],
      locked: ['Trip', 3, ''],
    }
    expect(parseArrangeRequest(JSON.stringify(body))).toEqual({
      instruction: 'work apart',
      client: CLIENT,
      tabs: [{ title: 'PR', site: 'github.com', group: 'Work' }],
      locked: ['Trip'],
      lang: 'en',
    })
    expect(() => parseArrangeRequest(JSON.stringify({ ...body, instruction: ' ' }))).toThrow(HttpError)
    expect(() => parseArrangeRequest(JSON.stringify({ ...body, client: 'me' }))).toThrow(HttpError)
  })
  it('caps the instruction at 200 characters and 60 tabs', () => {
    const tabs = Array.from({ length: 70 }, (_, i) => ({ title: `T${i}`, site: 'a.com' }))
    const req = parseArrangeRequest(JSON.stringify({ instruction: 'x'.repeat(300), client: CLIENT, tabs }))
    expect(req.instruction).toHaveLength(200)
    expect(req.tabs).toHaveLength(60)
  })
  it('shows tabs with their group and names locked groups', () => {
    const req = parseArrangeRequest(
      JSON.stringify({
        instruction: '放入旅行',
        client: CLIENT,
        tabs: [{ title: 'Hotels', site: 'booking.com', group: '' }],
        locked: ['旅行'],
        lang: 'zh-Hant',
      })
    )
    const [system, user] = arrangePrompt(req)
    expect(system.content).toContain('Groups now: "旅行" (locked')
    expect(system.content).toContain('Traditional Chinese')
    expect(system.content).toContain('/no_think')
    expect(user.content).toBe('Instruction: 放入旅行\n\nTabs:\n1. Hotels (booking.com)')
  })
  it('read back only valid groups, colours and unused tab numbers', () => {
    const answer =
      '<think></think>{"groups":[{"name":"Work","color":"blue","tabs":[1,2,2,9]},{"name":"Solo","color":"gold","tabs":[2,3]},{"name":"","tabs":[4]}],"ungroup":[3,4]}'
    expect(parseArrangement(answer, 4)).toEqual({
      groups: [
        { name: 'Work', color: 'blue', tabs: [1, 2] },
        { name: 'Solo', tabs: [3] },
      ],
      ungroup: [4],
    })
    expect(parseArrangement('nonsense', 4)).toEqual({ groups: [], ungroup: [] })
  })
})

describe('daily limits', () => {
  const fresh = { spent: 0, arrangeSpent: 0, clientUses: 0, ipUses: 0 }
  it('allow 3 groupings by instruction per install and 10 per IP', () => {
    expect(check('arrange', { ...fresh, clientUses: 2 }, DEFAULT_LIMITS)).toEqual({ ok: true })
    expect(check('arrange', { ...fresh, clientUses: 3 }, DEFAULT_LIMITS)).toEqual({ ok: false, reason: 'daily_limit' })
    expect(check('arrange', { ...fresh, ipUses: 10 }, DEFAULT_LIMITS)).toEqual({ ok: false, reason: 'daily_limit' })
  })
  it('keep Groupify within its share of Neurons, leaving some for naming', () => {
    expect(check('arrange', { ...fresh, arrangeSpent: 1500, spent: 1500 }, DEFAULT_LIMITS)).toEqual({ ok: false, reason: 'budget' })
    expect(check('basic', { ...fresh, arrangeSpent: 1500, spent: 1500 }, DEFAULT_LIMITS)).toEqual({ ok: true })
    expect(check('basic', { ...fresh, spent: 2000 }, DEFAULT_LIMITS)).toEqual({ ok: false, reason: 'budget' })
  })
  it('come from the Worker’s vars, with defaults', () => {
    expect(readLimits({ DAILY_NEURONS: '1000', ARRANGE_PER_DAY: 'two' })).toEqual({ ...DEFAULT_LIMITS, dailyNeurons: 1000 })
  })
  it('count by UTC day', () => {
    expect(utcDay(Date.UTC(2026, 9, 18, 23, 59))).toBe('2026-10-18')
  })
  it('price calls from Workers AI’s token counts, or estimate them', () => {
    // 1,500 input + 300 output tokens on Qwen3 30B-A3B: about 16 Neurons.
    expect(neuronsFor({ prompt_tokens: 1500, completion_tokens: 300 }, 0, 0)).toBeCloseTo(16.08, 1)
    expect(neuronsFor(undefined, 3000, 300)).toBeCloseTo((1000 * 4625 + 100 * 30475) / 1e6, 5)
  })
})
