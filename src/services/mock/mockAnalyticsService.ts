import { capacityOf, generateOccupancy, generateRevenue } from '@/data/mock/mockAnalyticsData'
import type { OccupancyPoint, RevenueStats } from '@/types'
import type { AnalyticsService } from '../contracts'
import { read } from './db'
import { matchesLocation, withLatency } from './delay'
import { locationsWithTotals } from './selectors'

function scoped(location: string) {
  const db = read()
  return locationsWithTotals(db)
    .filter((l) => matchesLocation(l.id, location))
    .map((l) => ({ location: l, spaces: db.spaces.filter((s) => s.locationId === l.id) }))
}

/** Sums per-location series point by point (they share timestamps). */
function sumSeries(series: OccupancyPoint[][]): OccupancyPoint[] {
  if (!series.length) return []
  return series[0].map((point, i) => ({
    timestamp: point.timestamp,
    occupied: series.reduce((sum, s) => sum + (s[i]?.occupied ?? 0), 0),
    available: series.reduce((sum, s) => sum + (s[i]?.available ?? 0), 0),
  }))
}

function sumRevenue(items: RevenueStats[]): RevenueStats {
  const now = new Date()
  const sum = (pick: (r: RevenueStats) => number) => items.reduce((acc, r) => acc + pick(r), 0)
  const daily = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(now)
    day.setDate(day.getDate() - (29 - i))
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    return { date, amount: items.reduce((acc, r) => acc + (r.daily[i]?.amount ?? 0), 0) }
  })
  return {
    currency: 'USD',
    today: sum((r) => r.today),
    thisWeek: sum((r) => r.thisWeek),
    thisMonth: sum((r) => r.thisMonth),
    previousWeek: sum((r) => r.previousWeek),
    daily,
  }
}

export const mockAnalyticsService: AnalyticsService = {
  getOccupancy: (location, period) =>
    withLatency(() => {
      const items = scoped(location)
      const now = new Date()
      return {
        period,
        capacity: items.reduce((sum, i) => sum + capacityOf(i.spaces), 0),
        points: sumSeries(items.map((i) => generateOccupancy(i.location, i.spaces, period, now))),
      }
    }),

  getRevenue: (location) => withLatency(() => sumRevenue(scoped(location).map((i) => generateRevenue(i.location, i.spaces)))),

  getRevenueByLocation: () =>
    withLatency(() =>
      scoped('all')
        .map((i) => ({ locationId: i.location.id, name: i.location.name, amount: generateRevenue(i.location, i.spaces).thisMonth }))
        .sort((a, b) => b.amount - a.amount),
    ),
}
