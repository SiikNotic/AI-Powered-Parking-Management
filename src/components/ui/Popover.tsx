import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PopoverProps {
  /** Renders the trigger. Spread `props` on a <button>. */
  trigger: (props: {
    ref: (el: HTMLButtonElement | null) => void
    onClick: () => void
    'aria-expanded': boolean
    'aria-haspopup': 'menu'
    'aria-controls': string
  }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  className?: string
  panelClassName?: string
  label: string
}

const ITEM_SELECTOR = '[role="menuitem"],[role="menuitemradio"]'

/**
 * Accessible dropdown menu: toggles on click, closes on outside click and
 * Escape (returning focus to the trigger), arrow keys move between items.
 */
export function Popover({ trigger, children, align = 'end', className, panelClassName, label }: PopoverProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const setTriggerRef = useCallback((el: HTMLButtonElement | null) => {
    triggerRef.current = el
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    // Focus the checked item, or the first one.
    const items = panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR)
    const checked = panelRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')
    ;(checked ?? items?.[0])?.focus()
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
      return
    }
    if (e.key === 'Tab') {
      setOpen(false)
      return
    }
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])
    if (!items.length) return
    const index = items.indexOf(document.activeElement as HTMLElement)
    let next = -1
    if (e.key === 'ArrowDown') next = (index + 1) % items.length
    else if (e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next >= 0) {
      e.preventDefault()
      items[next].focus()
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)} onKeyDown={open ? onKeyDown : undefined}>
      {/* Render props receive ref-backed callbacks; they are only invoked from event handlers. */}
      {/* oxlint-disable-next-line react/refs */}
      {trigger({
        ref: setTriggerRef,
        onClick: () => setOpen((o) => !o),
        'aria-expanded': open,
        'aria-haspopup': 'menu',
        'aria-controls': id,
      })}
      {open && (
        <div
          ref={panelRef}
          id={id}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute top-full z-50 mt-2 min-w-56 glass-strong rounded-2xl p-1.5 animate-fade-in',
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {/* oxlint-disable-next-line react/refs */}
          {children(close)}
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  children: ReactNode
  onSelect: () => void
  checked?: boolean
  className?: string
}

export function MenuItem({ children, onSelect, checked, className }: MenuItemProps) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked}
      tabIndex={-1}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-text transition-colors',
        'hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </button>
  )
}
