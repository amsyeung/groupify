import { describe, expect, it } from 'vitest'
import { clusterPrompt, extractJson, HttpError, namePrompt, parseClusters, parseName, parseRequest } from '../server/ai-proxy/src/prompts'
import { cloudLang, cloudTabs } from '../src/lib/cloud'

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
