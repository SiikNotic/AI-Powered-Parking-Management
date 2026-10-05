import { CreditCard } from 'lucide-react'
import { memo, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import type { AsyncResult } from '@/hooks/useAsync'
import { useFormat, type Formatters } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { RevenuePoint, RevenueStats } from '@/types'


/** 30 thin bars, today highlighted; hover/focus shows the exact amount. */
export const RevenueBars = memo(function RevenueBars({ daily, fmt, height = 96 }: { daily: RevenuePoint[]; fmt: Formatters; height?: number }) {
  const { t } = useI18n()
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...daily.map((d) => d.amount), 1)
  const total = daily.reduce((s, d) => s + d.amount, 0)
  const shown = active ?? daily.length - 1
  // Parse yyyy-mm-dd as a local date (avoids UTC shift).
  const isoAt = (date: string) => new Date(`${date}T12:00:00`).toISOString()

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="text-text-muted">{t('dashboard.revenue.last30Days')}</span>
        <span className="tabular text-text-secondary" aria-live="polite">
          {fmt.dayMonth(isoAt(daily[shown].date))} · <span className="font-semibold text-text">{fmt.currency(daily[shown].amount)}</span>
        </span>
      </div>
      <div
        role="img"
        aria-label={t('dashboard.revenue.chartLabel', { total: fmt.currency(total) })}
        className="flex items-end gap-[3px]"
        style={{ height }}
        onPointerLeave={() => setActive(null)}
      >
        {daily.map((point, i) => {
          const today = i === daily.length - 1
          return (
            <div
              key={point.date}
              className="flex h-full flex-1 items-end"
              onPointerEnter={() => setActive(i)}
            >
              <div
                className={cn(
                  'w-full rounded-t-[4px] rounded-b-[1px] transition-colors',
                  today ? 'bg-brand' : active === i ? 'bg-brand/70' : 'bg-brand/25',
                )}
                style={{ height: `${Math.max(4, (point.amount / max) * 100)}%` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
})

export function RevenueCard({ revenue, className }: { revenue: AsyncResult<RevenueStats>; className?: string }) {
  const { t } = useI18n()
  const fmt = useFormat()

  return (
    <Card className={cn('flex flex-col', className)} labelledBy="revenue-title">
      <CardHeader id="revenue-title" title={t('dashboard.revenue.title')} />
      {revenue.status === 'error' ? (
        <ErrorState onRetry={revenue.retry} />
      ) : !revenue.data ? (
        <LoadingState>
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="mt-6 h-24 w-full" />
        </LoadingState>
      ) : (
        <>
          <dl className="divide-y divide-border rounded-2xl bg-surface-sunken/60 px-4">
            {[
              { label: t('dashboard.revenue.today'), value: revenue.data.today },
              { label: t('dashboard.revenue.thisWeek'), value: revenue.data.thisWeek },
              { label: t('dashboard.revenue.thisMonth'), value: revenue.data.thisMonth },
            ].map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-3 py-3">
                <dt className="eyebrow">{item.label}</dt>
                <dd className="tabular font-display text-lg font-semibold text-text">
                  {fmt.currency(item.value)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex-1">
            <RevenueBars daily={revenue.data.daily} fmt={fmt} />
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-text-muted">
            <CreditCard aria-hidden className="size-3.5" />
            {t('dashboard.revenue.paymentsNote')}
          </p>
        </>
      )}
    </Card>
  )
}
