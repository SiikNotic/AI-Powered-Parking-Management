import { Boxes, CircleDollarSign, ClipboardList, FlaskConical, PackageX, Receipt, TrendingUp, Wheat, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import type { Permission } from '@/domain/permissions'
import { useFormat } from '@/hooks/useFormat'
import { useI18n, type TranslationKey } from '@/i18n'
import { cn } from '@/lib/cn'
import type { DashboardSnapshot } from '@/services'
import { Delta } from './shared'

interface Kpi {
  key: string
  label: TranslationKey
  icon: LucideIcon
  to: string
  permission: Permission
  value: string
  footer: ReactNode
  tone?: 'default' | 'warning' | 'danger' | 'success'
}

export function KpiGrid({ snapshot }: { snapshot: DashboardSnapshot | undefined }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const { can } = useSession()

  if (!snapshot)
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[7.25rem] rounded-card" />
        ))}
      </div>
    )

  const k = snapshot.kpis
  const periodLabel = t(`period.${snapshot.period}`)
  const kpis: Kpi[] = [
    {
      key: 'harvest',
      label: 'kpi.harvestToday',
      icon: Wheat,
      to: '/harvest',
      permission: 'production.view',
      value: fmt.pounds(k.harvestToday.value),
      footer: (
        <>
          <Delta current={k.harvestToday.value} previous={k.harvestToday.previous} /> <span>{t('kpi.vsYesterday')}</span>
        </>
      ),
    },
    {
      key: 'inventory',
      label: 'kpi.inventory',
      icon: Boxes,
      to: '/inventory',
      permission: 'inventory.view',
      value: fmt.pounds(k.inventoryLb),
      footer: t('kpi.inventoryValue', { value: fmt.currency(k.inventoryValue) }),
    },
    {
      key: 'orders',
      label: 'kpi.orders',
      icon: ClipboardList,
      to: '/orders',
      permission: 'sales.view',
      value: fmt.number(k.ordersInPeriod.value),
      footer: t('kpi.openOrders', { count: k.openOrders }),
    },
    {
      key: 'revenue',
      label: 'kpi.revenue',
      icon: CircleDollarSign,
      to: '/sales',
      permission: 'finance.view',
      value: fmt.currency(k.revenue.value),
      footer: <Delta current={k.revenue.value} previous={k.revenue.previous} />,
    },
    {
      key: 'expenses',
      label: 'kpi.expenses',
      icon: Receipt,
      to: '/expenses',
      permission: 'finance.view',
      value: fmt.currency(k.expenses.value),
      footer: <Delta current={k.expenses.value} previous={k.expenses.previous} inverse />,
    },
    {
      key: 'profit',
      label: 'kpi.netProfit',
      icon: TrendingUp,
      to: '/profit-loss',
      permission: 'finance.view',
      value: fmt.currency(k.netProfit.value),
      tone: k.netProfit.value < 0 ? 'danger' : 'success',
      footer: snapshot.pnl.margin !== null ? t('kpi.margin', { value: fmt.percent(snapshot.pnl.margin) }) : t('kpi.noRevenue'),
    },
    {
      key: 'batches',
      label: 'kpi.activeBatches',
      icon: FlaskConical,
      to: '/batches',
      permission: 'production.view',
      value: fmt.number(k.activeBatches),
      footer: t('kpi.readyToHarvest', { count: k.readyToHarvest }),
    },
    {
      key: 'lowStock',
      label: 'kpi.lowStock',
      icon: PackageX,
      to: '/inventory',
      permission: 'inventory.view',
      value: fmt.number(k.lowStockItems),
      tone: k.lowStockItems > 0 ? 'warning' : 'default',
      footer: k.lowStockItems > 0 ? t('kpi.belowReorder') : t('kpi.allStocked'),
    },
  ].filter((kpi) => can(kpi.permission as Permission)) as Kpi[]

  return (
    <section aria-label={t('kpi.title')}>
      <ul className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', kpis.length >= 8 ? '2xl:grid-cols-8' : kpis.length > 4 ? 'xl:grid-cols-6' : '')}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          const finance = kpi.permission === 'finance.view' && kpi.key !== 'profit'
          return (
            <li key={kpi.key} className="min-w-0">
              <Link
                to={kpi.to}
                className="panel group flex h-full flex-col rounded-card p-3.5 transition-[border-color,transform] hover:-translate-y-px hover:border-border-strong sm:p-4"
                aria-label={`${t(kpi.label)}: ${kpi.value}. ${t('kpi.open', { module: t(kpi.label) })}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[0.75rem] font-medium text-text-secondary">
                    {t(kpi.label)}
                    {finance && <span className="text-text-muted"> · {periodLabel}</span>}
                  </span>
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-lg',
                      kpi.tone === 'warning' ? 'bg-warn-soft text-warn-ink' : kpi.tone === 'danger' ? 'bg-crit-soft text-crit-ink' : kpi.tone === 'success' ? 'bg-ok-soft text-ok-ink' : 'bg-surface-2 text-text-secondary',
                    )}
                  >
                    <Icon aria-hidden className="size-3.5" strokeWidth={2} />
                  </span>
                </span>
                <span className={cn('tabular mt-2 truncate font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] sm:text-2xl', kpi.tone === 'danger' ? 'text-crit-ink' : 'text-text')}>
                  {kpi.value}
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-x-1 pt-1.5 text-[0.75rem] text-text-muted">{kpi.footer}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
