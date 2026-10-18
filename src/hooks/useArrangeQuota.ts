import { useEffect, useState } from 'react'
import { ARRANGE_QUOTA_KEY, quotaRecord, remainingToday } from '../lib/arrange'
import { ARRANGE_PER_DAY } from '../lib/cloud'

/** Cloud groupings by instruction left today, as the proxy last reported (chrome.storage.local). */
export function useArrangeQuota(): number {
  const [remaining, setRemaining] = useState(ARRANGE_PER_DAY)

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return
    chrome.storage.local.get(ARRANGE_QUOTA_KEY).then((items) => setRemaining(remainingToday(items[ARRANGE_QUOTA_KEY])))
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && ARRANGE_QUOTA_KEY in changes) setRemaining(remainingToday(changes[ARRANGE_QUOTA_KEY].newValue))
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  return remaining
}

export const saveArrangeQuota = (remaining: number) => chrome.storage.local.set({ [ARRANGE_QUOTA_KEY]: quotaRecord(remaining) })
