import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { analyticsService } from '@/services'
import type { LocationFilter, OccupancyPeriod } from '@/types'
import { OccupancyChart } from './OccupancyChart'

const PERIODS: OccupancyPeriod[] = ['today', '7d', '30d']

export function OccupancySection({ location, className }: { location: LocationFilter; className?: string }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [period, setPeriod] = useState<OccupancyPeriod>('today')
  const occupancy = useAsync(() => analyticsService.getOccupancy(location, period), [location, period])
  const series = occupancy.data
  const points = series?.points ?? []
  const peak = points.reduce((best, p) => (p.occupied > best.occupied ? p : best), points[0])
  const average = points.length ? Math.round(points.reduce((s, p) => s + p.occupied, 0) / points.length) : 0
  const latest = points[points.length - 1]

  return (
    <Card className={className} labelledBy="occupancy-title">
      <CardHeader
        id="occupancy-title"
        title={t('dashboard.occupancy.title')}
        subtitle={series ? t('dashboard.occupancy.capacity', { count: series.capacity }) : t('dashboard.occupancy.subtitle')}
        action={
          <SegmentedControl
            label={t('dashboard.occupancy.periodLabel')}
            value={period}
            onChange={setPeriod}
            options={PERIODS.map((p) => ({ value: p, label: t(`dashboard.occupancy.periods.${p}`) }))}
          />
        }
      />

      {occupancy.status === 'error' ? (
        <ErrorState onRetry={occupancy.retry} />
      ) : !series ? (
        <LoadingState>
          <div className="mb-5 flex gap-8">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
          <Skeleton className="h-[248px] w-full rounded-xl" />
        </LoadingState>
      ) : (
        <div className={cn('transition-opacity', occupancy.status === 'loading' && 'opacity-60')}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { label: period === 'today' ? t('dashboard.occupancy.now') : t('dashboard.occupancy.periods.today'), value: latest?.occupied },
                { label: t('dashboard.occupancy.peak'), value: peak?.occupied, hint: peak && (period === 'today' ? fmt.time(peak.timestamp) : fmt.dayMonth(peak.timestamp)) },
                { label: t('dashboard.occupancy.average'), value: average },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="eyebrow">{item.label}</dt>
                  <dd className="tabular mt-1 flex items-baseline gap-1.5 font-display text-xl font-semibold text-text">
                    {item.value ?? '—'}
                    {item.hint && <span className="font-sans text-xs font-normal text-text-muted">{item.hint}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="flex items-center gap-4 text-xs text-text-secondary" aria-label={t('dashboard.live.legend')}>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-4 rounded-full bg-occupied" />
                {t('status.occupied')}
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="w-4 border-t-2 border-dashed border-available" />
                {t('status.available')}
              </li>
            </ul>
          </div>
          <OccupancyChart series={series} fmt={fmt} />
        </div>
      )}
    </Card>
  )
}
