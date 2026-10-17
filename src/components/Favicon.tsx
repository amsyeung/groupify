import { useState } from 'react'

/** The tab's favicon, or its first letter when there is none or it fails to load. */
export default function Favicon({ src, label }: { src?: string; label: string }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken && !src.startsWith('chrome://')) {
    return <img src={src} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={() => setBroken(true)} />
  }
  return (
    <span
      aria-hidden
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-slate-200 text-[9px] font-bold text-slate-500 uppercase dark:bg-slate-700 dark:text-slate-300"
    >
      {label.trim().charAt(0) || '·'}
    </span>
  )
}
