import type { ReactNode } from 'react'
import { statusVisuals } from '@/config/status'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { SpaceStatus } from '@/types'

export type BadgeTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'brand'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-text-secondary',
  success: 'bg-available-soft text-available-ink',
  info: 'bg-reserved-soft text-reserved-ink',
  warning: 'bg-maintenance-soft text-maintenance-ink',
  danger: 'bg-occupied-soft text-occupied-ink',
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

/** Status pill that always shows icon + label (never colour alone). */
export function StatusBadge({ status, className }: { status: SpaceStatus; className?: string }) {
  const { t } = useI18n()
  const visual = statusVisuals[status]
  const Icon = visual.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap',
        visual.badge,
        className,
      )}
    >
      <Icon aria-hidden className="size-3" strokeWidth={2.25} />
      {t(`status.${status}`)}
    </span>
  )
}
