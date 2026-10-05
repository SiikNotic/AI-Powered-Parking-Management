import { mockCapacity, mockOccupancy, mockRevenue } from '@/data/mock'
import type { LocationFilter, OccupancyPeriod, OccupancyPoint, RevenueStats } from '@/types'
import type { AnalyticsService } from '../contracts'
import { matchesLocation, withLatency } from './delay'

function locationIds(location: LocationFilter): string[] {
  return Object.keys(mockCapacity).filter((id) => matchesLocation(id, location))
}

/** Sums the series of several locations point by point (they share timestamps). */
function aggregateOccupancy(ids: string[], period: OccupancyPeriod): OccupancyPoint[] {
  const series = ids.map((id) => mockOccupancy[id][period])
  return series[0].map((point, i) => ({
    timestamp: point.timestamp,
    occupied: series.reduce((sum, s) => sum + s[i].occupied, 0),
    available: series.reduce((sum, s) => sum + s[i].available, 0),
  }))
}

function aggregateRevenue(ids: string[]): RevenueStats {
  const items = ids.map((id) => mockRevenue[id])
  const sum = (pick: (r: RevenueStats) => number) => items.reduce((acc, r) => acc + pick(r), 0)
  return {
    currency: 'USD',
    today: sum((r) => r.today),
    thisWeek: sum((r) => r.thisWeek),
    thisMonth: sum((r) => r.thisMonth),
    previousWeek: sum((r) => r.previousWeek),
    daily: items[0].daily.map((point, i) => ({
      date: point.date,
      amount: items.reduce((acc, r) => acc + r.daily[i].amount, 0),
    })),
  }
}

export const mockAnalyticsService: AnalyticsService = {
  getOccupancy: (location, period) => {
    const ids = locationIds(location)
    return withLatency({
      period,
      capacity: ids.reduce((sum, id) => sum + mockCapacity[id], 0),
      points: aggregateOccupancy(ids, period),
    })
  },
  getRevenue: (location) => withLatency(aggregateRevenue(locationIds(location))),
}
