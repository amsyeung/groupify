import { useEffect, useState } from 'react'
import { useSettings } from '../hooks/useSynced'
import { MODE_LABELS, RECLASSIFY_MODES } from '../lib/classify'
import { t } from '../lib/i18n'
import { aiStatus } from '../lib/naming'

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-slate-900 dark:accent-slate-100"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </label>
  )
}

export default function Options() {
  const [settings, save] = useSettings()
  const [status, setStatus] = useState<'available' | 'downloadable' | 'unavailable' | null>(null)

  useEffect(() => {
    document.title = t('optionsTitle')
    aiStatus().then(setStatus)
  }, [])

  const card = 'space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800'
  const heading = 'text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400'

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-10">
      <h1 className="flex items-center gap-3 text-xl font-semibold">
        <img src="icon48.png" alt="" className="h-8 w-8" />
        {t('optionsTitle')}
      </h1>

      <section className={card}>
        <h2 className={heading}>{t('optDefaultMode')}</h2>
        <div className="space-y-3">
          {RECLASSIFY_MODES.map((mode) => (
            <label key={mode} className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="mode"
                checked={settings.reclassifyMode === mode}
                onChange={() => save({ ...settings, reclassifyMode: mode })}
                className="mt-0.5 h-4 w-4 shrink-0 accent-slate-900 dark:accent-slate-100"
              />
              <span>
                <span className="block text-sm font-medium">{t(MODE_LABELS[mode].label)}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{t(MODE_LABELS[mode].description)}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className={card}>
        <Toggle
          label={t('optAiNaming')}
          description={t('optAiNamingDesc')}
          checked={settings.useAi}
          onChange={(useAi) => save({ ...settings, useAi })}
        />
        {status && (
          <p className="pl-7 text-xs text-slate-500 dark:text-slate-400">
            {t('optAiStatus', t(status === 'available' ? 'aiAvailable' : status === 'downloadable' ? 'aiDownloadable' : 'aiUnavailable'))}
          </p>
        )}
        <Toggle
          label={t('optRememberClosed')}
          description={t('optRememberClosedDesc')}
          checked={settings.rememberClosed}
          onChange={(rememberClosed) => save({ ...settings, rememberClosed })}
        />
      </section>

      <section className={card}>
        <h2 className={heading}>{t('optShortcut')}</h2>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">{t('optShortcutDesc')}</p>
          <button
            type="button"
            onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
            className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ring-slate-200 hover:bg-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            {t('openShortcuts')}
          </button>
        </div>
      </section>
    </main>
  )
}
