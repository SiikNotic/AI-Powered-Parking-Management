import { ArrowLeftRight, Boxes, Coins, FlaskConical, Lock, Receipt, ShoppingCart, Wheat } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toDateInput } from '@/components/modules/expenses/periods'
import { ReportCard, type Cell, type ReportTable } from '@/components/modules/reports/ReportCard'
import { Card } from '@/components/ui/Card'
import { Field, Select } from '@/components/ui/Form'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import { isRecognized, orderTotals, profitAndLoss } from '@/domain/finance'
import { stockByProduct } from '@/domain/inventory'
import { expectedYield } from '@/domain/production'
import { inRange } from '@/domain/time'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { FarmData } from '@/services'
import type { DateRange } from '@/types'

const r2 = (n: number) => Math.round(n * 100) / 100
const day = (iso: string) => toDateInput(new Date(iso))
const byDate = <T,>(get: (x: T) => string) => (a: T, b: T) => get(a).localeCompare(get(b))

export function ReportsPage() {
  const { t } = useI18n()
  const { can } = useSession()
  const { data, status, retry } = useFarmData()

  const allowed = {
    production: can('production.view'),
    inventory: can('inventory.view'),
    sales: can('sales.view'),
    finance: can('finance.view'),
  }
  const anyAllowed = Object.values(allowed).some(Boolean)

  const lookups = useMemo(() => (data ? buildLookups(data) : null), [data])

  if (!anyAllowed) {
    return (
      <PageShell>
        <PageHeader title={t('pages.reports.title')} />
        <Card>
          <EmptyState icon={Lock} title={t('pages.reports.noAccess.title')} description={t('pages.reports.noAccess.description')} />
        </Card>
      </PageShell>
    )
  }
  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  return (
    <PageShell>
      <PageHeader title={t('pages.reports.title')} description={t('pages.reports.subtitle')} />
      {!data || !lookups ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80 rounded-card" />
          ))}
        </div>
      ) : (
        <Reports data={data} lookups={lookups} allowed={allowed} />
      )}
    </PageShell>
  )
}

type Lookups = ReturnType<typeof buildLookups>

function buildLookups(data: FarmData) {
  return {
    species: new Map(data.species.map((s) => [s.id, s])),
    rooms: new Map(data.rooms.map((r) => [r.id, r.name])),
    batches: new Map(data.batches.map((b) => [b.id, b])),
    products: new Map(data.products.map((p) => [p.id, p])),
    customers: new Map(data.customers.map((c) => [c.id, c.company || c.name])),
    employees: new Map(data.employees.map((e) => [e.id, e.name])),
    harvestedByBatch: data.harvests.reduce((m, h) => m.set(h.batchId, (m.get(h.batchId) ?? 0) + h.wetWeight - h.wasteWeight), new Map<string, number>()),
  }
}

interface ReportsProps {
  data: FarmData
  lookups: Lookups
  allowed: Record<'production' | 'inventory' | 'sales' | 'finance', boolean>
}

function Reports({ data, lookups, allowed }: ReportsProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [salesView, setSalesView] = useState<'orders' | 'customers'>('orders')
  const L = lookups
  const speciesName = (id: string) => L.species.get(id)?.name ?? '—'

  const production = (range: DateRange): ReportTable => {
    const batches = data.batches.filter((b) => inRange(b.spawnDate, range)).sort(byDate((b) => b.spawnDate))
    let net = 0
    const rows = batches.map((b): Cell[] => {
      const species = L.species.get(b.speciesId)
      const expected = species ? expectedYield(b, species) : 0
      const harvested = L.harvestedByBatch.get(b.id) ?? 0
      net += harvested
      return [b.code, speciesName(b.speciesId), L.rooms.get(b.roomId) ?? '—', t(`batch.status.${b.status}`), day(b.spawnDate), day(b.expectedHarvestDate), r2(b.substrateWeight), r2(expected), r2(harvested), expected > 0 ? r2((harvested / expected) * 100) : '']
    })
    return {
      header: (['batch', 'species', 'room', 'status', 'spawnDate', 'expectedHarvest', 'substrate', 'expected', 'harvested', 'yield'] as const).map((k) => t(`pages.reports.production.columns.${k}`)),
      rows,
      summary: t('pages.reports.production.summary', { count: fmt.number(rows.length), net: fmt.pounds(net) }),
    }
  }

  const harvest = (range: DateRange): ReportTable => {
    const list = data.harvests.filter((h) => inRange(h.date, range)).sort(byDate((h) => h.date))
    const net = list.reduce((s, h) => s + h.wetWeight - h.wasteWeight, 0)
    return {
      header: (['date', 'batch', 'species', 'room', 'wet', 'waste', 'net', 'grade', 'employee'] as const).map((k) => t(`pages.reports.harvest.columns.${k}`)),
      rows: list.map((h) => {
        const batch = L.batches.get(h.batchId)
        return [day(h.date), batch?.code ?? '—', batch ? speciesName(batch.speciesId) : '—', L.rooms.get(h.roomId) ?? '—', r2(h.wetWeight), r2(h.wasteWeight), r2(h.wetWeight - h.wasteWeight), t(`labels.grade.${h.grade}`), L.employees.get(h.employeeId) ?? '—']
      }),
      summary: t('pages.reports.harvest.summary', { net: fmt.pounds(net), count: fmt.number(list.length) }),
    }
  }

  const valuation = (range: DateRange): ReportTable => {
    const stock = stockByProduct(data.movements.filter((m) => m.date <= range.to))
    const products = [...data.products].sort((a, b) => a.name.localeCompare(b.name))
    let total = 0
    const rows = products.map((p): Cell[] => {
      const onHand = Math.max(0, stock.get(p.id) ?? 0)
      const value = onHand * p.cost
      total += value
      return [p.name, p.sku, t(`labels.productCategory.${p.category}`), t(`labels.unit.${p.unit}`), r2(onHand), r2(p.cost), r2(value)]
    })
    return {
      header: (['product', 'sku', 'category', 'unit', 'onHand', 'unitCost', 'value'] as const).map((k) => t(`pages.reports.valuation.columns.${k}`)),
      rows,
      summary: t('pages.reports.valuation.summary', { value: fmt.currency(total) }),
    }
  }

  const movements = (range: DateRange): ReportTable => {
    const list = data.movements.filter((m) => inRange(m.date, range)).sort(byDate((m) => m.date))
    return {
      header: (['date', 'product', 'type', 'quantity', 'unit', 'reference'] as const).map((k) => t(`pages.reports.movements.columns.${k}`)),
      rows: list.map((m) => {
        const p = L.products.get(m.productId)
        return [day(m.date), p?.name ?? '—', t(`labels.movementType.${m.type}`), r2(m.quantity), p ? t(`labels.unit.${p.unit}`) : '', m.reference ?? '']
      }),
      summary: t('pages.reports.movements.summary', { count: fmt.number(list.length) }),
    }
  }

  const customerName = (id: string) => L.customers.get(id) ?? t('pages.reports.walkIn')

  const sales = (range: DateRange): ReportTable => {
    const orders = data.orders.filter((o) => inRange(o.createdAt, range)).sort(byDate((o) => o.createdAt))
    const completedRevenue = orders.filter(isRecognized).reduce((s, o) => s + orderTotals(o).netRevenue, 0)
    const summary = t('pages.reports.sales.summary', { revenue: fmt.currency(completedRevenue) })
    if (salesView === 'orders') {
      return {
        header: (['order', 'date', 'customer', 'channel', 'status', 'items', 'subtotal', 'discount', 'tax', 'total', 'paid'] as const).map((k) => t(`pages.reports.sales.columns.${k}`)),
        rows: orders.map((o) => {
          const tot = orderTotals(o)
          return [o.code, day(o.createdAt), customerName(o.customerId), t(`channels.${o.channel}`), t(`orderStatus.${o.status}`), o.items.reduce((s, i) => s + i.quantity, 0), r2(tot.subtotal), r2(tot.discount), r2(tot.tax), r2(tot.total), o.paid ? t('pages.reports.yes') : t('pages.reports.no')]
        }),
        summary,
      }
    }
    const byCustomer = new Map<string, { orders: number; completed: number; revenue: number; total: number }>()
    for (const o of orders) {
      if (o.status === 'CANCELLED') continue
      const name = customerName(o.customerId)
      const row = byCustomer.get(name) ?? { orders: 0, completed: 0, revenue: 0, total: 0 }
      const tot = orderTotals(o)
      row.orders++
      row.total += tot.total
      if (isRecognized(o)) {
        row.completed++
        row.revenue += tot.netRevenue
      }
      byCustomer.set(name, row)
    }
    return {
      header: (['customer', 'orders', 'completed', 'revenue', 'total', 'average'] as const).map((k) => t(`pages.reports.sales.customerColumns.${k}`)),
      rows: [...byCustomer.entries()].sort((a, b) => b[1].revenue - a[1].revenue).map(([name, r]) => [name, r.orders, r.completed, r2(r.revenue), r2(r.total), r.completed ? r2(r.revenue / r.completed) : '']),
      summary,
    }
  }

  const expenses = (range: DateRange): ReportTable => {
    const list = data.expenses.filter((e) => inRange(e.date, range)).sort(byDate((e) => e.date))
    return {
      header: (['date', 'category', 'description', 'vendor', 'payment', 'amount', 'correction'] as const).map((k) => t(`pages.reports.expenses.columns.${k}`)),
      rows: list.map((e) => [day(e.date), t(`labels.expenseCategory.${e.category}`), e.description, e.vendor, t(`labels.paymentMethod.${e.paymentMethod}`), r2(e.amount), e.correctsId ? t('pages.reports.yes') : '']),
      summary: t('pages.reports.expenses.summary', { total: fmt.currency(list.reduce((s, e) => s + e.amount, 0)) }),
    }
  }

  const pnl = (range: DateRange): ReportTable => {
    const rows: Cell[][] = []
    const end = new Date(range.to)
    let net = 0
    for (let m = new Date(new Date(range.from).getFullYear(), new Date(range.from).getMonth(), 1); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const next = new Date(m.getFullYear(), m.getMonth() + 1, 1)
      const from = m.toISOString() > range.from ? m.toISOString() : range.from
      const to = new Date(next.getTime() - 1).toISOString() < range.to ? new Date(next.getTime() - 1).toISOString() : range.to
      const p = profitAndLoss(data.orders, data.expenses, { from, to })
      net += p.netProfit
      rows.push([`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`, r2(p.revenue), r2(p.cogs), r2(p.grossProfit), r2(p.operatingExpenses), r2(p.netProfit), p.margin === null ? '' : r2(p.margin * 100)])
    }
    return {
      header: (['month', 'revenue', 'cogs', 'gross', 'opex', 'net', 'margin'] as const).map((k) => t(`pages.reports.pnl.columns.${k}`)),
      rows,
      summary: t('pages.reports.pnl.summary', { value: fmt.currency(net) }),
    }
  }

  const icon = (I: typeof Wheat) => <I aria-hidden className="size-4" />

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {allowed.production && (
        <>
          <ReportCard id="report-production" title={t('pages.reports.production.title')} description={t('pages.reports.production.description')} icon={icon(FlaskConical)} filename={t('pages.reports.production.filename')} build={production} />
          <ReportCard id="report-harvest" title={t('pages.reports.harvest.title')} description={t('pages.reports.harvest.description')} icon={icon(Wheat)} filename={t('pages.reports.harvest.filename')} build={harvest} />
        </>
      )}
      {allowed.inventory && (
        <>
          <ReportCard id="report-valuation" mode="asOf" title={t('pages.reports.valuation.title')} description={t('pages.reports.valuation.description')} icon={icon(Boxes)} filename={t('pages.reports.valuation.filename')} build={valuation} />
          <ReportCard id="report-movements" title={t('pages.reports.movements.title')} description={t('pages.reports.movements.description')} icon={icon(ArrowLeftRight)} filename={t('pages.reports.movements.filename')} build={movements} />
        </>
      )}
      {allowed.sales && (
        <ReportCard
          id="report-sales"
          title={t('pages.reports.sales.title')}
          description={t('pages.reports.sales.description')}
          icon={icon(ShoppingCart)}
          filename={salesView === 'orders' ? t('pages.reports.sales.filename') : t('pages.reports.sales.filenameCustomers')}
          build={sales}
          controls={
            <Field label={t('pages.reports.view')} className="w-full sm:w-40">
              {(p) => (
                <Select {...p} value={salesView} onChange={(e) => setSalesView(e.target.value as 'orders' | 'customers')}>
                  <option value="orders">{t('pages.reports.sales.orders')}</option>
                  <option value="customers">{t('pages.reports.sales.byCustomer')}</option>
                </Select>
              )}
            </Field>
          }
        />
      )}
      {allowed.finance && (
        <>
          <ReportCard id="report-expenses" title={t('pages.reports.expenses.title')} description={t('pages.reports.expenses.description')} icon={icon(Receipt)} filename={t('pages.reports.expenses.filename')} build={expenses} />
          <ReportCard id="report-pnl" title={t('pages.reports.pnl.title')} description={t('pages.reports.pnl.description')} icon={icon(Coins)} filename={t('pages.reports.pnl.filename')} build={pnl} />
        </>
      )}
    </div>
  )
}
