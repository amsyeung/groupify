import en from '../../public/_locales/en/messages.json'

export type MessageKey = keyof typeof en

/**
 * Looks up a string from public/_locales. Messages take at most one substitution, written as
 * $VALUE$. Outside the extension (e.g. `pnpm dev`) it falls back to the English messages.
 */
export function t(key: MessageKey, value?: string | number): string {
  const subs = value === undefined ? [] : [String(value)]
  const fromChrome = typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n.getMessage(key, subs) : ''
  if (fromChrome) return fromChrome
  return en[key].message.replace(/\$VALUE\$/g, subs[0] ?? '')
}

type CountKey = 'closeDuplicates' | 'closedTabs' | 'reclassified' | 'tabCount' | 'ungroupedAll'

/** Chrome's i18n has no plurals, so each count message has a separate "…One" variant for 1. */
export const tn = (key: CountKey, count: number) => (count === 1 ? t(`${key}One`) : t(key, count))
