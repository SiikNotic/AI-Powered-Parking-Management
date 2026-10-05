import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { memo } from 'react'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/cn'

export type DeltaIntent = 'up-is-good' | 'down-is-good' | 'neutral'

export interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  /** Tailwind classes for the icon tile (tint + ink). */
  iconClassName: string
  /** Relative change, e.g. 0.124 for +12.4%. */
  delta?: { ratio: number; formatted: string; caption: string; intent: DeltaIntent }
  /** Plain caption shown where the delta would be. */
  note?: string
  secondary?: string
  /** 0–1 share rendered as a thin bar. */
  share?: { ratio: number; barClassName: string }
  className?: string
}

function deltaClasses(ratio: number, intent: DeltaIntent): string {
  if (ratio === 0 || intent === 'neutral') return 'bg-surface-sunken text-text-secondary'
  const good = intent === 'up-is-good' ? ratio > 0 : ratio < 0
  return good ? 'bg-available-soft text-available-ink' : 'bg-occupied-soft text-occupied-ink'
}

export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  delta,
  note,
  secondary,
  share,
  className,
}: StatCardProps) {
  const DeltaIcon = !delta || delta.ratio === 0 ? Minus : delta.ratio > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <article className={cn('flex min-w-0 flex-col rounded-card border border-border bg-surface p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="eyebrow truncate">{label}</h3>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl', iconClassName)}>
          <Icon aria-hidden className="size-4" strokeWidth={2} />
        </span>
      </div>

      <p className="tabular mt-3 font-display text-[1.75rem] font-semibold leading-none tracking-tight text-text sm:text-[2rem]">
        {value}
      </p>

      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
        {delta && (
          <>
            <span
              className={cn(
                'tabular inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold',
                deltaClasses(delta.ratio, delta.intent),
              )}
            >
              <DeltaIcon aria-hidden className="size-3" strokeWidth={2.5} />
              {delta.formatted}
            </span>
            <span className="text-xs text-text-muted">{delta.caption}</span>
          </>
        )}
        {note && <span className="truncate text-xs text-text-muted">{note}</span>}
      </div>

      <div className="mt-auto pt-3">
        {share && (
          <div aria-hidden className="mb-2 h-1 overflow-hidden rounded-full bg-surface-sunken">
            <div className={cn('h-full rounded-full', share.barClassName)} style={{ width: `${Math.round(share.ratio * 100)}%` }} />
          </div>
        )}
        {secondary && <p className="truncate text-xs text-text-muted">{secondary}</p>}
      </div>
    </article>
  )
})

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="size-8 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-8 w-24" />
      <Skeleton className="mt-4 h-4 w-32" />
      <Skeleton className="mt-5 h-1 w-full" />
    </div>
  )
}
