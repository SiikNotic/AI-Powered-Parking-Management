/** Environmental status of a room: latest reading vs. its targets. */
import type { EnvironmentalReading, GrowRoom, Metric, Range } from '@/types'

export type MetricStatus = 'ok' | 'warning' | 'critical'
export type RoomStatus = MetricStatus | 'offline'

/** How far outside the target range a value may drift before it is critical. */
export const TOLERANCE: Record<Metric, number> = { temperature: 2, humidity: 5, co2: 250 }
/** A sensor with no reading for this long is considered offline. */
export const OFFLINE_AFTER_MS = 15 * 60_000

export const METRICS: Metric[] = ['temperature', 'humidity', 'co2']

export function metricStatus(metric: Metric, value: number, target: Range): MetricStatus {
  // Low CO₂ is never a problem for fruiting mushrooms.
  const below = metric === 'co2' ? 0 : target.min - value
  const above = value - target.max
  const deviation = Math.max(below, above)
  if (deviation <= 0) return 'ok'
  return deviation <= TOLERANCE[metric] ? 'warning' : 'critical'
}

export interface RoomEnvironment {
  room: GrowRoom
  reading: EnvironmentalReading | null
  status: RoomStatus
  metrics: Record<Metric, MetricStatus>
  /** Change over the last hour, per metric. */
  trend: Record<Metric, number>
}

const RANK: Record<RoomStatus, number> = { ok: 0, warning: 1, critical: 2, offline: 3 }

export function worst(a: RoomStatus, b: RoomStatus): RoomStatus {
  return RANK[a] >= RANK[b] ? a : b
}

export function evaluateRoom(room: GrowRoom, latest: EnvironmentalReading | null, hourAgo: EnvironmentalReading | null, now: Date): RoomEnvironment {
  const metrics: Record<Metric, MetricStatus> = { temperature: 'ok', humidity: 'ok', co2: 'ok' }
  const trend: Record<Metric, number> = { temperature: 0, humidity: 0, co2: 0 }
  if (!latest) return { room, reading: null, status: 'offline', metrics, trend }
  let status: RoomStatus = 'ok'
  for (const m of METRICS) {
    metrics[m] = metricStatus(m, latest[m], room.targets[m])
    status = worst(status, metrics[m])
    if (hourAgo) trend[m] = latest[m] - hourAgo[m]
  }
  if (now.getTime() - new Date(latest.timestamp).getTime() > OFFLINE_AFTER_MS) status = 'offline'
  return { room, reading: latest, status, metrics, trend }
}
