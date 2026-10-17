import { useEffect, useState } from 'react'
import { useLocks, useRules, useSettings } from '../hooks/useSynced'
import { MODE_LABELS, RECLASSIFY_MODES } from '../lib/classify'
import { t } from '../lib/i18n'
import { aiStatus, downloadModel } from '../lib/naming'
import { removeRule } from '../lib/rules'
import { toggleLock } from '../lib/settings'

const PRIVACY_URL = 'https://groupify.aoricreative.com/privacy'
const FAQ_URL = 'https://github.com/amsyeung/groupify/blob/main/SUPPORT.md'
const SOURCE_URL = 'https://github.com/amsyeung/groupify'

type AiStatus = 'available' | 'downloadable' | 'unavailable'

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
  children,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-slate-900 dark:accent-slate-100"
      />
      <div className="min-w-0 space-y-1">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium">
          {label}
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        {children}
      </div>
    </div>
  )
}

const link = 'font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:decoration-blue-600 dark:text-blue-400'
const smallButton =
  'shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50 dark:ring-slate-700 dark:hover:bg-slate-800'

export default function Options() {
  const [settings, save] = useSettings()
  const [locks, setLocks] = useLocks()
  const [rules, setRules] = useRules()
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [downloadFailed, setDownloadFailed] = useState(false)
  const [shortcut, setShortcut] = useState<string | null>(null)

  useEffect(() => {
    document.title = t('optionsTitle')
    aiStatus().then(setStatus)
    chrome.commands?.getAll().then((commands) => setShortcut(commands.find((c) => c.name === '_execute_action')?.shortcut ?? ''))
  }, [])

  const download = async () => {
    setDownloadFailed(false)
    setProgress(0)
    const ok = await downloadModel(setProgress)
    setProgress(null)
    setDownloadFailed(!ok)
    setStatus(await aiStatus())
  }

  const card = 'space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800'
  const heading = 'text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400'
  const statusText = status === 'available' ? t('aiAvailable') : status === 'downloadable' ? t('aiDownloadable') : t('aiUnavailable')

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-10">
      <h1 className="flex items-center gap-3 text-xl font-semibold">
        <img src="icon48.png" alt="" className="h-8 w-8" />
        {t('optionsTitle')}
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('optAutoSave')}</p>

      <section className={card}>
        <h2 className={heading}>{t('optDefaultMode')}</h2>
        <div className="space-y-3">
          {RECLASSIFY_MODES.map((mode) => (
            <label key={mode} className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="mode"
                id={`mode-${mode}`}
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
        <h2 className={heading}>{t('optAiHeading')}</h2>
        <Toggle
          id="use-ai"
          label={t('optAiNaming')}
          description={t('optAiNamingDesc')}
          checked={settings.useAi}
          onChange={(useAi) => save({ ...settings, useAi })}
        >
          {status && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  status === 'available'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {t('optAiStatus', statusText)}
              </span>
              {status === 'downloadable' && (
                <button type="button" onClick={download} disabled={progress !== null} className={smallButton}>
                  {progress === null ? t('optDownloadModel') : t('optDownloading', Math.round(progress * 100))}
                </button>
              )}
            </div>
          )}
          {status === 'downloadable' && progress === null && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('optDownloadModelDesc')}</p>
          )}
          {downloadFailed && <p className="text-xs text-red-600 dark:text-red-400">{t('optDownloadFailed')}</p>}
        </Toggle>
        <Toggle
          id="cloud-ai"
          label={t('optCloudAi')}
          description={t('optCloudAiDesc')}
          checked={settings.cloudAi}
          onChange={(cloudAi) => save({ ...settings, cloudAi })}
        >
          <a href={PRIVACY_URL} target="_blank" rel="noopener" className={`text-xs ${link}`}>
            {t('privacyPolicy')}
          </a>
          {status !== 'available' && !settings.cloudAi && <p className="text-xs text-amber-700 dark:text-amber-400">{t('optCloudAiHint')}</p>}
        </Toggle>
      </section>

      <section className={card}>
        <h2 className={heading}>{t('optGroupsHeading')}</h2>
        <Toggle
          id="auto-lock"
          label={t('optAutoLock')}
          description={t('optAutoLockDesc')}
          checked={settings.autoLock}
          onChange={(autoLock) => save({ ...settings, autoLock })}
        />
        <Toggle
          id="remember-closed"
          label={t('optRememberClosed')}
          description={t('optRememberClosedDesc')}
          checked={settings.rememberClosed}
          onChange={(rememberClosed) => save({ ...settings, rememberClosed })}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('optLocked')}</p>
          {locks.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('optLockedNone')}</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {locks.map((name) => (
                <li key={name} className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pr-1 pl-2.5 text-xs dark:bg-slate-800">
                  <span aria-hidden>🔒</span>
                  <span>{name}</span>
                  <button
                    type="button"
                    onClick={() => setLocks(toggleLock(locks, name))}
                    title={t('unlockGroup')}
                    aria-label={`${t('unlockGroup')}: ${name}`}
                    className="rounded-full px-1.5 text-sm leading-none text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={card}>
        <div className="space-y-1">
          <h2 className={heading}>{t('optRules')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('optRulesDesc')}</p>
        </div>
        {rules.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('optRulesNone')}</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {rules.map(([site, group]) => (
                <li key={site} className="flex items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{site}</span>
                  <span aria-hidden className="text-slate-400">
                    →
                  </span>
                  <span className="min-w-0 flex-1 truncate">{group}</span>
                  <button type="button" onClick={() => setRules(removeRule(rules, site))} className={smallButton}>
                    {t('forgetRule')}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setRules([])} className={smallButton}>
              {t('forgetAllRules')}
            </button>
          </>
        )}
      </section>

      <section className={card}>
        <h2 className={heading}>{t('optShortcut')}</h2>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">{shortcut === null ? '' : shortcut ? t('optShortcutIs', shortcut) : t('optShortcutNone')}</p>
          <button type="button" onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })} className={smallButton}>
            {t('openShortcuts')}
          </button>
        </div>
      </section>

      <footer className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-slate-500 dark:text-slate-400">
        <span>Groupify {chrome.runtime?.getManifest?.().version}</span>
        <a href={FAQ_URL} target="_blank" rel="noopener" className={link}>
          {t('optFaq')}
        </a>
        <a href={PRIVACY_URL} target="_blank" rel="noopener" className={link}>
          {t('privacyPolicy')}
        </a>
        <a href={SOURCE_URL} target="_blank" rel="noopener" className={link}>
          {t('optSource')}
        </a>
      </footer>
    </main>
  )
}
