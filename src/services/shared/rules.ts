/** Business rules shared by the demo and Supabase write paths (the database enforces the same). */
import { canApplyMovement, type StockMap } from '@/domain/inventory'
import type { BatchStatus, InventoryProduct, MovementType, Order, ProductionBatch } from '@/types'
import { ServiceError } from '../errors'

/** Allowed next statuses for a batch (forward through the cycle, or lost). */
export const BATCH_FLOW: Record<BatchStatus, BatchStatus[]> = {
  PLANNED: ['INOCULATED', 'DISCARDED'],
  INOCULATED: ['COLONIZING', 'FAILED', 'DISCARDED'],
  COLONIZING: ['FRUITING', 'FAILED', 'DISCARDED'],
  FRUITING: ['READY_TO_HARVEST', 'HARVESTED', 'FAILED', 'DISCARDED'],
  READY_TO_HARVEST: ['HARVESTED', 'FAILED', 'DISCARDED'],
  HARVESTED: ['READY_TO_HARVEST', 'COMPLETED'],
  COMPLETED: [],
  FAILED: [],
  DISCARDED: [],
}

export const ORDER_FLOW: Record<Order['status'], Order['status'][]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  PREPARING: ['READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

/** Statuses at which an order's stock has left the farm. */
export const SHIPPED_STATUSES: Order['status'][] = ['OUT_FOR_DELIVERY', 'COMPLETED']

export function assertBatchTransition(batch: ProductionBatch, next: BatchStatus) {
  if (!BATCH_FLOW[batch.status].includes(next)) throw new ServiceError('invalid', `Batch cannot go from ${batch.status} to ${next}`)
}

export function assertOrderTransition(order: Order, next: Order['status']) {
  if (!ORDER_FLOW[order.status].includes(next)) throw new ServiceError('closed', `Order cannot go from ${order.status} to ${next}`)
}

/** Milestone dates stamped when a batch reaches a stage. */
export function batchDates(status: BatchStatus, nowIso: string): Partial<Pick<ProductionBatch, 'inoculationDate' | 'colonizationDate' | 'fruitingDate'>> {
  if (status === 'INOCULATED') return { inoculationDate: nowIso }
  if (status === 'COLONIZING') return { colonizationDate: nowIso }
  if (status === 'FRUITING') return { fruitingDate: nowIso }
  return {}
}

/** Product that receives a species' harvest: fresh bulk (lb), else dried bulk. */
export function harvestProduct(products: InventoryProduct[], speciesId: string): InventoryProduct {
  const fresh = products.find((p) => p.speciesId === speciesId && p.category === 'fresh' && p.unit === 'lb')
  const dried = products.find((p) => p.speciesId === speciesId && p.category === 'dried' && p.unit === 'lb')
  const product = fresh ?? dried
  if (!product) throw new ServiceError('invalid', 'No bulk product exists for this species. Create one in Products first.')
  return product
}

/** Drying keeps about 35% of the net wet weight. */
export const DRY_YIELD = 0.35

export function assertStock(stock: StockMap, productId: string, quantity: number, type: MovementType, reference?: string) {
  if (!canApplyMovement(stock, { productId, quantity, type, reference })) throw new ServiceError('insufficient_stock')
}

export function nextOrderCode(orders: Pick<Order, 'code'>[]): string {
  const max = orders.reduce((m, o) => {
    const n = /^ORD-(\d+)$/.exec(o.code)
    return n ? Math.max(m, Number(n[1])) : m
  }, 1000)
  return `ORD-${max + 1}`
}

export function nextBatchCode(batches: Pick<ProductionBatch, 'code'>[], year: number): string {
  const max = batches.reduce((m, b) => {
    const n = new RegExp(`^${year}-(\\d+)$`).exec(b.code)
    return n ? Math.max(m, Number(n[1])) : m
  }, 0)
  return `${year}-${String(max + 1).padStart(5, '0')}`
}
