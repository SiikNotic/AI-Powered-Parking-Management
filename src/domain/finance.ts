/**
 * Financial figures are always derived from orders and expenses — never stored
 * as totals. Revenue is recognised when an order is completed. Inventory
 * purchases (substrate, spawn, packaging, bags) are capitalised as stock and
 * reach the P&L through cost of goods sold, so they are not counted twice.
 */
import type { DateRange, Expense, ExpenseCategory, InventoryProduct, Order, OrderItem, SaleChannel } from '@/types'
import { dayKey, dayKeys, inRange } from './time'

export const INVENTORY_PURCHASE_CATEGORIES: ExpenseCategory[] = ['substrate', 'spawn', 'packaging']

export function isInventoryPurchase(expense: Expense): boolean {
  return INVENTORY_PURCHASE_CATEGORIES.includes(expense.category) || (expense.category === 'other' && /grow bags/i.test(expense.description))
}

export interface OrderTotals {
  subtotal: number
  discount: number
  tax: number
  total: number
  /** Revenue net of discount and tax. */
  netRevenue: number
  cogs: number
}

const lineTotal = (item: OrderItem) => item.quantity * item.unitPrice

export function orderTotals(order: Order): OrderTotals {
  const subtotal = order.items.reduce((s, i) => s + lineTotal(i), 0)
  const discount = subtotal * order.discount
  const netRevenue = subtotal - discount
  const tax = netRevenue * order.taxRate
  return { subtotal, discount, tax, total: netRevenue + tax, netRevenue, cogs: order.items.reduce((s, i) => s + i.quantity * i.unitCost, 0) }
}

export const isRecognized = (order: Order) => order.status === 'COMPLETED'
export const isOpen = (order: Order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED'

export interface ProfitAndLoss {
  revenue: number
  cogs: number
  grossProfit: number
  operatingExpenses: number
  /** COGS + operating expenses. */
  totalExpenses: number
  netProfit: number
  /** Net margin (0–1), null without revenue. */
  margin: number | null
  orders: number
  completedOrders: number
  averageOrder: number
}

export function profitAndLoss(orders: Order[], expenses: Expense[], range: DateRange): ProfitAndLoss {
  const inPeriod = orders.filter((o) => inRange(o.createdAt, range) && o.status !== 'CANCELLED')
  const completed = inPeriod.filter(isRecognized)
  let revenue = 0
  let cogs = 0
  for (const o of completed) {
    const t = orderTotals(o)
    revenue += t.netRevenue
    cogs += t.cogs
  }
  const operatingExpenses = expenses.filter((e) => inRange(e.date, range) && !isInventoryPurchase(e)).reduce((s, e) => s + e.amount, 0)
  const totalExpenses = cogs + operatingExpenses
  const netProfit = revenue - totalExpenses
  return {
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    operatingExpenses,
    totalExpenses,
    netProfit,
    margin: revenue > 0 ? netProfit / revenue : null,
    orders: inPeriod.length,
    completedOrders: completed.length,
    averageOrder: completed.length ? revenue / completed.length : 0,
  }
}

export interface DailyFinance {
  day: string
  revenue: number
  expenses: number
  profit: number
}

export function dailyFinance(orders: Order[], expenses: Expense[], range: DateRange): DailyFinance[] {
  const rows = new Map(dayKeys(range).map((day) => [day, { day, revenue: 0, expenses: 0, profit: 0 }]))
  for (const o of orders) {
    if (!isRecognized(o) || !inRange(o.createdAt, range)) continue
    const row = rows.get(dayKey(o.createdAt))
    if (!row) continue
    const t = orderTotals(o)
    row.revenue += t.netRevenue
    row.expenses += t.cogs
  }
  for (const e of expenses) {
    if (isInventoryPurchase(e) || !inRange(e.date, range)) continue
    const row = rows.get(dayKey(e.date))
    if (row) row.expenses += e.amount
  }
  return [...rows.values()].map((r) => ({ ...r, profit: r.revenue - r.expenses }))
}

export interface ProductSales {
  product: InventoryProduct
  quantity: number
  revenue: number
}

export function topProducts(orders: Order[], products: InventoryProduct[], range: DateRange, limit = 5): ProductSales[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  const totals = new Map<string, ProductSales>()
  for (const o of orders) {
    if (!isRecognized(o) || !inRange(o.createdAt, range)) continue
    for (const item of o.items) {
      const product = byId.get(item.productId)
      if (!product) continue
      const row = totals.get(product.id) ?? { product, quantity: 0, revenue: 0 }
      row.quantity += item.quantity
      row.revenue += lineTotal(item) * (1 - o.discount)
      totals.set(product.id, row)
    }
  }
  return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

export function revenueBySpecies(orders: Order[], products: InventoryProduct[], range: DateRange): Map<string, number> {
  const byId = new Map(products.map((p) => [p.id, p]))
  const totals = new Map<string, number>()
  for (const o of orders) {
    if (!isRecognized(o) || !inRange(o.createdAt, range)) continue
    for (const item of o.items) {
      const speciesId = byId.get(item.productId)?.speciesId
      if (speciesId) totals.set(speciesId, (totals.get(speciesId) ?? 0) + lineTotal(item) * (1 - o.discount))
    }
  }
  return totals
}

export function salesByChannel(orders: Order[], range: DateRange): Map<SaleChannel, number> {
  const totals = new Map<SaleChannel, number>()
  for (const o of orders) {
    if (!isRecognized(o) || !inRange(o.createdAt, range)) continue
    totals.set(o.channel, (totals.get(o.channel) ?? 0) + orderTotals(o).netRevenue)
  }
  return totals
}

export function expensesByCategory(expenses: Expense[], range: DateRange): Map<ExpenseCategory, number> {
  const totals = new Map<ExpenseCategory, number>()
  for (const e of expenses) {
    if (isInventoryPurchase(e) || !inRange(e.date, range)) continue
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount)
  }
  return totals
}
