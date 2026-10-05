/**
 * Inventory rules. Stock on hand is always the sum of movements; it is never
 * stored or edited directly. Outflows consume the oldest lots first (FIFO).
 */
import type { InventoryMovement, InventoryProduct } from '@/types'
import { DAY_MS } from './time'

export type StockMap = Map<string, number>

const EPSILON = 0.001

export function stockByProduct(movements: InventoryMovement[]): StockMap {
  const stock: StockMap = new Map()
  for (const m of movements) stock.set(m.productId, (stock.get(m.productId) ?? 0) + m.quantity)
  for (const [id, qty] of stock) stock.set(id, Math.round(qty * 100) / 100)
  return stock
}

/**
 * Validates a new outflow. Stock may only go negative through an explicit
 * ADJUSTMENT (which must carry a reason) — the database enforces the same rule.
 */
export function canApplyMovement(stock: StockMap, movement: Pick<InventoryMovement, 'productId' | 'quantity' | 'type' | 'reference'>): boolean {
  const next = (stock.get(movement.productId) ?? 0) + movement.quantity
  if (next >= -EPSILON) return true
  return movement.type === 'ADJUSTMENT' && Boolean(movement.reference?.trim())
}

/** Weight in lb of a quantity of product (null when the product has no weight). */
export function toPounds(product: InventoryProduct, quantity: number): number | null {
  if (product.unit === 'lb') return quantity
  if (product.unit === 'oz') return quantity / 16
  return product.unitWeight != null ? quantity * product.unitWeight : null
}

/** Mushroom products (fresh, dried, powder) — excludes supplies and grow kits. */
export function isMushroomProduct(p: InventoryProduct): boolean {
  return p.speciesId != null && (p.category === 'fresh' || p.category === 'dried' || p.category === 'powder')
}

export interface StockLine {
  product: InventoryProduct
  quantity: number
  value: number
  low: boolean
  out: boolean
}

export function stockLines(products: InventoryProduct[], stock: StockMap): StockLine[] {
  return products.map((product) => {
    const quantity = Math.max(0, stock.get(product.id) ?? 0)
    return { product, quantity, value: quantity * product.cost, low: quantity <= product.reorderPoint, out: quantity <= EPSILON }
  })
}

export interface InventorySummary {
  /** Mushroom stock available for sale, lb. */
  availableLb: number
  freshLb: number
  driedLb: number
  /** Value at cost of everything on hand. */
  value: number
  lowStock: StockLine[]
}

export function summarizeInventory(products: InventoryProduct[], stock: StockMap): InventorySummary {
  const lines = stockLines(products, stock)
  let freshLb = 0
  let driedLb = 0
  for (const line of lines) {
    if (!isMushroomProduct(line.product)) continue
    const lb = toPounds(line.product, line.quantity) ?? 0
    if (line.product.category === 'fresh') freshLb += lb
    else driedLb += lb
  }
  return {
    availableLb: freshLb + driedLb,
    freshLb,
    driedLb,
    value: lines.reduce((s, l) => s + l.value, 0),
    lowStock: lines.filter((l) => l.low).sort((a, b) => a.quantity / (a.product.reorderPoint || 1) - b.quantity / (b.product.reorderPoint || 1)),
  }
}

export interface ExpiringLot {
  product: InventoryProduct
  quantity: number
  expiresAt: string
  /** Days left (negative = already expired, still on hand). */
  daysLeft: number
}

/** Rebuilds the remaining lots (FIFO) and returns those expiring within `withinDays`. */
export function expiringLots(products: InventoryProduct[], movements: InventoryMovement[], now: Date, withinDays = 2): ExpiringLot[] {
  const perishable = new Map(products.filter((p) => p.perishable).map((p) => [p.id, p]))
  const lots = new Map<string, { qty: number; expiresAt: string | null }[]>()
  for (const m of movements) {
    if (!perishable.has(m.productId)) continue
    const list = lots.get(m.productId) ?? []
    if (m.quantity > 0) list.push({ qty: m.quantity, expiresAt: m.expiresAt })
    else {
      let remaining = -m.quantity
      for (const lot of list) {
        if (remaining <= EPSILON) break
        const take = Math.min(lot.qty, remaining)
        lot.qty -= take
        remaining -= take
      }
    }
    lots.set(m.productId, list.filter((l) => l.qty > EPSILON))
  }
  const limit = now.getTime() + withinDays * DAY_MS
  const result: ExpiringLot[] = []
  for (const [productId, list] of lots) {
    for (const lot of list) {
      if (!lot.expiresAt || new Date(lot.expiresAt).getTime() > limit) continue
      result.push({
        product: perishable.get(productId)!,
        quantity: Math.round(lot.qty * 100) / 100,
        expiresAt: lot.expiresAt,
        daysLeft: (new Date(lot.expiresAt).getTime() - now.getTime()) / DAY_MS,
      })
    }
  }
  return result.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
}
