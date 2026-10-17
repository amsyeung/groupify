import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  label: ReactNode
  title: string
  disabled?: boolean
  align?: 'left' | 'right'
  className?: string
  buttonClassName: string
  children: (close: () => void) => ReactNode
}

/** A button with a dropdown that closes on Esc, on a click outside, or when an item calls close(). */
export default function Menu({ label, title, disabled, align = 'left', className = '', buttonClassName, children }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        title={title}
        // Text labels name the button themselves; an icon-only label (like ⋯) needs the title read out.
        aria-label={typeof label === 'string' && label.length <= 1 ? title : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 ${buttonClassName}`}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute top-full z-40 mt-1 w-72 max-w-[calc(100vw-1.5rem)] rounded-lg bg-white p-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
