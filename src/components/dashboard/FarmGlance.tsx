import { ArrowRight, CircleCheck, Compass } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader } from '@/components/ui/Card'
import { alertIcons, severityIconClass } from '@/config/alerts'
import { useSession } from '@/context/session'
import type { RoomEnvironment } from '@/domain/environment'
import { useAlertText } from '@/hooks/useAlertText'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { DashboardSnapshot } from '@/services'
import type { FarmAlert } from '@/types'

interface FarmGlanceProps {
  snapshot: DashboardSnapshot
  environment: RoomEnvironment[]
  alerts: FarmAlert[]
}

interface Answer {
  key: string
  question: string
  answer: ReactNode
  detail?: ReactNode
  to: string
  tone?: 'warning' | 'danger'
}

/** The questions a farm owner asks every morning, answered in one place. */
export function FarmGlance({ snapshot, environment, alerts }: FarmGlanceProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const text = useAlertText()
  const { can } = useSession()
  const s = snapshot
  const period = t(`period.${s.period}`).toLowerCase()
  const speciesName = (id: string) => s.species.find((x) => x.id === id)?.name ?? '—'
  const issues = environment.filter((r) => r.status !== 'ok')
  const expiringLb = s.inventory.expiring.reduce((sum, l) => sum + (l.product.unit === 'lb' ? l.quantity : l.quantity * (l.product.unitWeight ?? 0)), 0)
  const topProduct = s.sales.topProducts[0]
  const topSpecies = s.sales.bySpecies[0] ?? null
  const topHarvest = s.harvest.bySpecies[0] ?? null

  const answers: (Answer | false)[] = [
    can('production.view') && { key: 'produced', question: t('glance.produced', { period }), answer: fmt.pounds(s.harvest.totals.wet), detail: t('glance.producedDetail', { count: s.harvest.totals.flushes }), to: '/production' },
    can('production.view') && {
      key: 'harvested',
      question: t('glance.harvested', { period }),
      answer: fmt.pounds(s.harvest.totals.net),
      detail: t('glance.harvestedDetail', { waste: fmt.pounds(s.harvest.totals.waste) }),
      to: '/harvest',
    },
    can('inventory.view') && { key: 'available', question: t('glance.available'), answer: fmt.pounds(s.inventory.availableLb), detail: t('glance.availableDetail', { fresh: fmt.pounds(s.inventory.freshLb), dried: fmt.pounds(s.inventory.driedLb) }), to: '/inventory' },
    can('production.view') && { key: 'active', question: t('glance.activeBatches'), answer: fmt.number(s.kpis.activeBatches), detail: t('glance.activeDetail', { count: s.production.pipeline.COLONIZING }), to: '/batches' },
    can('production.view') && {
      key: 'ready',
      question: t('glance.ready'),
      answer: fmt.number(s.production.ready.length),
      detail: s.production.overdue.length ? t('glance.overdue', { count: s.production.overdue.length }) : t('glance.onSchedule'),
      to: '/batches',
      tone: s.production.overdue.length ? 'warning' : undefined,
    },
    can('sales.view') && { key: 'sold', question: t('glance.sold', { period }), answer: fmt.pounds(s.sales.soldLb), detail: t('glance.soldDetail', { count: s.pnl.completedOrders }), to: '/sales' },
    can('finance.view') && { key: 'spent', question: t('glance.spent', { period }), answer: fmt.currency(s.pnl.totalExpenses), detail: t('glance.spentDetail', { cogs: fmt.currency(s.pnl.cogs), opex: fmt.currency(s.pnl.operatingExpenses) }), to: '/expenses' },
    can('finance.view') && {
      key: 'earned',
      question: t('glance.earned', { period }),
      answer: fmt.currency(s.pnl.revenue),
      detail: t('glance.earnedDetail', { profit: fmt.currency(s.pnl.netProfit) }),
      to: '/profit-loss',
      tone: s.pnl.netProfit < 0 ? 'danger' : undefined,
    },
    can('sales.view') && { key: 'topProduct', question: t('glance.topProduct'), answer: topProduct ? topProduct.product.name : '—', detail: topProduct ? fmt.currency(topProduct.revenue) : t('glance.noSales'), to: '/products' },
    {
      key: 'topSpecies',
      question: t('glance.topSpecies'),
      answer: topSpecies && can('sales.view') ? speciesName(topSpecies.speciesId) : topHarvest ? speciesName(topHarvest.speciesId) : '—',
      detail: topSpecies && can('sales.view') ? t('glance.bySales', { value: fmt.currency(topSpecies.revenue) }) : topHarvest ? t('glance.byHarvest', { value: fmt.pounds(topHarvest.lb) }) : undefined,
      to: '/production',
    },
    can('inventory.view') && {
      key: 'expiring',
      question: t('glance.expiring'),
      answer: s.inventory.expiring.length ? fmt.pounds(expiringLb) : t('glance.none'),
      detail: s.inventory.expiring.length ? t('glance.expiringDetail', { count: new Set(s.inventory.expiring.map((l) => l.product.id)).size }) : t('glance.nothingExpiring'),
      to: '/inventory',
      tone: s.inventory.expiring.length ? 'warning' : undefined,
    },
    can('environment.view') && {
      key: 'environment',
      question: t('glance.environment'),
      answer: issues.length ? t('glance.rooms', { count: issues.length }) : t('glance.allInRange'),
      detail: issues.length ? issues.map((r) => r.room.name).join(', ') : t('glance.roomsMonitored', { count: environment.length }),
      to: '/environment',
      tone: issues.some((r) => r.status === 'critical' || r.status === 'offline') ? 'danger' : issues.length ? 'warning' : undefined,
    },
  ]

  const attention = alerts
    .filter((a) => a.status !== 'RESOLVED')
    .sort((a, b) => Number(a.status !== 'NEW') - Number(b.status !== 'NEW') || ['critical', 'warning', 'info'].indexOf(a.severity) - ['critical', 'warning', 'info'].indexOf(b.severity))
    .slice(0, 6)

  return (
    <Card labelledBy="glance-title" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <CardHeader id="glance-title" icon={<Compass aria-hidden className="size-4" />} title={t('glance.title')} subtitle={t('glance.subtitle')} />
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-glass-border bg-border xl:grid-cols-3 2xl:grid-cols-4">
          {answers.filter((a): a is Answer => Boolean(a)).map((a) => (
            <Link key={a.key} to={a.to} className="group flex min-w-0 flex-col bg-surface-raised/70 px-3 py-2.5 sm:px-3.5 sm:py-3 transition-colors hover:bg-surface-hover">
              <dt className="truncate text-[0.75rem] text-text-muted">{a.question}</dt>
              <dd className={cn('tabular mt-0.5 truncate font-display text-[1.0625rem] font-semibold', a.tone === 'danger' ? 'text-crit-ink' : a.tone === 'warning' ? 'text-warn-ink' : 'text-text')}>{a.answer}</dd>
              {a.detail && <dd className="truncate text-[0.6875rem] text-text-muted">{a.detail}</dd>}
            </Link>
          ))}
        </dl>
      </div>

      <div className="min-w-0 lg:border-l lg:border-border lg:pl-5" aria-labelledby="attention-title">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id="attention-title" className="font-display text-[0.9375rem] font-semibold text-text">
            {t('glance.attention')}
          </h3>
          <a href="#alerts" className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-ink hover:bg-brand-soft">
            {t('glance.allAlerts')}
          </a>
        </div>
        {attention.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-ok-soft px-3 py-3 text-sm text-ok-ink">
            <CircleCheck aria-hidden className="size-5 shrink-0" />
            {t('glance.allClear')}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {attention.map((a) => {
              const Icon = alertIcons[a.type]
              return (
                <li key={a.id}>
                  <Link to={a.link ?? '/#alerts'} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-hover">
                    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', severityIconClass[a.severity])}>
                      <Icon aria-hidden className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-medium text-text">{text(a).title}</span>
                      <span className="block truncate text-[0.6875rem] text-text-muted">
                        {a.location} · {fmt.relative(a.createdAt)}
                      </span>
                    </span>
                    <ArrowRight aria-hidden className="size-3.5 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
