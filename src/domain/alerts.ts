/**
 * Alerts are derived from the farm's current state. Each alert's id is built
 * from its cause, so acknowledging or resolving it survives recomputation.
 */
import type { Equipment, FarmAlert, Harvest, Metric, MushroomSpecies, Order, ProductionBatch } from '@/types'
import type { RoomEnvironment } from './environment'
import type { ExpiringLot, StockLine } from './inventory'
import { isOpen } from './finance'
import { isOverdue } from './production'
import { DAY_MS } from './time'

export interface AlertInputs {
  environment: RoomEnvironment[]
  batches: ProductionBatch[]
  harvests: Harvest[]
  species: MushroomSpecies[]
  lowStock: StockLine[]
  expiring: ExpiringLot[]
  orders: Order[]
  equipment: Equipment[]
  now: Date
  /** When a room's metric first left its range (from sensor history). */
  onset?: (roomId: string, metric: Metric, status: 'warning' | 'critical') => string | undefined
  /** When each product's stock last changed (the moment it fell low). */
  lastMovementAt?: Map<string, string>
}

type Draft = Omit<FarmAlert, 'status'>

const UNIT: Record<Metric, string> = { temperature: '°F', humidity: '%', co2: 'ppm' }

export function deriveAlerts(input: AlertInputs): Draft[] {
  const { now } = input
  const alerts: Draft[] = []
  const nowIso = now.toISOString()

  for (const env of input.environment) {
    const { room, reading } = env
    if (env.status === 'offline') {
      alerts.push({
        id: `sensor_offline:${room.id}`,
        type: 'sensor_offline',
        severity: 'critical',
        createdAt: reading?.timestamp ?? nowIso,
        location: room.name,
        params: { sensor: room.sensorId },
        link: '/environment',
      })
      continue
    }
    if (!reading) continue
    for (const metric of ['temperature', 'humidity', 'co2'] as const) {
      const status = env.metrics[metric]
      if (status === 'ok') continue
      const target = room.targets[metric]
      const high = reading[metric] > target.max
      const type = metric === 'co2' ? 'co2_high' : (`${metric}_${high ? 'high' : 'low'}` as const)
      alerts.push({
        id: `${type}:${room.id}`,
        type,
        severity: status === 'critical' ? 'critical' : 'warning',
        createdAt: input.onset?.(room.id, metric, status) ?? reading.timestamp,
        location: room.name,
        params: { value: reading[metric], min: target.min, max: target.max, unit: UNIT[metric] },
        link: '/environment',
      })
    }
  }

  const speciesName = new Map(input.species.map((s) => [s.id, s.name]))
  for (const b of input.batches) {
    if (!isOverdue(b, input.harvests, now)) continue
    const days = Math.floor((now.getTime() - new Date(b.expectedHarvestDate).getTime()) / DAY_MS)
    alerts.push({
      id: `batch_overdue:${b.id}`,
      type: 'batch_overdue',
      severity: 'warning',
      createdAt: new Date(new Date(b.expectedHarvestDate).getTime() + DAY_MS).toISOString(),
      location: `#${b.code}`,
      params: { batch: b.code, species: speciesName.get(b.speciesId) ?? '', days },
      link: '/batches',
    })
  }

  for (const line of input.lowStock) {
    alerts.push({
      id: `low_inventory:${line.product.id}`,
      type: 'low_inventory',
      severity: line.out ? 'critical' : 'warning',
      createdAt: input.lastMovementAt?.get(line.product.id) ?? nowIso,
      location: line.product.name,
      params: { product: line.product.name, quantity: Math.round(line.quantity * 10) / 10, unit: line.product.unit, reorder: line.product.reorderPoint },
      link: '/inventory',
    })
  }

  // One alert per product, for its soonest-expiring lot.
  const seen = new Set<string>()
  for (const lot of input.expiring) {
    if (seen.has(lot.product.id)) continue
    seen.add(lot.product.id)
    const quantity = input.expiring.filter((l) => l.product.id === lot.product.id).reduce((s, l) => s + l.quantity, 0)
    alerts.push({
      id: `expiring:${lot.product.id}:${lot.expiresAt.slice(0, 10)}`,
      type: 'expiring',
      severity: lot.daysLeft < 1 ? 'warning' : 'info',
      createdAt: new Date(new Date(lot.expiresAt).getTime() - 2 * DAY_MS).toISOString(),
      location: lot.product.name,
      params: { product: lot.product.name, quantity: Math.round(quantity * 10) / 10, unit: lot.product.unit, expiresAt: lot.expiresAt },
      link: '/inventory',
    })
  }

  for (const o of input.orders) {
    if (!isOpen(o) || new Date(o.dueAt).getTime() >= now.getTime()) continue
    alerts.push({
      id: `order_overdue:${o.id}`,
      type: 'order_overdue',
      severity: 'warning',
      createdAt: o.dueAt,
      location: o.code,
      params: { order: o.code, dueAt: o.dueAt },
      link: '/orders',
    })
  }

  for (const e of input.equipment) {
    if (e.status !== 'maintenance_due') continue
    const overdue = new Date(e.nextMaintenance).getTime() < now.getTime()
    alerts.push({
      id: `maintenance_due:${e.id}:${e.nextMaintenance.slice(0, 10)}`,
      type: 'maintenance_due',
      severity: overdue ? 'warning' : 'info',
      createdAt: new Date(new Date(e.nextMaintenance).getTime() - 3 * DAY_MS).toISOString(),
      location: e.name,
      params: { equipment: e.name, dueAt: e.nextMaintenance },
      link: '/equipment',
    })
  }

  const order = { critical: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || b.createdAt.localeCompare(a.createdAt))
}
