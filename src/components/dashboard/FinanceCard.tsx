import { CircleDollarSign } from 'lucide-react'
import { FinanceChart } from '@/components/charts/FinanceChart'
import { Card, CardHeader } from '@/components/ui/Card'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { DashboardSnapshot } from '@/services'
import { CardLink } from './shared'

export function FinanceCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const p = snapshot.pnl
  const data = snapshot.finance.map((d) => {
    const iso = new Date(`${d.day}T12:00:00`).toISOString()
    return { key: d.day, label: snapshot.finance.length > 8 ? fmt.dayMonth(iso) : fmt.weekday(iso), title: fmt.dayMonth(iso), ...d }
  })
  const rows: { label: string; value: number; strong?: boolean; negative?: boolean }[] = [
    { label: t('finance.revenue'), value: p.revenue },
    { label: t('finance.cogs'), value: -p.cogs, negative: true },
    { label: t('finance.grossProfit'), value: p.grossProfit, strong: true },
    { label: t('finance.opex'), value: -p.operatingExpenses, negative: true },
    { label: t('finance.netProfit'), value: p.netProfit, strong: true },
  ]

  return (
    <Card labelledBy="finance-title">
      <CardHeader
        id="finance-title"
        icon={<CircleDollarSign aria-hidden className="size-4" />}
        title={t('finance.title')}
        subtitle={t('finance.subtitle', { period: t(`period.${snapshot.period}`).toLowerCase() })}
        action={<CardLink to="/profit-loss">{t('common.viewAll')}</CardLink>}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          <FinanceChart
            data={data}
            labels={{ revenue: t('finance.revenue'), expenses: t('finance.expenses'), profit: t('finance.profit') }}
            format={fmt.currency}
            formatAxis={fmt.compactCurrency}
            label={t('finance.chartLabel')}
          />
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary" aria-label={t('common.legend')}>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm bg-[var(--chart-revenue)]" />
              {t('finance.revenue')}
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm bg-[var(--chart-expense)]" />
              {t('finance.expenses')}
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-3 rounded bg-[var(--chart-profit)]" />
              {t('finance.profit')}
            </li>
            {snapshot.period === 'today' && <li className="text-text-muted">{t('finance.last7')}</li>}
          </ul>
        </div>
        <dl className="space-y-0 self-start rounded-xl border border-border">
          {rows.map((r) => (
            <div key={r.label} className={cn('flex items-baseline justify-between gap-3 px-3 py-2 text-[0.8125rem]', r.strong && 'border-t border-border bg-surface-2/50')}>
              <dt className={r.strong ? 'font-semibold text-text' : 'text-text-secondary'}>{r.label}</dt>
              <dd className={cn('tabular', r.strong ? 'font-semibold' : '', r.value < 0 && r.strong ? 'text-crit-ink' : 'text-text')}>{fmt.currency(r.value)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 border-t border-border px-3 py-2 text-xs text-text-muted">
            <dt>{t('finance.margin')}</dt>
            <dd className="tabular">{p.margin !== null ? fmt.percent(p.margin) : '—'}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
