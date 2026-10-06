import { CalendarRange, Gauge, Layers, Plus, Sprout } from 'lucide-react'
import { useMemo, useState } from 'react'
import { speciesColor } from '@/components/dashboard/format'
import { StatBlock } from '@/components/dashboard/shared'
import { BATCH_WRITERS } from '@/components/modules/batches/access'
import { BatchStatusBadge } from '@/components/modules/batches/BatchStatusBadge'
import { PlanActualChart, type PlanActualDatum } from '@/components/modules/production/PlanActualChart'
import { LinkButton } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { HorizontalBars } from '@/components/ui/HorizontalBars'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import { expectedYield, harvestBySpecies, harvestForecast, isActive, pipelineCounts, PIPELINE_STATUSES, yieldStats } from '@/domain/production'
import { addDays, dayKey, periodRange, startOfDay } from '@/domain/time'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'

type Horizon = 'thisWeek' | 'nextWeek' | 'thisMonth'

/** Monday 00:00 of the (local) week containing `date`. */
const weekStart = (date: Date) => {
  const d = startOfDay(date)
  return addDays(d, -((d.getDay() + 6) % 7))
}

export function ProductionPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user } = useSession()
  const { data, status, retry } = useFarmData()
  const [horizon, setHorizon] = useState<Horizon>('thisWeek')
  const [now] = useState(() => new Date())
  const canWrite = BATCH_WRITERS.includes(user.role)

  const view = useMemo(() => {
    if (!data) return null
    const speciesById = new Map(data.species.map((s) => [s.id, s]))
    const forecast = harvestForecast(data.batches, data.harvests, data.species, now)
    const stats = yieldStats(data.batches, data.harvests, data.species)
    const counts = pipelineCounts(data.batches)

    // Planned vs actual: the last 8 weeks (incl. this one) and the next 4.
    const current = weekStart(now)
    const weeks = Array.from({ length: 12 }, (_, i) => addDays(current, (i - 7) * 7))
    const actual = new Map<string, number>()
    const planned = new Map<string, number>()
    for (const h of data.harvests) {
      const k = dayKey(weekStart(new Date(h.date)))
      actual.set(k, (actual.get(k) ?? 0) + h.wetWeight - h.wasteWeight)
    }
    for (const b of data.batches) {
      const sp = speciesById.get(b.speciesId)
      if (!sp || b.status === 'FAILED' || b.status === 'DISCARDED') continue
      const k = dayKey(weekStart(new Date(b.expectedHarvestDate)))
      planned.set(k, (planned.get(k) ?? 0) + expectedYield(b, sp))
    }
    const plan: PlanActualDatum[] = weeks.map((w) => {
      const k = dayKey(w)
      const iso = w.toISOString()
      return {
        key: k,
        label: fmt.dayMonth(iso),
        title: t('pages.production.plan.week', { date: fmt.dayMonth(iso) }),
        planned: planned.get(k) ?? 0,
        actual: w.getTime() <= current.getTime() ? (actual.get(k) ?? 0) : null,
        current: w.getTime() === current.getTime(),
      }
    })

    const last30 = periodRange('30d', now)
    const bySpecies = harvestBySpecies(data.harvests, data.batches, last30)
    const byRoom = new Map<string, number>()
    for (const h of data.harvests) if (h.date >= last30.from && h.date <= last30.to) byRoom.set(h.roomId, (byRoom.get(h.roomId) ?? 0) + h.wetWeight - h.wasteWeight)

    const speciesCards = data.species.map((s) => {
      const batches = data.batches.filter((b) => b.speciesId === s.id)
      return {
        species: s,
        active: batches.filter(isActive).length,
        efficiency: yieldStats(batches, data.harvests, [s]).efficiency,
        harvested30: bySpecies.get(s.id) ?? 0,
      }
    })

    return { forecast, stats, counts, plan, bySpecies, byRoom, speciesCards }
  }, [data, fmt, t, now])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const header = (
    <PageHeader
      title={t('pages.production.title')}
      description={t('pages.production.subtitle')}
      actions={
        <>
          <LinkButton to="/batches" variant="secondary">
            <Layers aria-hidden className="size-4" />
            {t('pages.production.viewBatches')}
          </LinkButton>
          {canWrite && (
            <LinkButton to="/batches?new=1" variant="primary">
              <Plus aria-hidden className="size-4" />
              {t('pages.production.newBatch')}
            </LinkButton>
          )}
        </>
      }
    />
  )

  if (!data || !view) {
    return (
      <PageShell>
        {header}
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </PageShell>
    )
  }

  const { forecast, stats, counts, plan, bySpecies, byRoom, speciesCards } = view
  const inProgress = PIPELINE_STATUSES.reduce((s, st) => s + counts[st], 0)
  const activeCount = data.batches.filter(isActive).length
  const maxStage = Math.max(1, ...PIPELINE_STATUSES.map((s) => counts[s]))
  const bucket = forecast[horizon]
  const forecastRows = data.species
    .map((s) => ({ s, lb: bucket.bySpecies[s.id] ?? 0 }))
    .filter((r) => r.lb > 0.5)
    .sort((a, b) => b.lb - a.lb)
  const maxForecast = Math.max(1, ...forecastRows.map((r) => r.lb))
  const speciesBars = data.species
    .map((s) => ({ key: s.id, label: s.name, value: bySpecies.get(s.id) ?? 0, formatted: fmt.pounds(bySpecies.get(s.id) ?? 0) }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)
  const roomBars = data.rooms
    .map((r) => ({ key: r.id, label: r.name, value: byRoom.get(r.id) ?? 0, formatted: fmt.pounds(byRoom.get(r.id) ?? 0) }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <PageShell>
      {header}
      <StatGrid>
        <StatCard label={t('pages.production.stats.active')} value={fmt.number(activeCount)} hint={t('pages.production.stats.activeHint', { count: counts.READY_TO_HARVEST })} icon={<Layers aria-hidden className="size-3.5" />} />
        <StatCard label={t('pages.production.stats.forecast')} value={fmt.pounds(forecast.thisWeek.total)} hint={t('pages.production.stats.forecastHint')} icon={<CalendarRange aria-hidden className="size-3.5" />} />
        <StatCard
          label={t('pages.production.stats.efficiency')}
          value={stats.efficiency === null ? '—' : fmt.percent(stats.efficiency)}
          hint={t('pages.production.stats.efficiencyHint')}
          tone={stats.efficiency !== null && stats.efficiency < 0.8 ? 'warning' : 'default'}
          icon={<Gauge aria-hidden className="size-3.5" />}
        />
        <StatCard label={t('pages.production.stats.costPerLb')} value={stats.costPerLb === null ? '—' : fmt.exactCurrency(stats.costPerLb)} hint={t('pages.production.stats.costHint')} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card labelledBy="pipeline-title">
          <CardHeader id="pipeline-title" title={t('pages.production.pipeline.title')} subtitle={t('pages.production.pipeline.subtitle', { count: inProgress })} />
          <ul className="space-y-2.5" aria-label={t('pages.production.pipeline.label')}>
            {PIPELINE_STATUSES.map((s) => (
              <li key={s} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3">
                <BatchStatusBadge status={s} className="justify-self-start" />
                <div aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${counts[s] ? Math.max(4, (counts[s] / maxStage) * 100) : 0}%` }} />
                </div>
                <span className="tabular text-right text-sm font-semibold text-text">{fmt.number(counts[s])}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
            <StatBlock label={t('batch.status.COMPLETED')} value={fmt.number(counts.COMPLETED)} />
            <StatBlock label={t('pipeline.lost')} value={fmt.number(counts.FAILED + counts.DISCARDED)} />
            <StatBlock label={t('pages.batches.stats.lossRate')} value={fmt.percent(stats.lossRate)} />
          </div>
        </Card>

        <Card labelledBy="forecast-title" className="flex flex-col">
          <CardHeader id="forecast-title" icon={<CalendarRange aria-hidden className="size-4" />} title={t('forecast.title')} subtitle={t('forecast.subtitle')} />
          <SegmentedControl
            label={t('forecast.horizon')}
            value={horizon}
            onChange={setHorizon}
            className="self-start"
            options={[
              { value: 'thisWeek', label: t('forecast.thisWeek') },
              { value: 'nextWeek', label: t('forecast.nextWeek') },
              { value: 'thisMonth', label: t('forecast.thisMonth') },
            ]}
          />
          <p className="mt-4 text-[0.75rem] text-text-muted">{t('forecast.expected')}</p>
          <p className="tabular font-display text-3xl font-semibold tracking-[-0.02em] text-text">{fmt.pounds(bucket.total)}</p>
          <ul className="mt-3 space-y-2.5" aria-label={t('forecast.bySpecies')}>
            {forecastRows.length === 0 && <li className="text-sm text-text-muted">{t('forecast.empty')}</li>}
            {forecastRows.map(({ s, lb }) => (
              <li key={s.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[0.8125rem]">
                  <span className="truncate text-text-secondary">{s.name}</span>
                  <span className="tabular shrink-0 font-semibold text-text">{fmt.pounds(lb)}</span>
                </div>
                <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(3, (lb / maxForecast) * 100)}%`, background: speciesColor(s.colorIndex) }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card labelledBy="plan-title">
        <CardHeader id="plan-title" title={t('pages.production.plan.title')} subtitle={t('pages.production.plan.subtitle')} />
        <PlanActualChart
          data={plan}
          labels={{ planned: t('pages.production.plan.planned'), actual: t('pages.production.plan.actual') }}
          format={fmt.pounds}
          label={t('pages.production.plan.label')}
        />
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary" aria-label={t('common.legend')}>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm border border-info bg-info-soft" />
            {t('pages.production.plan.planned')}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm bg-brand" />
            {t('pages.production.plan.actual')}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm bg-surface-2 ring-1 ring-border" />
            {t('pages.production.plan.current')}
          </li>
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card labelledBy="by-species-title">
          <CardHeader id="by-species-title" title={t('pages.production.bySpecies.title')} subtitle={t('pages.production.bySpecies.subtitle')} />
          {speciesBars.length ? <HorizontalBars items={speciesBars} label={t('pages.production.bySpecies.title')} /> : <EmptyState title={t('pages.production.bySpecies.empty')} />}
        </Card>
        <Card labelledBy="by-room-title">
          <CardHeader id="by-room-title" title={t('pages.production.byRoom.title')} subtitle={t('pages.production.byRoom.subtitle')} />
          {roomBars.length ? <HorizontalBars items={roomBars} barClassName="bg-accent" label={t('pages.production.byRoom.title')} /> : <EmptyState title={t('pages.production.byRoom.empty')} />}
        </Card>
      </div>

      <section aria-labelledby="species-title" className="space-y-3">
        <div>
          <h2 id="species-title" className="font-display text-base font-semibold text-text">
            {t('pages.production.species.title')}
          </h2>
          <p className="text-xs text-text-muted">{t('pages.production.species.subtitle')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {speciesCards.map(({ species: s, active, efficiency, harvested30 }) => (
            <Card key={s.id} as="article" className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <span aria-hidden className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: speciesColor(s.colorIndex) }}>
                  <Sprout className="size-4 text-white" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-sm font-semibold text-text">{s.name}</h3>
                  <p className="truncate text-xs text-text-muted italic">{s.scientificName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatBlock label={t('pages.production.species.growDays')} value={fmt.number(s.averageGrowDays)} />
                <StatBlock label={t('pages.production.species.yield')} value={fmt.percent(s.averageYield)} />
                <StatBlock label={t('pages.production.species.active')} value={fmt.number(active)} />
                <StatBlock label={t('pages.production.species.harvested30')} value={fmt.pounds(harvested30)} />
                <StatBlock label={t('pages.production.species.efficiency')} value={efficiency === null ? '—' : fmt.percent(efficiency)} />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
