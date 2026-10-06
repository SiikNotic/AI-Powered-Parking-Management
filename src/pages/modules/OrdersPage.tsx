import { AlertTriangle, CalendarClock, ClipboardList, Download, Plus, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NewOrderForm } from '@/components/modules/orders/NewOrderForm'
import { OrderStatusBadge, PaidBadge } from '@/components/modules/orders/OrderBadges'
import { OrderDrawer } from '@/components/modules/orders/OrderDrawer'
import { CHANNELS, isOverdue, ORDER_STATUSES, SALES_WRITERS } from '@/components/modules/orders/orderRules'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { FilterSelect, SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { isOpen, orderTotals } from '@/domain/finance'
import { addDays, dayKey } from '@/domain/time'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { downloadCsv } from '@/lib/csv'
import type { Order, OrderStatus, SaleChannel } from '@/types'

type Tab = 'open' | 'completed' | 'cancelled' | 'all'
type Row = Order & { customerName: string; total: number; netRevenue: number }

const inTab = (o: Order, tab: Tab) => (tab === 'open' ? isOpen(o) : tab === 'completed' ? o.status === 'COMPLETED' : tab === 'cancelled' ? o.status === 'CANCELLED' : true)

export function OrdersPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user } = useSession()
  const { data, status, retry } = useFarmData()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const [tab, setTab] = useState<Tab>(() => (params.get('q') ? 'all' : 'open'))
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [channel, setChannel] = useState<SaleChannel | ''>('')
  const [creating, setCreating] = useState(false)
  const [now] = useState(() => Date.now())
  const canEdit = SALES_WRITERS.includes(user.role)

  const allRows = useMemo<Row[]>(() => {
    if (!data) return []
    const names = new Map(data.customers.map((c) => [c.id, c.company ? `${c.name} · ${c.company}` : c.name]))
    return data.orders.map((o) => {
      const totals = orderTotals(o)
      return { ...o, customerName: names.get(o.customerId) ?? t('pages.orders.walkIn'), total: totals.total, netRevenue: totals.netRevenue }
    })
  }, [data, t])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter(
      (o) =>
        inTab(o, tab) &&
        (!statusFilter || o.status === statusFilter) &&
        (!channel || o.channel === channel) &&
        (!q || o.code.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)),
    )
  }, [allRows, query, tab, statusFilter, channel])

  const stats = useMemo(() => {
    const today = dayKey(new Date(now))
    const weekAgo = addDays(new Date(now), -7).toISOString()
    const open = allRows.filter(isOpen)
    const recent = allRows.filter((o) => o.status === 'COMPLETED' && o.createdAt >= weekAgo)
    return {
      open: open.length,
      openValue: open.reduce((s, o) => s + o.total, 0),
      dueToday: open.filter((o) => dayKey(o.dueAt) === today).length,
      overdue: open.filter((o) => isOverdue(o, now)).length,
      revenue: recent.reduce((s, o) => s + o.netRevenue, 0),
      completed: recent.length,
    }
  }, [allRows, now])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const selectedCode = params.get('order')
  const selected = data?.orders.find((o) => o.code === selectedCode)
  const openOrder = (code: string) =>
    setParams(
      (p) => {
        p.set('order', code)
        return p
      },
      { replace: true },
    )
  const closeOrder = () =>
    setParams(
      (p) => {
        p.delete('order')
        return p
      },
      { replace: true },
    )

  const exportCsv = () =>
    downloadCsv(
      `${t('pages.orders.csvName')}-${dayKey(new Date())}.csv`,
      [t('pages.orders.columns.code'), t('pages.orders.columns.date'), t('pages.orders.columns.customer'), t('pages.orders.columns.channel'), t('pages.orders.columns.items'), t('pages.orders.columns.total'), t('pages.orders.columns.status'), t('pages.orders.columns.paid'), t('pages.orders.columns.due')],
      rows.map((o) => [o.code, o.createdAt, o.customerName, t(`channels.${o.channel}`), o.items.length, o.total.toFixed(2), t(`orderStatus.${o.status}`), o.paid ? t('pages.orders.paid') : t('pages.orders.unpaid'), o.dueAt]),
    )

  const columns: Column<Row>[] = [
    { key: 'code', header: t('pages.orders.columns.code'), cell: (o) => <span className="font-mono text-xs font-semibold text-text">{o.code}</span>, sort: (o) => o.code, className: 'whitespace-nowrap' },
    { key: 'date', header: t('pages.orders.columns.date'), cell: (o) => fmt.dayMonthTime(o.createdAt), sort: (o) => o.createdAt, hideOnMobile: true, className: 'whitespace-nowrap' },
    { key: 'customer', header: t('pages.orders.columns.customer'), cell: (o) => <span className="text-text">{o.customerName}</span>, sort: (o) => o.customerName },
    { key: 'channel', header: t('pages.orders.columns.channel'), cell: (o) => t(`channels.${o.channel}`), sort: (o) => o.channel, hideOnMobile: true },
    { key: 'items', header: t('pages.orders.columns.items'), align: 'right', cell: (o) => fmt.number(o.items.length), sort: (o) => o.items.length, hideOnMobile: true },
    { key: 'total', header: t('pages.orders.columns.total'), align: 'right', cell: (o) => <span className="font-medium text-text">{fmt.exactCurrency(o.total)}</span>, sort: (o) => o.total },
    { key: 'status', header: t('pages.orders.columns.status'), cell: (o) => <OrderStatusBadge status={o.status} />, sort: (o) => ORDER_STATUSES.indexOf(o.status) },
    { key: 'paid', header: t('pages.orders.columns.paid'), cell: (o) => <PaidBadge paid={o.paid} />, sort: (o) => (o.paid ? 1 : 0) },
    {
      key: 'due',
      header: t('pages.orders.columns.due'),
      cell: (o) =>
        isOverdue(o, now) ? (
          <span className="inline-flex items-center gap-1 font-semibold text-crit-ink">
            <AlertTriangle aria-hidden className="size-3.5 shrink-0" />
            <span className="sr-only">{t('pages.orders.overdue')}: </span>
            {fmt.dayMonthTime(o.dueAt)}
          </span>
        ) : (
          fmt.dayMonthTime(o.dueAt)
        ),
      sort: (o) => o.dueAt,
      className: 'whitespace-nowrap',
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.orders.title')}
        description={t('pages.orders.subtitle')}
        actions={
          data ? (
            <>
              <Button onClick={exportCsv} disabled={!rows.length}>
                <Download aria-hidden className="size-4" />
                {t('table.exportCsv')}
              </Button>
              {canEdit && (
                <Button variant="primary" onClick={() => setCreating(true)}>
                  <Plus aria-hidden className="size-4" />
                  {t('pages.orders.new')}
                </Button>
              )}
            </>
          ) : undefined
        }
      />
      {!data ? (
        <LoadingState className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-card" />
        </LoadingState>
      ) : (
        <>
          <StatGrid>
            <StatCard label={t('pages.orders.stats.open')} value={fmt.number(stats.open)} hint={t('pages.orders.stats.openHint', { amount: fmt.currency(stats.openValue) })} icon={<ClipboardList aria-hidden className="size-3.5" />} />
            <StatCard label={t('pages.orders.stats.dueToday')} value={fmt.number(stats.dueToday)} hint={t('pages.orders.stats.dueTodayHint')} icon={<CalendarClock aria-hidden className="size-3.5" />} />
            <StatCard
              label={t('pages.orders.stats.overdue')}
              value={fmt.number(stats.overdue)}
              tone={stats.overdue ? 'danger' : 'default'}
              hint={t('pages.orders.stats.overdueHint')}
              icon={<AlertTriangle aria-hidden className="size-3.5" />}
            />
            <StatCard label={t('pages.orders.stats.revenue7d')} value={fmt.currency(stats.revenue)} hint={t('pages.orders.stats.revenueHint', { count: stats.completed })} icon={<TrendingUp aria-hidden className="size-3.5" />} />
          </StatGrid>
          <Card>
            <div className="mb-3 overflow-x-auto">
              <SegmentedControl<Tab>
                label={t('pages.orders.tabsLabel')}
                value={tab}
                onChange={setTab}
                options={(['open', 'completed', 'cancelled', 'all'] as const).map((v) => ({ value: v, label: `${t(`pages.orders.tabs.${v}`)} (${allRows.filter((o) => inTab(o, v)).length})` }))}
              />
            </div>
            <Toolbar className="mb-4">
              <SearchInput value={query} onChange={setQuery} placeholder={t('pages.orders.searchPlaceholder')} />
              <FilterSelect label={t('pages.orders.status')} value={statusFilter} onChange={setStatusFilter} options={ORDER_STATUSES.map((s) => ({ value: s, label: t(`orderStatus.${s}`) }))} />
              <FilterSelect label={t('pages.orders.channel')} value={channel} onChange={setChannel} options={CHANNELS.map((c) => ({ value: c, label: t(`channels.${c}`) }))} />
            </Toolbar>
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(o) => o.id}
              label={t('pages.orders.title')}
              onRowClick={(o) => openOrder(o.code)}
              emptyTitle={!data.orders.length ? t('table.empty') : tab === 'open' && !query && !statusFilter && !channel ? t('pages.orders.emptyOpen') : t('table.noMatches')}
              initialSort={{ key: 'date', dir: 'desc' }}
              mobileTitle={(o) => (
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{o.code}</span>
                  <span className="text-xs font-normal text-text-muted">{fmt.dayMonthTime(o.createdAt)}</span>
                </span>
              )}
            />
          </Card>
        </>
      )}
      {creating && data && (
        <NewOrderForm
          onClose={() => setCreating(false)}
          onCreated={(code) => {
            setCreating(false)
            openOrder(code)
          }}
        />
      )}
      {selected && data && <OrderDrawer order={selected} data={data} canEdit={canEdit} onClose={closeOrder} />}
    </PageShell>
  )
}
