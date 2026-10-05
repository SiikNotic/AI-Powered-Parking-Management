import { ArrowDownRight, ArrowUpRight, CircleAlert, CircleCheck, Minus, OctagonAlert, WifiOff, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { RoomStatus } from '@/domain/environment'
import { change } from '@/domain/time'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

const roomStatusStyle: Record<RoomStatus, { icon: LucideIcon; className: string }> = {
  ok: { icon: CircleCheck, className: 'bg-ok-soft text-ok-ink' },
  warning: { icon: CircleAlert, className: 'bg-warn-soft text-warn-ink' },
  critical: { icon: OctagonAlert, className: 'bg-crit-soft text-crit-ink' },
  offline: { icon: WifiOff, className: 'bg-offline-soft text-offline-ink' },
}


/** Status pill: icon + label, never colour alone. */
export function RoomStatusBadge({ status, className }: { status: RoomStatus; className?: string }) {
  const { t } = useI18n()
  const { icon: Icon, className: tone } = roomStatusStyle[status]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap', tone, className)}>
      <Icon aria-hidden className="size-3" strokeWidth={2.4} />
      {t(`environment.status.${status}`)}
    </span>
  )
}

interface DeltaProps {
  current: number
  previous: number
  /** Up is bad (expenses, waste). */
  inverse?: boolean
  className?: string
}

/** Period-over-period change with direction icon and an accessible label. */
export function Delta({ current, previous, inverse = false, className }: DeltaProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const ratio = change(current, previous)
  if (ratio === null) return <span className={cn('text-[0.75rem] text-text-muted', className)}>{t('kpi.noBaseline')}</span>
  const flat = Math.abs(ratio) < 0.005
  const up = ratio > 0
  const good = flat ? null : up !== inverse
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[0.75rem] font-semibold tabular', good === null ? 'text-text-muted' : good ? 'text-ok-ink' : 'text-crit-ink', className)}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2.4} />
      {fmt.signedPercent(ratio)}
      <span className="sr-only"> {t('kpi.vsPrevious')}</span>
    </span>
  )
}

export function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-soft">
      {children}
    </Link>
  )
}

export function StatBlock({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate text-[0.75rem] text-text-muted">{label}</p>
      <p className="tabular mt-0.5 truncate font-display text-lg font-semibold tracking-[-0.01em] text-text">{value}</p>
      {hint && <p className="truncate text-[0.6875rem] text-text-muted">{hint}</p>}
    </div>
  )
}
