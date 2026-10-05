/**
 * ⚠️ DEMO DATA — NOT REAL.
 * Generators for occupancy curves and revenue history. They work for any
 * location (including ones created in the app) from its current spaces.
 */
import type {
  OccupancyPeriod,
  OccupancyPoint,
  ParkingCategory,
  ParkingLocation,
  ParkingSpace,
  RevenueStats,
} from '@/types'
import { createRandom, toISODate } from './demoUtils'

/**
 * Typical share of spaces occupied for each hour of the day.
 * Truck and RV parking fills overnight and empties mid-day;
 * car parking follows the working day.
 */
const overnightProfile = [
  0.9, 0.92, 0.93, 0.92, 0.88, 0.78, 0.64, 0.52, 0.45, 0.4, 0.37, 0.36,
  0.36, 0.38, 0.42, 0.48, 0.55, 0.63, 0.71, 0.78, 0.83, 0.86, 0.88, 0.89, 0.9,
]

const daytimeProfile = [
  0.12, 0.1, 0.09, 0.09, 0.1, 0.14, 0.28, 0.52, 0.74, 0.84, 0.88, 0.9,
  0.92, 0.9, 0.86, 0.8, 0.72, 0.6, 0.45, 0.34, 0.26, 0.2, 0.16, 0.14, 0.12,
]

/** Average daily occupancy ratio used for the 7/30-day series. */
const dailyBase: Record<ParkingCategory, number> = { truck: 0.6, car: 0.62, rv: 0.3 }

/** Stable numeric seed from a string id. */
function seedOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export function capacityOf(spaces: ParkingSpace[]): number {
  return spaces.filter((s) => s.status !== 'maintenance' && s.status !== 'disabled').length
}

/**
 * "Available" excludes spaces held for reservations, matching the Available KPI.
 * The "today" curve always ends on the live occupied count.
 */
export function generateOccupancy(
  location: ParkingLocation,
  spaces: ParkingSpace[],
  period: OccupancyPeriod,
  now = new Date(),
): OccupancyPoint[] {
  const random = createRandom(seedOf(location.id + period))
  const capacity = capacityOf(spaces)
  const occupiedNow = spaces.filter((s) => s.status === 'occupied').length
  const held = spaces.filter((s) => s.status === 'reserved').length

  if (period === 'today') {
    const midnight = new Date(now)
    midnight.setHours(0, 0, 0, 0)
    const hoursElapsed = now.getHours() + now.getMinutes() / 60
    const profile = location.category === 'car' ? daytimeProfile : overnightProfile
    const profileNow = profile[Math.floor(hoursElapsed)]
    const scale = occupiedNow / (profileNow * capacity || 1)
    const points: OccupancyPoint[] = []
    for (let h = 0; h <= Math.floor(hoursElapsed); h++) {
      const jitter = 1 + (random() - 0.5) * 0.06
      const occupied = Math.min(capacity, Math.round(profile[h] * capacity * scale * jitter))
      points.push({
        timestamp: new Date(midnight.getTime() + h * 3_600_000).toISOString(),
        occupied,
        available: Math.max(0, capacity - occupied - held),
      })
    }
    points.push({ timestamp: now.toISOString(), occupied: occupiedNow, available: Math.max(0, capacity - occupiedNow - held) })
    return points
  }

  const days = period === '7d' ? 7 : 30
  const points: OccupancyPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now)
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() - i)
    const weekend = day.getDay() === 0 || day.getDay() === 6
    const base = location.id === 'loc_dal' ? 0.82 : dailyBase[location.category]
    const ratio = Math.min(0.98, Math.max(0, base + (weekend ? -0.06 : 0.03) + (random() - 0.5) * 0.12))
    const occupied = Math.round(capacity * ratio)
    const reserved = Math.round((capacity - occupied) * 0.15)
    points.push({ timestamp: day.toISOString(), occupied, available: Math.max(0, capacity - occupied - reserved) })
  }
  return points
}

/** Hand-tuned figures for the seeded demo locations. */
const revenueTargets: Record<string, { today: number; week: number; month: number; previousWeek: number }> = {
  loc_phl: { today: 290, week: 2180, month: 8310, previousWeek: 1950 },
  loc_dal: { today: 248, week: 1870, month: 7140, previousWeek: 1730 },
  loc_njr: { today: 104, week: 770, month: 2970, previousWeek: 610 },
  loc_hou: { today: 386, week: 2650, month: 10840, previousWeek: 2410 },
}

function estimateTargets(location: ParkingLocation, spaces: ParkingSpace[]) {
  const avgPrice = spaces.length ? spaces.reduce((s, sp) => s + sp.price, 0) / spaces.length : 0
  const day = Math.round(spaces.length * avgPrice * dailyBase[location.category])
  return { today: Math.round(day * 0.7), week: day * 7, month: day * 30, previousWeek: Math.round(day * 7 * 0.92) }
}

/** 30 days of revenue that add up exactly to the location's targets. */
export function generateRevenue(location: ParkingLocation, spaces: ParkingSpace[], now = new Date()): RevenueStats {
  const random = createRandom(seedOf(location.id + 'revenue'))
  const target = revenueTargets[location.id] ?? estimateTargets(location, spaces)
  const weights = Array.from({ length: 30 }, () => 0.75 + random() * 0.5)

  const distribute = (from: number, to: number, total: number) => {
    const slice = weights.slice(from, to)
    const sum = slice.reduce((a, b) => a + b, 0)
    let assigned = 0
    return slice.map((w, i) => {
      if (i === slice.length - 1) return total - assigned
      const value = Math.round((w / sum) * total)
      assigned += value
      return value
    })
  }

  const amounts = [
    ...distribute(0, 23, target.month - target.week),
    ...distribute(23, 29, target.week - target.today),
    target.today,
  ]

  return {
    currency: 'USD',
    today: target.today,
    thisWeek: target.week,
    thisMonth: target.month,
    previousWeek: target.previousWeek,
    daily: amounts.map((amount, i) => {
      const day = new Date(now)
      day.setDate(day.getDate() - (29 - i))
      return { date: toISODate(day), amount }
    }),
  }
}
