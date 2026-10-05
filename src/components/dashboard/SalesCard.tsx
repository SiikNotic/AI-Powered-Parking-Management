import { ShoppingCart } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { HorizontalBars } from '@/components/ui/HorizontalBars'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { DashboardSnapshot } from '@/services'
import { speciesColor } from './format'
import { CardLink, StatBlock } from './shared'

export function SalesCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const { sales, species, pnl } = snapshot
  const totalSpecies = sales.bySpecies.reduce((s, r) => s + r.revenue, 0)

  return (
    <Card labelledBy="sales-title">
      <CardHeader
        id="sales-title"
        icon={<ShoppingCart aria-hidden className="size-4" />}
        title={t('sales.title')}
        subtitle={t('sales.subtitle', { period: t(`period.${snapshot.period}`).toLowerCase() })}
        action={<CardLink to="/sales">{t('common.viewAll')}</CardLink>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatBlock label={t('sales.orders')} value={fmt.number(pnl.completedOrders)} />
        <StatBlock label={t('sales.average')} value={fmt.currency(pnl.averageOrder)} />
      </div>
      <p className="mb-2 text-[0.8125rem] font-semibold text-text">{t('sales.topProducts')}</p>
      {sales.topProducts.length === 0 ? (
        <p className="text-xs text-text-muted">{t('glance.noSales')}</p>
      ) : (
        <HorizontalBars
          label={t('sales.topProducts')}
          items={sales.topProducts.map((p) => ({ key: p.product.id, label: p.product.name, value: p.revenue, formatted: fmt.currency(p.revenue) }))}
        />
      )}
      {totalSpecies > 0 && (
        <>
          <p className="mb-2 mt-5 text-[0.8125rem] font-semibold text-text">{t('sales.bySpecies')}</p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            {sales.bySpecies.map((r) => {
              const sp = species.find((s) => s.id === r.speciesId)
              return <div key={r.speciesId} style={{ width: `${(r.revenue / totalSpecies) * 100}%`, background: speciesColor(sp?.colorIndex ?? 0) }} />
            })}
          </div>
          <ul className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 xs:grid-cols-2">
            {sales.bySpecies.map((r) => {
              const sp = species.find((s) => s.id === r.speciesId)
              return (
                <li key={r.speciesId} className="flex items-center gap-1.5 text-xs">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: speciesColor(sp?.colorIndex ?? 0) }} />
                  <span className="min-w-0 flex-1 truncate text-text-secondary">{sp?.name}</span>
                  <span className="tabular font-semibold text-text">{fmt.percent(r.revenue / totalSpecies)}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {sales.byChannel.length > 0 && (
        <>
          <p className="mb-1.5 mt-5 text-[0.8125rem] font-semibold text-text">{t('sales.byChannel')}</p>
          <ul className="space-y-1">
            {sales.byChannel.map((c) => (
              <li key={c.channel} className="flex justify-between gap-3 text-xs">
                <span className="text-text-secondary">{t(`channels.${c.channel}`)}</span>
                <span className="tabular font-semibold text-text">{fmt.currency(c.revenue)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
