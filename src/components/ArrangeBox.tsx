import { SparklesIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { MAX_INSTRUCTION } from '../lib/arrange'
import { t } from '../lib/i18n'

interface Props {
  /** Which AI will answer: Chrome's on-device model (no limit), the cloud (a few a day), or none turned on. */
  mode: 'local' | 'cloud' | 'none'
  /** Cloud uses left today. */
  remaining: number
  busy: boolean
  /** Resolves true when the tabs were grouped, so the box can be cleared. */
  onSubmit: (instruction: string) => Promise<boolean>
  onOpenSettings: () => void
}

/** "Tell Groupify how to group your tabs": one line of instruction for the AI. */
export default function ArrangeBox({ mode, remaining, busy, onSubmit, onOpenSettings }: Props) {
  const [text, setText] = useState('')

  if (mode === 'none') {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
      >
        <SparklesIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
        {t('arrangeNeedsAi')}
      </button>
    )
  }

  const outOfUses = mode === 'cloud' && remaining <= 0
  const submit = async () => {
    const instruction = text.trim()
    if (!instruction || busy || outOfUses) return
    if (await onSubmit(instruction)) setText('')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-center gap-1.5 rounded-md bg-white py-1 pr-1 pl-2.5 shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-slate-900 dark:bg-slate-900 dark:ring-slate-700 dark:focus-within:ring-slate-300"
    >
      <SparklesIcon aria-hidden className="h-3.5 w-3.5 shrink-0 text-violet-500" />
      <input
        type="text"
        value={text}
        maxLength={MAX_INSTRUCTION}
        spellCheck={false}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('arrangePlaceholder')}
        title={t('arrangeTitle')}
        aria-label={t('arrangeGo')}
        className="min-w-0 flex-1 bg-transparent py-1 text-xs font-medium outline-none placeholder:text-slate-400 disabled:opacity-60"
      />
      {mode === 'cloud' && (
        <span className="shrink-0 text-[10px] font-medium text-slate-400 tabular-nums">
          {outOfUses ? t('arrangeNoneLeft') : t('arrangeLeft', remaining)}
        </span>
      )}
      <button
        type="submit"
        disabled={busy || outOfUses || !text.trim()}
        title={t('arrangeGo')}
        aria-label={t('arrangeGo')}
        className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800"
      >
        ↵
      </button>
    </form>
  )
}
