/**
 * ⚠️ DEMO — derived state shared by the demo services (stock, environment,
 * alerts). A Supabase implementation computes the same through SQL views.
 */
import { getFarmDataset } from '@/data/demo'
import { deriveAlerts } from '@/domain/alerts'
import { evaluateRoom, metricStatus, type RoomEnvironment } from '@/domain/environment'
import { expiringLots, stockByProduct, summarizeInventory } from '@/domain/inventory'
import { latestReadings, readingNear, roomHistory } from './demoSensorProvider'

export function environmentFor(farmId: string, now = new Date()): RoomEnvironment[] {
  const data = getFarmDataset(farmId)
  const latest = new Map(latestReadings(farmId).map((r) => [r.roomId, r]))
  const hourAgo = new Date(now.getTime() - 3_600_000).toISOString()
  return data.rooms.map((room) => evaluateRoom(room, latest.get(room.id) ?? null, readingNear(farmId, room.id, hourAgo), now))
}

export function inventoryFor(farmId: string, now = new Date()) {
  const data = getFarmDataset(farmId)
  const stock = stockByProduct(data.movements)
  return { stock, summary: summarizeInventory(data.products, stock), expiring: expiringLots(data.products, data.movements, now, 2) }
}

export function alertDraftsFor(farmId: string, now = new Date()) {
  const data = getFarmDataset(farmId)
  const inventory = inventoryFor(farmId, now)
  const lastMovementAt = new Map<string, string>()
  for (const m of data.movements) if (m.date <= now.toISOString()) lastMovementAt.set(m.productId, m.date)
  const roomById = new Map(data.rooms.map((r) => [r.id, r]))
  // Walk back through the readings to find when the metric left its range.
  const onset = (roomId: string, metric: 'temperature' | 'humidity' | 'co2') => {
    const room = roomById.get(roomId)
    const list = roomHistory(farmId, roomId)
    if (!room || !list.length) return undefined
    let since = list[list.length - 1].timestamp
    for (let i = list.length - 1; i >= 0; i--) {
      if (metricStatus(metric, list[i][metric], room.targets[metric]) === 'ok') break
      since = list[i].timestamp
    }
    return since
  }
  return deriveAlerts({
    onset,
    lastMovementAt,
    environment: environmentFor(farmId, now),
    batches: data.batches,
    harvests: data.harvests,
    species: data.species,
    lowStock: inventory.summary.lowStock,
    expiring: inventory.expiring,
    orders: data.orders,
    equipment: data.equipment,
    now,
  })
}
