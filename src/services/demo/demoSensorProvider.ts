/**
 * ⚠️ DEMO sensor provider — simulates a live feed by nudging each room's last
 * reading every few seconds. Rooms with an active issue keep it (the sample
 * farm's Processing Area sensor stays offline).
 */
import { getFarmDataset } from '@/data/demo'
import type { EnvironmentalReading } from '@/types'
import { changeFeed } from '../changeFeed'
import type { SensorProvider } from '../contracts'
import { delay } from './delay'

const TICK_MS = 5_000
const OFFLINE_SENSORS = new Set(['SNS-PROCESSING'])

interface FarmFeed {
  history: Map<string, EnvironmentalReading[]>
  listeners: Set<(r: EnvironmentalReading) => void>
  timer: ReturnType<typeof setInterval> | null
}

const feeds = new Map<string, FarmFeed>()

function feed(farmId: string): FarmFeed {
  let f = feeds.get(farmId)
  if (!f) {
    const history = new Map<string, EnvironmentalReading[]>()
    for (const r of getFarmDataset(farmId).readings) history.set(r.roomId, [...(history.get(r.roomId) ?? []), r])
    f = { history, listeners: new Set(), timer: null }
    feeds.set(farmId, f)
  }
  return f
}

const jitter = (value: number, amount: number) => value + (Math.random() - 0.5) * 2 * amount

function tick(f: FarmFeed) {
  const now = new Date().toISOString()
  for (const [roomId, list] of f.history) {
    const last = list[list.length - 1]
    if (!last || OFFLINE_SENSORS.has(last.sensorId)) continue
    const next: EnvironmentalReading = {
      roomId,
      sensorId: last.sensorId,
      timestamp: now,
      temperature: Math.round(jitter(last.temperature, 0.15) * 10) / 10,
      humidity: Math.round(Math.min(99, jitter(last.humidity, 0.35)) * 10) / 10,
      co2: Math.round(jitter(last.co2, 12)),
    }
    list.push(next)
    if (list.length > 2_000) list.splice(0, list.length - 2_000)
    f.listeners.forEach((l) => l(next))
  }
  changeFeed.publish('sensors')
}

export const demoSensorProvider: SensorProvider = {
  getLatest(farmId) {
    const latest = [...feed(farmId).history.values()].map((list) => list[list.length - 1]).filter(Boolean)
    return delay(latest, 120)
  },
  getHistory(farmId, roomId, hours) {
    const from = new Date(Date.now() - hours * 3_600_000).toISOString()
    return delay((feed(farmId).history.get(roomId) ?? []).filter((r) => r.timestamp >= from), 160)
  },
  subscribe(farmId, listener) {
    const f = feed(farmId)
    f.listeners.add(listener)
    if (!f.timer) f.timer = setInterval(() => tick(f), TICK_MS)
    return () => {
      f.listeners.delete(listener)
      if (!f.listeners.size && f.timer) {
        clearInterval(f.timer)
        f.timer = null
      }
    }
  },
}

/** Synchronous access for other demo services (alerts). */
export function latestReadings(farmId: string): EnvironmentalReading[] {
  return [...feed(farmId).history.values()].map((list) => list[list.length - 1]).filter(Boolean)
}

export function readingNear(farmId: string, roomId: string, iso: string): EnvironmentalReading | null {
  const list = feed(farmId).history.get(roomId) ?? []
  let best: EnvironmentalReading | null = null
  for (const r of list) {
    if (r.timestamp > iso) break
    best = r
  }
  return best
}

export function roomHistory(farmId: string, roomId: string): EnvironmentalReading[] {
  return feed(farmId).history.get(roomId) ?? []
}
