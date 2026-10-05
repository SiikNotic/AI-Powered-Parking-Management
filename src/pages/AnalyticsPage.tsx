import { CalendarCheck2, CircleDollarSign, Gauge, Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { OccupancySection } from '@/components/dashboard/OccupancySection'
import { RevenueBars } from '@/components/dashboard/RevenueCard'
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { HorizontalBars } from '@/components/ui/HorizontalBars'
import { PageContainer, PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { analyticsService, reservationService } from '@/services'
import type { ReservationStatus, VehicleType } from '@/types'

export function AnalyticsPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { selectedLocation } = useSession()
  const revenue = useAsync(() => analyticsService.getRevenue(selectedLocation), [selectedLocation], ['spaces', 'locations'])
  const occupancy = useAsync(() => analyticsService.getOccupancy(selectedLocation, '30d'), [selectedLocation], ['spaces', 'locations'])
  const byLocation = useAsync(() => analyticsService.getRevenueByLocation(), [], ['spaces', 'locations'])
  const reservations = useAsync(() => reservationService.list({ location: selectedLocation }), [selectedLocation], ['reservations'])

  const [since] = useState(() => new Date(Date.now() - 30 * 86_400_000).toISOString())
  const recent = useMemo(() => {
    return (reservations.data ?? []).filter((r) => r.checkIn >= since)
  }, [reservations.data, since])

  const avgOccupancy = useMemo(() => {
    const series = occupancy.data
    if (!series?.points.length || !series.capacity) return 0
    return series.points.reduce((s, p) => s + p.occupied, 0) / series.points.length / series.capacity
  }, [occupancy.data])

  const paid = recent.filter((r) => r.status === 'completed' || r.status === 'checked_in')
  const avgTicket = paid.length ? paid.reduce((s, r) => s + r.total, 0) / paid.length : 0

  const vehicleItems = useMemo(() => {
    const counts = new Map<VehicleType, number>()
    for (const r of recent) if (r.status !== 'cancelled') counts.set(r.vehicleType, (counts.get(r.vehicleType) ?? 0) + 1)
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ key, label: t(`vehicle.${key}`), value, formatted: fmt.number(value) }))
  }, [recent, t, fmt])

  const statusItems = useMemo(() => {
    const order: ReservationStatus[] = ['confirmed', 'pending', 'checked_in', 'completed', 'cancelled']
    return order
      .map((status) => ({ key: status, label: t(`reservationStatus.${status}`), value: recent.filter((r) => r.status === status).length }))
      .filter((i) => i.value > 0)
      .map((i) => ({ ...i, formatted: fmt.number(i.value) }))
  }, [recent, t, fmt])

  const rev = revenue.data
  const ready = rev && occupancy.data && reservations.data
  const weekChange = rev?.previousWeek ? (rev.thisWeek - rev.previousWeek) / rev.previousWeek : 0

  return (
    <PageContainer>
      <PageHeader description={t('analyticsPage.description')} />

      {revenue.status === 'error' || reservations.status === 'error' ? (
        <ErrorState onRetry={() => { revenue.retry(); reservations.retry() }} className="glass rounded-card" />
      ) : !ready ? (
        <LoadingState className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
        </LoadingState>
      ) : (
        <section aria-label={t('dashboard.kpi.region')} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label={t('analyticsPage.avgOccupancy')} value={fmt.percent(avgOccupancy)} icon={Gauge} iconClassName="bg-brand-soft text-brand-ink" share={{ ratio: avgOccupancy, barClassName: 'bg-brand' }} />
          <StatCard
            label={t('analyticsPage.monthRevenue')}
            value={fmt.currency(rev.thisMonth)}
            icon={CircleDollarSign}
            iconClassName="bg-available-soft text-available-ink"
            delta={{
              ratio: weekChange,
              formatted: fmt.signedPercent(weekChange),
              caption: t('dashboard.kpi.vsLastWeek'),
              intent: 'up-is-good',
            }}
          />
          <StatCard label={t('analyticsPage.reservations30')} value={fmt.number(recent.filter((r) => r.status !== 'cancelled').length)} icon={CalendarCheck2} iconClassName="bg-reserved-soft text-reserved-ink" />
          <StatCard label={t('analyticsPage.avgTicket')} value={fmt.currency(avgTicket)} icon={Receipt} iconClassName="bg-surface-sunken text-text" />
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-12">
        <OccupancySection location={selectedLocation} className="min-w-0 xl:col-span-8" />
        <Card className="min-w-0 xl:col-span-4" labelledBy="by-location-title">
          <CardHeader id="by-location-title" title={t('analyticsPage.revenueByLocation')} subtitle={t('analyticsPage.revenueByLocationHint')} />
          {!byLocation.data ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <HorizontalBars
              label={t('analyticsPage.revenueByLocation')}
              items={byLocation.data.map((l) => ({ key: l.locationId, label: l.name, value: l.amount, formatted: fmt.currency(l.amount) }))}
            />
          )}
        </Card>

        <Card className="min-w-0 xl:col-span-6" labelledBy="daily-revenue-title">
          <CardHeader id="daily-revenue-title" title={t('analyticsPage.dailyRevenue')} />
          {!revenue.data ? <Skeleton className="h-40 w-full" /> : <RevenueBars daily={revenue.data.daily} fmt={fmt} height={160} />}
        </Card>
        <Card className="min-w-0 xl:col-span-3" labelledBy="by-vehicle-title">
          <CardHeader id="by-vehicle-title" title={t('analyticsPage.byVehicle')} subtitle={t('analyticsPage.revenueByLocationHint')} />
          {!reservations.data ? <Skeleton className="h-40 w-full" /> : <HorizontalBars label={t('analyticsPage.byVehicle')} items={vehicleItems} barClassName="bg-reserved" />}
        </Card>
        <Card className="min-w-0 xl:col-span-3" labelledBy="by-status-title">
          <CardHeader id="by-status-title" title={t('analyticsPage.byStatus')} subtitle={t('analyticsPage.revenueByLocationHint')} />
          {!reservations.data ? <Skeleton className="h-40 w-full" /> : <HorizontalBars label={t('analyticsPage.byStatus')} items={statusItems} barClassName="bg-text-muted" />}
        </Card>
      </div>
    </PageContainer>
  )
}
