import { Wheat } from 'lucide-react'
import { StackedBarChart } from '@/components/charts/StackedBarChart'
import { Card, CardHeader } from '@/components/ui/Card'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { DashboardSnapshot } from '@/services'
import { speciesColor } from './format'
import { CardLink, StatBlock } from './shared'

export function HarvestCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const { harvest, production, species } = snapshot
  const wastePct = harvest.totals.wet ? harvest.totals.waste / harvest.totals.wet : 0
  const series = species.map((s) => ({ key: s.id, label: s.name, color: speciesColor(s.colorIndex) }))
  const data = harvest.daily.map((d) => {
    const date = new Date(`${d.day}T12:00:00`)
    return { key: d.day, label: harvest.daily.length > 8 ? fmt.dayMonth(date.toISOString()) : fmt.weekday(date.toISOString()), title: fmt.dayMonth(date.toISOString()), values: d.bySpecies }
  })
  const used = series.filter((s) => data.some((d) => d.values[s.key]))

  return (
    <Card labelledBy="harvest-title">
      <CardHeader
        id="harvest-title"
        icon={<Wheat aria-hidden className="size-4" />}
        title={t('harvest.title')}
        subtitle={snapshot.period === 'today' ? t('harvest.subtitleToday') : t('harvest.subtitle', { period: t(`period.${snapshot.period}`).toLowerCase() })}
        action={<CardLink to="/harvest">{t('common.viewAll')}</CardLink>}
      />
      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <StatBlock label={t('harvest.net')} value={fmt.pounds(harvest.totals.net)} hint={t('harvest.flushes', { count: harvest.totals.flushes })} />
        <StatBlock label={t('harvest.waste')} value={fmt.percent(wastePct)} hint={fmt.pounds(harvest.totals.waste)} />
        <StatBlock label={t('harvest.efficiency')} value={production.yield.efficiency !== null ? fmt.percent(production.yield.efficiency) : '—'} hint={t('harvest.efficiencyHint')} />
        <StatBlock label={t('harvest.costPerLb')} value={production.yield.costPerLb !== null ? fmt.exactCurrency(production.yield.costPerLb) : '—'} hint={t('harvest.costHint')} />
      </div>
      <StackedBarChart data={data} series={used} format={fmt.pounds} label={t('harvest.chartLabel')} />
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label={t('common.legend')}>
        {used.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </Card>
  )
}
