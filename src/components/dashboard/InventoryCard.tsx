import { Boxes, Hourglass } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { DashboardSnapshot } from '@/services'
import { CardLink, StatBlock } from './shared'

export function InventoryCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const inv = snapshot.inventory
  const qty = (n: number, unit: string) => (unit === 'lb' ? fmt.pounds(n) : `${fmt.decimal(n)} ${t(`units.${unit as 'lb' | 'oz' | 'unit'}`)}`)
  const expiring = Object.values(
    inv.expiring.reduce<Record<string, { name: string; unit: string; quantity: number; expiresAt: string; daysLeft: number }>>((acc, lot) => {
      const row = acc[lot.product.id] ?? { name: lot.product.name, unit: lot.product.unit, quantity: 0, expiresAt: lot.expiresAt, daysLeft: lot.daysLeft }
      row.quantity += lot.quantity
      acc[lot.product.id] = row
      return acc
    }, {}),
  )

  return (
    <Card labelledBy="inventory-title">
      <CardHeader id="inventory-title" icon={<Boxes aria-hidden className="size-4" />} title={t('inventory.title')} subtitle={t('inventory.subtitle')} action={<CardLink to="/inventory">{t('common.viewAll')}</CardLink>} />
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label={t('inventory.fresh')} value={fmt.pounds(inv.freshLb)} />
        <StatBlock label={t('inventory.dried')} value={fmt.pounds(inv.driedLb)} />
        <StatBlock label={t('inventory.value')} value={fmt.currency(inv.value)} hint={t('inventory.atCost')} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-2 text-[0.8125rem] font-semibold text-text">{t('inventory.lowStock', { count: inv.lowStock.length })}</p>
          {inv.lowStock.length === 0 ? (
            <p className="text-xs text-text-muted">{t('inventory.noneLow')}</p>
          ) : (
            <ul className="space-y-2">
              {inv.lowStock.slice(0, 5).map((l) => {
                const pct = Math.min(1, l.quantity / Math.max(1, l.product.reorderPoint))
                return (
                  <li key={l.product.id}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-text-secondary">{l.product.name}</span>
                      <span className={cn('tabular shrink-0 font-semibold', l.out ? 'text-crit-ink' : 'text-warn-ink')}>
                        {l.out ? t('inventory.out') : qty(l.quantity, l.product.unit)}
                        <span className="font-normal text-text-muted"> / {qty(l.product.reorderPoint, l.product.unit)}</span>
                      </span>
                    </div>
                    <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className={cn('h-full rounded-full', l.out ? 'bg-crit' : 'bg-warn')} style={{ width: `${Math.max(2, pct * 100)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-text">
            <Hourglass aria-hidden className="size-3.5 text-text-muted" />
            {t('inventory.expiring')}
          </p>
          {expiring.length === 0 ? (
            <p className="text-xs text-text-muted">{t('inventory.noneExpiring')}</p>
          ) : (
            <ul className="space-y-1.5">
              {expiring.slice(0, 5).map((e) => (
                <li key={e.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-text-secondary">{e.name}</span>
                  <span className="shrink-0 text-right">
                    <span className="tabular font-semibold text-text">{qty(e.quantity, e.unit)}</span>{' '}
                    <span className={cn(e.daysLeft < 0 ? 'text-crit-ink' : e.daysLeft < 1 ? 'text-warn-ink' : 'text-text-muted')}>
                      · {e.daysLeft < 0 ? t('inventory.expired') : t('inventory.expires', { date: fmt.dayMonthTime(e.expiresAt) })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}
