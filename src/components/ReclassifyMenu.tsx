import { MODE_LABELS, RECLASSIFY_MODES, type ReclassifyMode } from '../lib/classify'
import { t } from '../lib/i18n'
import Menu from './Menu'

interface Props {
  defaultMode: ReclassifyMode
  busy: boolean
  onPick: (mode: ReclassifyMode) => void
  onTidy: () => void
}

/** "Reclassify ▾": choose how to sort every unlocked group and ungrouped tab. */
export default function ReclassifyMenu({ defaultMode, busy, onPick, onTidy }: Props) {
  return (
    <Menu
      label={busy ? t('reclassifying') : t('reclassify')}
      title={t('reclassifyTitle')}
      disabled={busy}
      className="flex-1"
      buttonClassName="w-full justify-center rounded-md bg-white px-3 py-2 text-xs font-semibold shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-60 dark:bg-slate-900 dark:ring-slate-700 dark:hover:bg-slate-800"
      align="right"
    >
      {(close) => [
        <button
          key="tidy"
          type="button"
          role="menuitem"
          onClick={() => {
            close()
            onTidy()
          }}
          className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span className="block text-xs font-semibold">{t('modeTidy')}</span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t('modeTidyDesc')}</span>
        </button>,
        <div key="sep" role="separator" className="my-1 border-t border-slate-100 dark:border-slate-800" />,
        ...RECLASSIFY_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            role="menuitem"
            onClick={() => {
              close()
              onPick(mode)
            }}
            className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span className="flex items-center gap-2 text-xs font-semibold">
              {t(MODE_LABELS[mode].label)}
              {mode === defaultMode && (
                <span className="rounded bg-slate-100 px-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {t('defaultMode')}
                </span>
              )}
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t(MODE_LABELS[mode].description)}</span>
          </button>
        )),
      ]}
    </Menu>
  )
}
