/**
 * Builds the dashboard snapshot from a farm's records with the domain
 * functions. Shared by the demo and Supabase services so both report the
 * same figures.
 */
import { dailyFinance, isOpen, profitAndLoss, revenueBySpecies, salesByChannel, topProducts } from '@/domain/finance'
import { expiringLots, stockByProduct, summarizeInventory, toPounds } from '@/domain/inventory'
import { dailyHarvest, expectedYield, harvestBySpecies, harvestForecast, harvestTotals, isActive, isOverdue, pipelineCounts, yieldStats } from '@/domain/production'
import { inRange, periodRange, previousRange } from '@/domain/time'
import type { Period, ProductionBatch } from '@/types'
import type { BatchSummary, DashboardSnapshot } from '../contracts'
import type { FarmRecords } from './records'

export function buildSnapshot(data: FarmRecords, period: Period, now: Date, userName: (id: string) => string | undefined = () => undefined): DashboardSnapshot {
  const range = periodRange(period, now)
  const prev = previousRange(range)
  const today = periodRange('today', now)
  const yesterday = previousRange(today)

  const pnl = profitAndLoss(data.orders, data.expenses, range)
  const prevPnl = profitAndLoss(data.orders, data.expenses, prev)
  const stock = stockByProduct(data.movements)
  const inventory = { summary: summarizeInventory(data.products, stock), expiring: expiringLots(data.products, data.movements, now, 2) }

  const speciesById = new Map(data.species.map((s) => [s.id, s]))
  const roomById = new Map(data.rooms.map((r) => [r.id, r]))
  const harvestedByBatch = new Map<string, number>()
  for (const h of data.harvests) harvestedByBatch.set(h.batchId, (harvestedByBatch.get(h.batchId) ?? 0) + h.wetWeight)
  const summarize = (b: ProductionBatch): BatchSummary => {
    const sp = speciesById.get(b.speciesId)
    return {
      ...b,
      speciesName: sp?.name ?? '—',
      roomName: roomById.get(b.roomId)?.name ?? '—',
      harvestedLb: harvestedByBatch.get(b.id) ?? 0,
      expectedLb: sp ? expectedYield(b, sp) : 0,
    }
  }

  const forecast = harvestForecast(data.batches, data.harvests, data.species, now)
  const productById = new Map(data.products.map((p) => [p.id, p]))
  const soldLb = data.movements
    .filter((m) => m.type === 'SOLD' && inRange(m.date, range))
    .reduce((s, m) => {
      const p = productById.get(m.productId)
      return s + (p && p.speciesId ? (toPounds(p, -m.quantity) ?? 0) : 0)
    }, 0)
  const employeeName = new Map(data.employees.map((e) => [e.id, e.name]))
  const ordersIn = (r: typeof range) => data.orders.filter((o) => inRange(o.createdAt, r) && o.status !== 'CANCELLED').length
  const sortDesc = <T,>(entries: [string, number][], map: (id: string, v: number) => T) => entries.sort((a, b) => b[1] - a[1]).map(([id, v]) => map(id, v))

  const snapshot: DashboardSnapshot = {
    farm: data.farm,
    period,
    range,
    generatedAt: now.toISOString(),
    species: data.species,
    rooms: data.rooms,
    kpis: {
      harvestToday: { value: harvestTotals(data.harvests, today).net, previous: harvestTotals(data.harvests, yesterday).net },
      inventoryLb: inventory.summary.availableLb,
      inventoryValue: inventory.summary.value,
      openOrders: data.orders.filter(isOpen).length,
      ordersInPeriod: { value: ordersIn(range), previous: ordersIn(prev) },
      revenue: { value: pnl.revenue, previous: prevPnl.revenue },
      expenses: { value: pnl.totalExpenses, previous: prevPnl.totalExpenses },
      netProfit: { value: pnl.netProfit, previous: prevPnl.netProfit },
      activeBatches: data.batches.filter(isActive).length,
      readyToHarvest: data.batches.filter((b) => b.status === 'READY_TO_HARVEST').length,
      lowStockItems: inventory.summary.lowStock.length,
    },
    pnl,
    finance: dailyFinance(data.orders, data.expenses, period === 'today' ? periodRange('7d', now) : range),
    harvest: {
      totals: harvestTotals(data.harvests, range),
      daily: dailyHarvest(data.harvests, data.batches, period === 'today' ? periodRange('7d', now) : range),
      bySpecies: sortDesc([...harvestBySpecies(data.harvests, data.batches, range)], (speciesId, lb) => ({ speciesId, lb })),
    },
    production: {
      pipeline: pipelineCounts(data.batches),
      yield: yieldStats(data.batches, data.harvests, data.species),
      forecast,
      ready: forecast.readySoon.map(summarize),
      overdue: data.batches.filter((b) => isOverdue(b, data.harvests, now)).map(summarize),
    },
    inventory: { ...inventory.summary, expiring: inventory.expiring },
    sales: {
      soldLb,
      topProducts: topProducts(data.orders, data.products, range),
      bySpecies: sortDesc([...revenueBySpecies(data.orders, data.products, range)], (speciesId, revenue) => ({ speciesId, revenue })),
      byChannel: sortDesc([...salesByChannel(data.orders, range)], (channel, revenue) => ({ channel: channel as DashboardSnapshot['sales']['byChannel'][number]['channel'], revenue })),
    },
    tasks: data.tasks
      .map((t) => ({ ...t, assigneeName: employeeName.get(t.assigneeId) ?? '—' }))
      .sort((a, b) => Number(a.status === 'COMPLETED') - Number(b.status === 'COMPLETED') || a.dueAt.localeCompare(b.dueAt)),
    activity: data.audit.slice(0, 12).map((a) => ({ ...a, userName: userName(a.userId) ?? employeeName.get(a.userId) ?? '—' })),
  }
  return snapshot
}
