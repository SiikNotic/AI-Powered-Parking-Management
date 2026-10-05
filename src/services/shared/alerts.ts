/** Derives alert drafts from farm records plus recent sensor history. Shared by demo and Supabase. */
import { deriveAlerts } from '@/domain/alerts'
import { evaluateRoom, metricStatus, type RoomEnvironment } from '@/domain/environment'
import { expiringLots, stockByProduct, summarizeInventory } from '@/domain/inventory'
import type { EnvironmentalReading, Metric } from '@/types'
import type { FarmRecords } from './records'

/** `history` holds each room's recent readings, oldest first. */
export function environmentOf(data: FarmRecords, history: Map<string, EnvironmentalReading[]>, now: Date): RoomEnvironment[] {
  const hourAgo = new Date(now.getTime() - 3_600_000).toISOString()
  return data.rooms.map((room) => {
    const list = history.get(room.id) ?? []
    let past: EnvironmentalReading | null = null
    for (const r of list) {
      if (r.timestamp > hourAgo) break
      past = r
    }
    return evaluateRoom(room, list[list.length - 1] ?? null, past, now)
  })
}

export function buildAlertDrafts(data: FarmRecords, history: Map<string, EnvironmentalReading[]>, now: Date) {
  const stock = stockByProduct(data.movements)
  const lastMovementAt = new Map<string, string>()
  for (const m of data.movements) if (m.date <= now.toISOString()) lastMovementAt.set(m.productId, m.date)
  const roomById = new Map(data.rooms.map((r) => [r.id, r]))
  // Walk back through the readings to find when the metric left its range.
  const onset = (roomId: string, metric: Metric) => {
    const room = roomById.get(roomId)
    const list = history.get(roomId) ?? []
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
    environment: environmentOf(data, history, now),
    batches: data.batches,
    harvests: data.harvests,
    species: data.species,
    lowStock: summarizeInventory(data.products, stock).lowStock,
    expiring: expiringLots(data.products, data.movements, now, 2),
    orders: data.orders,
    equipment: data.equipment,
    now,
  })
}
