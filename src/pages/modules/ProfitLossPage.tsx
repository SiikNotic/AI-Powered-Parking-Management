import { Download, Info, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FinanceChart, type FinanceDatum } from '@/components/charts/FinanceChart'
import { Delta } from '@/components/dashboard/shared'
import { financeRange, toDateInput, type FinancePeriod } from '@/components/modules/expenses/periods'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Form'
import { HorizontalBars, type BarItem } from '@/components/ui/HorizontalBars'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import { dailyFinance, expensesByCategory, profitAndLoss, revenueBySpecies, salesByChannel, topProducts, type DailyFinance } from '@/domain/finance'
import { change, previousRange } from '@/domain/time'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { downloadCsv } from '@/lib/csv'
import type { DateRange, ExpenseCategory } from '@/types'

type PnlPeriod = Exclude<FinancePeriod, 'all'>
const PERIODS: PnlPeriod[] = ['thisMonth', 'lastMonth', '30d', '90d', 'thisYear']

interface Line {
  key: string
  label: string
  hint?: string
  current: number
  previous: number
  /** Up is bad (costs). */
  inverse?: boolean
  kind: 'main' | 'sub' | 'total' | 'heading'
}

/** Noon of a local day key, so formatting never shifts it a day. */
const dayIso = (day: string) => new Date(`${day}T12:00:00`).toISOString()

function bucketWeekly(days: DailyFinance[]): { start: string; rows: DailyFinance[] }[] {
  const weeks: { start: string; rows: DailyFinance[] }[] = []
  days.forEach((d, i) => {
    if (i % 7 === 0) weeks.push({ start: d.day, rows: [] })
    weeks[weeks.length - 1].rows.push(d)
  })
  return weeks
}

export function ProfitLossPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { can } = useSession()
  const { data, status, retry } = useFarmData()
  const [period, setPeriod] = useState<PnlPeriod>('30d')

  const range = useMemo(() => financeRange(period) as DateRange, [period])
  const prevRange = useMemo(() => previousRange(range), [range])

  const report = useMemo(() => {
    if (!data) return null
    const current = profitAndLoss(data.orders, data.expenses, range)
    const previous = profitAndLoss(data.orders, data.expenses, prevRange)
    const opexNow = expensesByCategory(data.expenses, range)
    const opexPrev = expensesByCategory(data.expenses, prevRange)
    const categories = [...new Set<ExpenseCategory>([...opexNow.keys(), ...opexPrev.keys()])].sort((a, b) => (opexNow.get(b) ?? 0) - (opexNow.get(a) ?? 0))
    const daily = dailyFinance(data.orders, data.expenses, range)
    return {
      current,
      previous,
      categories: categories.map((c) => ({ category: c, current: opexNow.get(c) ?? 0, previous: opexPrev.get(c) ?? 0 })),
      daily,
      channels: [...salesByChannel(data.orders, range).entries()].sort((a, b) => b[1] - a[1]),
      species: [...revenueBySpecies(data.orders, data.products, range).entries()].sort((a, b) => b[1] - a[1]),
      top: topProducts(data.orders, data.products, range, 5),
    }
  }, [data, range, prevRange])

  if (!can('finance.view')) {
    return (
      <PageShell>
        <PageHeader title={t('pages.profitLoss.title')} />
        <Card>
          <EmptyState icon={Lock} title={t('pages.profitLoss.noAccess.title')} description={t('pages.profitLoss.noAccess.description')} />
        </Card>
      </PageShell>
    )
  }
  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const span = (r: DateRange) => `${fmt.dayMonth(r.from)} – ${fmt.dayMonth(r.to)}`
  const periodOptions = PERIODS.map((p) => ({ value: p, label: t(`pages.profitLoss.periods.${p}`) }))

  const header = (
    <PageHeader
      title={t('pages.profitLoss.title')}
      description={t('pages.profitLoss.comparing', { current: span(range), previous: span(prevRange) })}
      actions={
        <>
          <div className="hidden lg:block">
            <SegmentedControl label={t('pages.profitLoss.period')} options={periodOptions} value={period} onChange={setPeriod} />
          </div>
          <div className="w-full sm:w-48 lg:hidden">
            <Select aria-label={t('pages.profitLoss.period')} value={period} onChange={(e) => setPeriod(e.target.value as PnlPeriod)}>
              {periodOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </>
      }
    />
  )

  if (!report || !data) {
    return (
      <PageShell>
        {header}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-card" />
      </PageShell>
    )
  }

  const { current, previous } = report
  const pct = (n: number | null) => (n === null ? '—' : fmt.percent(n))
  const grossMargin = (p: typeof current) => (p.revenue > 0 ? p.grossProfit / p.revenue : null)

  const lines: Line[] = [
    { key: 'revenue', label: t('pages.profitLoss.statement.revenue'), hint: t('pages.profitLoss.statement.revenueHint', { count: fmt.number(current.completedOrders) }), current: current.revenue, previous: previous.revenue, kind: 'main' },
    { key: 'cogs', label: t('pages.profitLoss.statement.cogs'), current: current.cogs, previous: previous.cogs, inverse: true, kind: 'main' },
    { key: 'gross', label: t('pages.profitLoss.statement.grossProfit'), hint: t('pages.profitLoss.statement.grossMargin', { value: pct(grossMargin(current)) }), current: current.grossProfit, previous: previous.grossProfit, kind: 'total' },
    { key: 'opex', label: t('pages.profitLoss.statement.opex'), current: 0, previous: 0, kind: 'heading' },
    ...report.categories.map((c): Line => ({ key: `opex-${c.category}`, label: t(`labels.expenseCategory.${c.category}`), current: c.current, previous: c.previous, inverse: true, kind: 'sub' })),
    { key: 'totalOpex', label: t('pages.profitLoss.statement.totalOpex'), current: current.operatingExpenses, previous: previous.operatingExpenses, inverse: true, kind: 'main' },
    { key: 'net', label: t('pages.profitLoss.statement.netProfit'), hint: t('pages.profitLoss.statement.netMargin', { value: pct(current.margin) }), current: current.netProfit, previous: previous.netProfit, kind: 'total' },
  ]

  const weekly = report.daily.length > 45
  const chartData: FinanceDatum[] = weekly
    ? bucketWeekly(report.daily).map((w) => {
        const revenue = w.rows.reduce((s, r) => s + r.revenue, 0)
        const expenses = w.rows.reduce((s, r) => s + r.expenses, 0)
        return { key: w.start, label: fmt.dayMonth(dayIso(w.start)), title: t('pages.profitLoss.chart.weekOf', { date: fmt.dayMonth(dayIso(w.start)) }), revenue, expenses, profit: revenue - expenses }
      })
    : report.daily.map((d) => ({ key: d.day, label: fmt.dayMonth(dayIso(d.day)), title: fmt.longDate(dayIso(d.day)), revenue: d.revenue, expenses: d.expenses, profit: d.profit }))

  const speciesById = new Map(data.species.map((s) => [s.id, s]))
  const bars = {
    channels: report.channels.map(([c, v]): BarItem => ({ key: c, label: t(`channels.${c}`), value: v, formatted: fmt.currency(v) })),
    species: report.species.map(([id, v]): BarItem => ({ key: id, label: speciesById.get(id)?.name ?? '—', value: v, formatted: fmt.currency(v) })),
    top: report.top.map((p): BarItem => ({ key: p.product.id, label: p.product.name, value: p.revenue, formatted: fmt.currency(p.revenue) })),
  }

  const exportCsv = () => {
    const day = (iso: string) => toDateInput(new Date(iso))
    downloadCsv(
      `${t('pages.profitLoss.csv.filename')}-${day(range.from)}-${day(range.to)}.csv`,
      [
        t('pages.profitLoss.csv.line'),
        t('pages.profitLoss.csv.current', { from: day(range.from), to: day(range.to) }),
        t('pages.profitLoss.csv.previous', { from: day(prevRange.from), to: day(prevRange.to) }),
        t('pages.profitLoss.csv.change'),
      ],
      lines
        .filter((l) => l.kind !== 'heading')
        .map((l) => {
          const ratio = change(l.current, l.previous)
          return [l.kind === 'sub' ? `${t('pages.profitLoss.statement.opex')} · ${l.label}` : l.label, l.current.toFixed(2), l.previous.toFixed(2), ratio === null ? '' : (ratio * 100).toFixed(1)]
        }),
    )
  }

  return (
    <PageShell>
      {header}
      <StatGrid>
        <StatCard label={t('pages.profitLoss.stats.revenue')} value={fmt.currency(current.revenue)} hint={<Delta current={current.revenue} previous={previous.revenue} />} />
        <StatCard label={t('pages.profitLoss.stats.grossProfit')} value={fmt.currency(current.grossProfit)} hint={<Delta current={current.grossProfit} previous={previous.grossProfit} />} />
        <StatCard
          label={t('pages.profitLoss.stats.netProfit')}
          value={fmt.currency(current.netProfit)}
          tone={current.netProfit < 0 ? 'danger' : 'default'}
          hint={<Delta current={current.netProfit} previous={previous.netProfit} />}
        />
        <StatCard
          label={t('pages.profitLoss.stats.margin')}
          value={current.margin === null ? t('pages.profitLoss.stats.noRevenue') : fmt.percent(current.margin)}
          hint={t('pages.profitLoss.stats.marginHint', { value: pct(previous.margin) })}
        />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card labelledBy="pnl-statement">
          <CardHeader
            id="pnl-statement"
            title={t('pages.profitLoss.statement.title')}
            subtitle={t(`pages.profitLoss.periods.${period}`)}
            action={
              <Button size="sm" onClick={exportCsv}>
                <Download aria-hidden className="size-3.5" />
                {t('table.exportCsv')}
              </Button>
            }
          />
          <table className="w-full border-separate border-spacing-0 text-[0.8125rem]">
            <thead>
              <tr className="eyebrow">
                <th scope="col" className="border-b border-border pb-2 text-left font-semibold">
                  {t('pages.profitLoss.statement.line')}
                </th>
                <th scope="col" className="border-b border-border pb-2 pl-2 text-right font-semibold">
                  {t('pages.profitLoss.statement.current')}
                </th>
                <th scope="col" className="hidden border-b border-border pb-2 pl-2 text-right font-semibold sm:table-cell">
                  {t('pages.profitLoss.statement.previous')}
                </th>
                <th scope="col" className="border-b border-border pb-2 pl-2 text-right font-semibold">
                  {t('pages.profitLoss.statement.change')}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) =>
                l.kind === 'heading' ? (
                  <tr key={l.key}>
                    <th scope="rowgroup" colSpan={4} className="pb-1 pt-3 text-left text-xs font-semibold text-text-secondary">
                      {l.label}
                      {!report.categories.length && <span className="ml-2 font-normal text-text-muted">{t('pages.profitLoss.statement.noOpex')}</span>}
                    </th>
                  </tr>
                ) : (
                  <tr key={l.key} className={cn(l.kind === 'total' && 'bg-surface-2/60')}>
                    <th scope="row" className={cn('border-b border-border py-2 pr-2 text-left align-top', l.kind === 'sub' ? 'pl-4 font-normal text-text-secondary' : 'pl-2 font-semibold text-text')}>
                      <span className="block">{l.label}</span>
                      {l.hint && <span className="block text-[0.6875rem] font-normal text-text-muted">{l.hint}</span>}
                    </th>
                    <td className={cn('tabular border-b border-border py-2 pl-2 text-right align-top', l.kind === 'total' ? 'font-display font-semibold text-text' : 'text-text-secondary', l.key === 'net' && l.current < 0 && 'text-crit-ink')}>
                      {fmt.currency(l.current)}
                    </td>
                    <td className="tabular hidden border-b border-border py-2 pl-2 text-right align-top text-text-muted sm:table-cell">{fmt.currency(l.previous)}</td>
                    <td className="border-b border-border py-2 pl-2 pr-2 text-right align-top">
                      <Delta current={l.current} previous={l.previous} inverse={l.inverse} className="justify-end" />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <p className="mt-4 flex gap-2 text-xs text-text-muted">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>{t('pages.profitLoss.footnote')}</span>
          </p>
        </Card>

        <Card labelledBy="pnl-chart" className="self-start">
          <CardHeader id="pnl-chart" title={t('pages.profitLoss.chart.title')} subtitle={weekly ? t('pages.profitLoss.chart.weekly') : t('pages.profitLoss.chart.daily')} />
          <FinanceChart
            data={chartData}
            height={260}
            label={t('pages.profitLoss.chart.label', { bucket: weekly ? t('pages.profitLoss.chart.week') : t('pages.profitLoss.chart.day') })}
            labels={{ revenue: t('finance.revenue'), expenses: t('finance.expenses'), profit: t('finance.profit') }}
            format={fmt.currency}
            formatAxis={fmt.compactCurrency}
          />
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary" aria-label={t('common.legend')}>
            {(
              [
                ['revenue', 'var(--chart-revenue)'],
                ['expenses', 'var(--chart-expense)'],
                ['profit', 'var(--chart-profit)'],
              ] as const
            ).map(([k, color]) => (
              <li key={k} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn('inline-block', k === 'profit' ? 'h-0.5 w-3.5 rounded-full' : 'size-2.5 rounded-sm')} style={{ background: color }} />
                {t(`finance.${k}`)}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(
          [
            ['channels', t('pages.profitLoss.byChannel'), 'bg-brand'],
            ['species', t('pages.profitLoss.bySpecies'), 'bg-accent'],
            ['top', t('pages.profitLoss.topProducts'), 'bg-info'],
          ] as const
        ).map(([key, title, barClass]) => (
          <Card key={key} labelledBy={`pnl-${key}`}>
            <CardHeader id={`pnl-${key}`} title={title} subtitle={t(`pages.profitLoss.periods.${period}`)} />
            {bars[key].length ? <HorizontalBars label={title} items={bars[key]} barClassName={barClass} /> : <EmptyState title={t('pages.profitLoss.noSales')} />}
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
