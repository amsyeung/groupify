import { useState } from 'react'
import { getDraggedTab, isTabDrag } from '../lib/drag'

interface Props {
  title: string
  color?: string
  onClick: () => void
  onDropTab: (tabId: number) => void
}

/** A shortcut to a group: click to scroll to it, or drop a tab on it to move the tab there. */
export default function NavPill({ title, color, onClick, onDropTab }: Props) {
  const [over, setOver] = useState(false)
  const accent = color ? `var(--group-${color})` : 'var(--color-slate-500)'

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(e) => {
        if (!isTabDrag(e)) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false)
        const tabId = getDraggedTab(e)
        if (tabId !== null) {
          e.preventDefault()
          onDropTab(tabId)
        }
      }}
      className={`max-w-[160px] truncate rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition select-none ${
        over ? 'scale-110 shadow-md' : 'hover:brightness-95'
      }`}
      style={{
        color: accent,
        backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
        boxShadow: over ? `0 0 0 2px ${accent}` : undefined,
      }}
    >
      {title}
    </button>
  )
}
