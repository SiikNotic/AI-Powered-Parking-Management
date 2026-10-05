import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Lightweight accessible tooltip.
 * Opens on hover and keyboard focus, closes on Escape, is rendered in a
 * portal with fixed positioning and clamped to the viewport (never causes
 * horizontal scroll).
 */
export function Tooltip({ content, children, className }: TooltipProps) {
  const id = useId()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null)

  const show = useCallback(() => setOpen(true), [])
  const hide = useCallback(() => {
    setOpen(false)
    setPos(null)
  }, [])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tipRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const tip = tipRef.current.getBoundingClientRect()
    const margin = 8
    const placement = trigger.top - tip.height - margin < 0 ? 'bottom' : 'top'
    const top = placement === 'top' ? trigger.top - tip.height - margin : trigger.bottom + margin
    const left = Math.min(
      Math.max(margin, trigger.left + trigger.width / 2 - tip.width / 2),
      window.innerWidth - tip.width - margin,
    )
    setPos({ top, left, placement })
  }, [open])

  return (
    <span
      ref={triggerRef}
      className={className ?? 'inline-flex'}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => {
        if (e.key === 'Escape') hide()
      }}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="pointer-events-none fixed z-[100] max-w-64 rounded-xl bg-ink px-3 py-2 text-xs leading-relaxed text-text-inverse shadow-pop animate-fade-in"
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  )
}
