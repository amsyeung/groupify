import { describe, expect, it } from 'vitest'
import { cleanName, dateName, describeTabs, translationTarget } from '../src/lib/naming'

describe('dateName', () => {
  const date = new Date(2026, 9, 17)
  it('follows the UI language', () => {
    expect(dateName(date, 'zh-TW')).toBe('10月17日')
    expect(dateName(date, 'en-US')).toBe('Oct 17')
  })
})

describe('cleanName', () => {
  it('reads the JSON the model was asked for', () => {
    expect(cleanName('{"name": "Next.js deploy"}')).toBe('Next.js deploy')
  })
  it('strips quotes, punctuation and extra lines', () => {
    expect(cleanName('"Japan trip."\nBecause the tabs are about travel')).toBe('Japan trip')
    expect(cleanName('「新專案」')).toBe('新專案')
  })
  it('cuts long names at a word boundary', () => {
    const name = cleanName('A very long name that keeps going and going forever')
    expect(name.length).toBeLessThanOrEqual(32)
    expect(name.endsWith(' ')).toBe(false)
    expect('A very long name that keeps going and going forever'.startsWith(name)).toBe(true)
  })
})

describe('describeTabs', () => {
  it('lists title and site, at most 15 tabs', () => {
    const tabs = Array.from({ length: 20 }, (_, i) => ({ title: `Doc ${i}`, url: `https://www.nextjs.org/docs/${i}` }))
    const lines = describeTabs(tabs).split('\n')
    expect(lines).toHaveLength(15)
    expect(lines[0]).toBe('- Doc 0 (nextjs.org)')
  })
})

describe('translationTarget', () => {
  it('translates names for Chinese UIs only', () => {
    expect(translationTarget('zh-TW')).toBe('zh-Hant')
    expect(translationTarget('zh-HK')).toBe('zh-Hant')
    expect(translationTarget('zh-CN')).toBe('zh')
    expect(translationTarget('en-US')).toBeNull()
  })
})
