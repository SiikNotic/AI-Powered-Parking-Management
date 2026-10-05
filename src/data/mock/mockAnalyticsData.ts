/**
 * ⚠️ DEMO DATA — NOT REAL.
 * Occupancy curves and revenue history for the demo dashboard.
 */
import type { OccupancyPeriod, OccupancyPoint, ParkingCategory, RevenueStats } from '@/types'
import { createRandom, DEMO_NOW, toISODate } from './demoUtils'
import { mockLocations, mockSpaces } from './mockParkingData'

/**
 * "Available" in these series excludes spaces held for reservations,
 * matching the Available KPI.
 *
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

const categoryOf = (locationId: string): ParkingCategory =>
  mockLocations.find((l) => l.id === locationId)?.category ?? 'truck'

/** Average daily occupancy ratio used for the 7/30-day series. */
const dailyBase: Record<ParkingCategory, number> = { truck: 0.6, car: 0.62, rv: 0.3 }

function currentOccupied(locationId: string): number {
  return mockSpaces.filter((s) => s.locationId === locationId && s.status === 'occupied').length
}

function reservedNow(locationId: string): number {
  return mockSpaces.filter((s) => s.locationId === locationId && s.status === 'reserved').length
}

function capacityOf(locationId: string): number {
  return mockSpaces.filter(
    (s) => s.locationId === locationId && s.status !== 'maintenance' && s.status !== 'disabled',
  ).length
}

function buildToday(locationId: string, seed: number): OccupancyPoint[] {
  const random = createRandom(seed)
  const capacity = capacityOf(locationId)
  const occupiedNow = currentOccupied(locationId)
  const held = reservedNow(locationId)
  const midnight = new Date(DEMO_NOW)
  midnight.setHours(0, 0, 0, 0)
  const hoursElapsed = DEMO_NOW.getHours() + DEMO_NOW.getMinutes() / 60
  const hourlyProfile = categoryOf(locationId) === 'car' ? daytimeProfile : overnightProfile
  // Scale the profile so the curve lands exactly on the live value.
  const profileNow = hourlyProfile[Math.floor(hoursElapsed)]
  const scale = occupiedNow / (profileNow * capacity || 1)

  const points: OccupancyPoint[] = []
  for (let h = 0; h <= Math.floor(hoursElapsed); h++) {
    const jitter = 1 + (random() - 0.5) * 0.06
    const occupied = Math.min(capacity, Math.round(hourlyProfile[h] * capacity * scale * jitter))
    points.push({
      timestamp: new Date(midnight.getTime() + h * 3_600_000).toISOString(),
      occupied,
      available: Math.max(0, capacity - occupied - held),
    })
  }
  points.push({ timestamp: DEMO_NOW.toISOString(), occupied: occupiedNow, available: capacity - occupiedNow - held })
  return points
}

function buildDaily(locationId: string, days: number, seed: number): OccupancyPoint[] {
  const random = createRandom(seed)
  const capacity = capacityOf(locationId)
  const points: OccupancyPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(DEMO_NOW)
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() - i)
    const weekend = day.getDay() === 0 || day.getDay() === 6
    const base = locationId === 'loc_dal' ? 0.82 : dailyBase[categoryOf(locationId)]
    const ratio = Math.min(0.98, base + (weekend ? -0.06 : 0.03) + (random() - 0.5) * 0.12)
    const occupied = Math.round(capacity * ratio)
    const reserved = Math.round((capacity - occupied) * 0.15)
    points.push({ timestamp: day.toISOString(), occupied, available: capacity - occupied - reserved })
  }
  return points
}

export const mockOccupancy: Record<string, Record<OccupancyPeriod, OccupancyPoint[]>> =
  Object.fromEntries(
    mockLocations.map((loc, i) => [
      loc.id,
      {
        today: buildToday(loc.id, 100 + i),
        '7d': buildDaily(loc.id, 7, 200 + i),
        '30d': buildDaily(loc.id, 30, 300 + i),
      },
    ]),
  )

export const mockCapacity: Record<string, number> = Object.fromEntries(
  mockLocations.map((loc) => [loc.id, capacityOf(loc.id)]),
)

const revenueTargets: Record<string, { today: number; week: number; month: number; previousWeek: number }> = {
  loc_phl: { today: 290, week: 2180, month: 8310, previousWeek: 1950 },
  loc_dal: { today: 248, week: 1870, month: 7140, previousWeek: 1730 },
  loc_njr: { today: 104, week: 770, month: 2970, previousWeek: 610 },
  loc_hou: { today: 386, week: 2650, month: 10840, previousWeek: 2410 },
}

/** Generates 30 days of revenue that add up exactly to the targets above. */
function buildRevenue(locationId: string, seed: number): RevenueStats {
  const random = createRandom(seed)
  const target = revenueTargets[locationId]
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
      const day = new Date(DEMO_NOW)
      day.setDate(day.getDate() - (29 - i))
      return { date: toISODate(day), amount }
    }),
  }
}

export const mockRevenue: Record<string, RevenueStats> = Object.fromEntries(
  mockLocations.map((loc, i) => [loc.id, buildRevenue(loc.id, 400 + i)]),
)
