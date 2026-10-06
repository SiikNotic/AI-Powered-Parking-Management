import { Download, Info, Plus, Scale } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StackedBarChart } from '@/components/charts/StackedBarChart'
import { speciesColor } from '@/components/dashboard/format'
import { HARVEST_WRITERS } from '@/components/modules/batches/access'
import { HarvestForm } from '@/components/modules/harvest/HarvestForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { FilterSelect, SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { dailyHarvest, harvestTotals } from '@/domain/production'
import { periodRange } from '@/domain/time'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { downloadCsv } from '@/lib/csv'
import type { DateRange, Harvest, Period } from '@/types'

type HarvestPeriod = Period | 'all'

const OPEN_END = '9999-12-31T23:59:59.999Z'

interface Row {
  harvest: Harvest
  code: string
  speciesId: string
  speciesName: string
  colorIndex: number
  roomName: string
  employee: string
  net: number
}

export function HarvestPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user } = useSession()
  const { data, status, retry } = useFarmData()
  const [period, setPeriod] = useState<HarvestPeriod>('30d')
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [query, setQuery] = useState('')
  const [recording, setRecording] = useState(false)
  const [now] = useState(() => new Date())
  const canRecord = HARVEST_WRITERS.includes(user.role)

  // Windows are open-ended so harvests recorded after the page opened still show (they can't be in the future).
  const range = useMemo<DateRange>(() => {
    if (period !== 'all') return { from: periodRange(period, now).from, to: OPEN_END }
    const first = (data?.harvests ?? []).reduce<string | null>((min, h) => (!min || h.date < min ? h.date : min), null)
    return { from: first ?? now.toISOString(), to: OPEN_END }
  }, [period, data, now])

  const rows = useMemo<Row[]>(() => {
    if (!data) return []
    const species = new Map(data.species.map((s) => [s.id, s]))
    const batches = new Map(data.batches.map((b) => [b.id, b]))
    const rooms = new Map(data.rooms.map((r) => [r.id, r.name]))
    const employees = new Map(data.employees.map((e) => [e.id, e.name]))
    return data.harvests.map((h) => {
      const b = batches.get(h.batchId)
      const sp = b ? species.get(b.speciesId) : undefined
      return {
        harvest: h,
        code: b?.code ?? '—',
        speciesId: sp?.id ?? '',
        speciesName: sp?.name ?? t('pages.harvest.unknown'),
        colorIndex: sp?.colorIndex ?? 0,
        roomName: rooms.get(h.roomId) ?? '—',
        employee: employees.get(h.employeeId) ?? '—',
        net: h.wetWeight - h.wasteWeight,
      }
    })
  }, [data, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '')
    return rows.filter(
      (r) =>
        r.harvest.date >= range.from &&
        r.harvest.date <= range.to &&
        (!speciesFilter || r.speciesId === speciesFilter) &&
        (!q || r.code.toLowerCase().includes(q) || r.employee.toLowerCase().includes(q)),
    )
  }, [rows, range, speciesFilter, query])

  // "Today" is a single bar, so the chart shows the last 7 days instead (as on the dashboard).
  const chartRange = useMemo<DateRange>(() => (period === 'today' ? periodRange('7d', now) : { from: range.from, to: now.toISOString() }), [period, range, now])
  const chart = useMemo(() => {
    if (!data) return []
    const list = data.harvests.filter((h) => !speciesFilter || data.batches.find((b) => b.id === h.batchId)?.speciesId === speciesFilter)
    return dailyHarvest(list, data.batches, chartRange)
  }, [data, chartRange, speciesFilter])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const totals = harvestTotals(
    filtered.map((r) => r.harvest),
    range,
  )
  const batchCount = new Set(filtered.map((r) => r.harvest.batchId)).size
  const visibleSpecies = (data?.species ?? []).filter((s) => (!speciesFilter || s.id === speciesFilter) && chart.some((d) => d.bySpecies[s.id]))
  const series = visibleSpecies.map((s) => ({ key: s.id, label: s.name, color: speciesColor(s.colorIndex) }))

  const exportCsv = () =>
    downloadCsv(
      `harvests-${new Date().toISOString().slice(0, 10)}.csv`,
      [t('pages.harvest.columns.date'), t('pages.harvest.columns.batch'), t('pages.harvest.columns.species'), t('pages.harvest.columns.room'), `${t('pages.harvest.columns.wet')} (lb)`, `${t('pages.harvest.columns.waste')} (lb)`, `${t('pages.harvest.columns.net')} (lb)`, t('pages.harvest.columns.grade'), t('pages.harvest.columns.employee')],
      [...filtered]
        .sort((a, b) => b.harvest.date.localeCompare(a.harvest.date))
        .map((r) => [r.harvest.date, r.code, r.speciesName, r.roomName, r.harvest.wetWeight, r.harvest.wasteWeight, Number(r.net.toFixed(2)), r.harvest.grade, r.employee]),
    )

  const columns: Column<Row>[] = [
    { key: 'date', header: t('pages.harvest.columns.date'), cell: (r) => <span className="tabular whitespace-nowrap">{fmt.dayMonthTime(r.harvest.date)}</span>, sort: (r) => r.harvest.date },
    { key: 'batch', header: t('pages.harvest.columns.batch'), cell: (r) => <span className="font-mono text-xs font-semibold text-text">#{r.code}</span>, sort: (r) => r.code },
    {
      key: 'species',
      header: t('pages.harvest.columns.species'),
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: speciesColor(r.colorIndex) }} />
          {r.speciesName}
        </span>
      ),
      sort: (r) => r.speciesName,
    },
    { key: 'room', header: t('pages.harvest.columns.room'), cell: (r) => r.roomName, sort: (r) => r.roomName, hideOnMobile: true },
    { key: 'wet', header: t('pages.harvest.columns.wet'), align: 'right', cell: (r) => fmt.pounds(r.harvest.wetWeight), sort: (r) => r.harvest.wetWeight, hideOnMobile: true },
    { key: 'waste', header: t('pages.harvest.columns.waste'), align: 'right', cell: (r) => fmt.pounds(r.harvest.wasteWeight), sort: (r) => r.harvest.wasteWeight, hideOnMobile: true },
    { key: 'net', header: t('pages.harvest.columns.net'), align: 'right', cell: (r) => <span className="font-semibold text-text">{fmt.pounds(r.net)}</span>, sort: (r) => r.net },
    { key: 'grade', header: t('pages.harvest.columns.grade'), cell: (r) => <Badge tone={r.harvest.grade === 'A' ? 'success' : r.harvest.grade === 'B' ? 'info' : 'warning'}>{t(`labels.grade.${r.harvest.grade}`)}</Badge>, sort: (r) => r.harvest.grade },
    { key: 'employee', header: t('pages.harvest.columns.employee'), cell: (r) => r.employee, sort: (r) => r.employee, hideOnMobile: true },
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.harvest.title')}
        description={t('pages.harvest.subtitle')}
        actions={
          data ? (
            <>
              <Button variant="secondary" onClick={exportCsv} disabled={!filtered.length}>
                <Download aria-hidden className="size-4" />
                {t('table.exportCsv')}
              </Button>
              {canRecord && (
                <Button variant="primary" onClick={() => setRecording(true)}>
                  <Plus aria-hidden className="size-4" />
                  {t('pages.harvest.record')}
                </Button>
              )}
            </>
          ) : undefined
        }
      />
      {!data ? (
        <>
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </>
      ) : (
        <>
          <Toolbar>
            <SegmentedControl
              label={t('pages.harvest.period')}
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'today', label: t('period.today') },
                { value: '7d', label: t('period.7d') },
                { value: '30d', label: t('period.30d') },
                { value: 'all', label: t('pages.harvest.all') },
              ]}
            />
            <FilterSelect label={t('pages.harvest.speciesFilter')} value={speciesFilter} onChange={setSpeciesFilter} options={data.species.map((s) => ({ value: s.id, label: s.name }))} />
            <SearchInput value={query} onChange={setQuery} placeholder={t('pages.harvest.searchPlaceholder')} />
          </Toolbar>
          <StatGrid>
            <StatCard label={t('pages.harvest.stats.net')} value={fmt.pounds(totals.net)} hint={t('pages.harvest.stats.netHint')} icon={<Scale aria-hidden className="size-3.5" />} />
            <StatCard label={t('pages.harvest.stats.wet')} value={fmt.pounds(totals.wet)} />
            <StatCard
              label={t('pages.harvest.stats.waste')}
              value={totals.wet ? fmt.percent(totals.waste / totals.wet) : '—'}
              hint={t('pages.harvest.stats.wasteHint', { value: fmt.pounds(totals.waste) })}
              tone={totals.wet && totals.waste / totals.wet > 0.12 ? 'warning' : 'default'}
            />
            <StatCard label={t('pages.harvest.stats.flushes')} value={fmt.number(totals.flushes)} hint={t('pages.harvest.stats.flushesHint', { count: batchCount })} />
          </StatGrid>
          <Card labelledBy="harvest-chart-title">
            <CardHeader id="harvest-chart-title" title={t('pages.harvest.chart.title')} subtitle={period === 'today' ? t('pages.harvest.chart.subtitleToday') : t('pages.harvest.chart.subtitle')} />
            {chart.some((d) => d.total > 0) ? (
              <>
                <StackedBarChart
                  data={chart.map((d) => ({ key: d.day, label: fmt.dayMonth(`${d.day}T12:00`), title: fmt.longDate(`${d.day}T12:00`), values: d.bySpecies }))}
                  series={series}
                  format={fmt.pounds}
                  height={220}
                  label={t('pages.harvest.chart.label')}
                />
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label={t('common.legend')}>
                  {series.map((s) => (
                    <li key={s.key} className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                      <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
                      {s.label}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState title={t('pages.harvest.chart.empty')} />
            )}
          </Card>
          <Card labelledBy="harvest-table-title">
            <CardHeader id="harvest-table-title" title={t('pages.harvest.table.title')} subtitle={t('pages.harvest.table.subtitle', { count: fmt.number(filtered.length) })} />
            <p className="mb-4 flex gap-2 text-xs text-text-muted">
              <Info aria-hidden className="mt-px size-3.5 shrink-0" />
              {t('pages.harvest.appendOnly')}
            </p>
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(r) => r.harvest.id}
              label={t('pages.harvest.table.title')}
              emptyTitle={data.harvests.length ? t('table.noMatches') : t('table.empty')}
              initialSort={{ key: 'date', dir: 'desc' }}
            />
          </Card>
        </>
      )}
      {recording && data && <HarvestForm data={data} onClose={() => setRecording(false)} />}
    </PageShell>
  )
}
