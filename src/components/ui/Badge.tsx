import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'brand' | 'offline'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-text-secondary',
  success: 'bg-ok-soft text-ok-ink',
  info: 'bg-info-soft text-info-ink',
  warning: 'bg-warn-soft text-warn-ink',
  danger: 'bg-crit-soft text-crit-ink',
  offline: 'bg-offline-soft text-offline-ink',
  brand: 'bg-brand-soft text-brand-ink',
}

interface BadgeProps {
  tone?: BadgeTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
