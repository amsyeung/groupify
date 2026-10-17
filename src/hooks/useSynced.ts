import { useCallback, useEffect, useState } from 'react'
import { parseRules, RULES_KEY, type SiteRule } from '../lib/rules'
import { LOCKS_KEY, parseLocks, parseSettings, SETTINGS_KEY, type Settings } from '../lib/settings'

/** A value in chrome.storage.sync, kept current when it changes anywhere (another page or computer). */
function useSyncedValue<T>(key: string, parse: (raw: unknown) => T): [T, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>(() => parse(undefined))

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) return
    chrome.storage.sync.get(key).then((items) => setValue(parse(items[key])))
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'sync' && key in changes) setValue(parse(changes[key].newValue))
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [key, parse])

  const save = useCallback(
    async (next: T) => {
      setValue(next)
      await chrome.storage.sync.set({ [key]: next })
    },
    [key]
  )
  return [value, save]
}

export const useSettings = (): [Settings, (value: Settings) => Promise<void>] => useSyncedValue(SETTINGS_KEY, parseSettings)

export const useRules = (): [SiteRule[], (value: SiteRule[]) => Promise<void>] => useSyncedValue(RULES_KEY, parseRules)

export const useLocks = (): [string[], (value: string[]) => Promise<void>] => useSyncedValue(LOCKS_KEY, parseLocks)

export async function readSettings(): Promise<Settings> {
  return parseSettings((await chrome.storage.sync.get(SETTINGS_KEY))[SETTINGS_KEY])
}
