import { CircleCheck, CircleDollarSign, Clock3, SquareParking, Truck } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/ui/States'
import type { AsyncResult } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { ParkingStats, RevenueStats } from '@/types'
import { StatCard, StatCardSkeleton } from './StatCard'

interface KpiGridProps {
  stats: AsyncResult<ParkingStats>
  revenue: AsyncResult<RevenueStats>
  locationCount: number
  /** Shown under the total when a single location is selected. */
  locationLabel?: string
}

const gridClass = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5'
const revenueSpan = 'col-span-2 xl:col-span-1'

function change(current: number, previous: number): number {
  return previous === 0 ? 0 : (current - previous) / previous
}

export function KpiGrid({ stats, revenue, locationCount, locationLabel }: KpiGridProps) {
  const { t } = useI18n()
  const fmt = useFormat()

  if (stats.status === 'error' || revenue.status === 'error') {
    return (
      <div className="rounded-card border border-border bg-surface shadow-card">
        <ErrorState onRetry={() => { stats.retry(); revenue.retry() }} />
      </div>
    )
  }

  if (!stats.data || !revenue.data) {
    return (
      <LoadingState className={gridClass}>
        {Array.from({ length: 5 }, (_, i) => (
          <StatCardSkeleton key={i} className={i === 4 ? revenueSpan : undefined} />
        ))}
      </LoadingState>
    )
  }

  const s = stats.data
  const r = revenue.data
  const outOfService = s.maintenance + s.disabled
  const vsYesterday = t('dashboard.kpi.vsYesterday')
  const deltaOf = (current: number, previous: number) => {
    const ratio = change(current, previous)
    return { ratio, formatted: fmt.signedPercent(ratio), caption: vsYesterday }
  }
  const shareOf = (value: number) => (s.total ? value / s.total : 0)

  return (
    <section aria-label={t('dashboard.kpi.region')} className={gridClass}>
      <StatCard
        label={t('dashboard.kpi.totalSpaces')}
        value={fmt.number(s.total)}
        icon={SquareParking}
        iconClassName="bg-brand-soft text-brand-ink"
        secondary={outOfService ? t('dashboard.kpi.outOfService', { count: outOfService }) : t('dashboard.kpi.allInService')}
        note={locationCount > 1 ? t('dashboard.kpi.acrossLocations', { count: locationCount }) : locationLabel}
      />
      <StatCard
        label={t('dashboard.kpi.available')}
        value={fmt.number(s.available)}
        icon={CircleCheck}
        iconClassName="bg-available-soft text-available-ink"
        delta={{ ...deltaOf(s.available, s.previous.available), intent: 'neutral' }}
        share={{ ratio: shareOf(s.available), barClassName: 'bg-available' }}
        secondary={t('dashboard.kpi.ofTotal', { percent: fmt.percent(shareOf(s.available)) })}
      />
      <StatCard
        label={t('dashboard.kpi.occupied')}
        value={fmt.number(s.occupied)}
        icon={Truck}
        iconClassName="bg-occupied-soft text-occupied-ink"
        delta={{ ...deltaOf(s.occupied, s.previous.occupied), intent: 'up-is-good' }}
        share={{ ratio: shareOf(s.occupied), barClassName: 'bg-occupied' }}
        secondary={t('dashboard.kpi.ofTotal', { percent: fmt.percent(shareOf(s.occupied)) })}
      />
      <StatCard
        label={t('dashboard.kpi.reserved')}
        value={fmt.number(s.reserved)}
        icon={Clock3}
        iconClassName="bg-reserved-soft text-reserved-ink"
        delta={{ ...deltaOf(s.reserved, s.previous.reserved), intent: 'up-is-good' }}
        share={{ ratio: shareOf(s.reserved), barClassName: 'bg-reserved' }}
        secondary={t('dashboard.kpi.ofTotal', { percent: fmt.percent(shareOf(s.reserved)) })}
      />
      <StatCard
        className={revenueSpan}
        label={t('dashboard.kpi.revenue')}
        value={fmt.currency(r.thisWeek)}
        icon={CircleDollarSign}
        iconClassName="bg-surface-sunken text-text"
        delta={{
          ratio: change(r.thisWeek, r.previousWeek),
          formatted: fmt.signedPercent(change(r.thisWeek, r.previousWeek)),
          caption: t('dashboard.kpi.vsLastWeek'),
          intent: 'up-is-good',
        }}
        secondary={`${t('dashboard.kpi.thisWeek')} · ${t('dashboard.revenue.today')} ${fmt.currency(r.today)}`}
      />
    </section>
  )
}
