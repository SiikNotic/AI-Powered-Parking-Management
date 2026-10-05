import { mockLocations, mockPreviousStats, mockSpaces } from '@/data/mock'
import type { LocationFilter, ParkingStats } from '@/types'
import type { ParkingService } from '../contracts'
import { matchesLocation, withLatency } from './delay'

function computeStats(location: LocationFilter): ParkingStats {
  const spaces = mockSpaces.filter((s) => matchesLocation(s.locationId, location))
  const count = (status: string) => spaces.filter((s) => s.status === status).length
  const previous = Object.entries(mockPreviousStats)
    .filter(([id]) => matchesLocation(id, location))
    .reduce(
      (acc, [, p]) => ({
        available: acc.available + p.available,
        occupied: acc.occupied + p.occupied,
        reserved: acc.reserved + p.reserved,
      }),
      { available: 0, occupied: 0, reserved: 0 },
    )

  return {
    total: spaces.length,
    available: count('available'),
    occupied: count('occupied'),
    reserved: count('reserved'),
    maintenance: count('maintenance'),
    disabled: count('disabled'),
    previous,
  }
}

export const mockParkingService: ParkingService = {
  getLocations: () => withLatency(mockLocations),
  getSpaces: (location) => withLatency(mockSpaces.filter((s) => matchesLocation(s.locationId, location))),
  getStats: (location) => withLatency(computeStats(location)),
  // Demo data is static: nothing is ever pushed, so there is nothing to tear down.
  subscribeToSpaces: () => () => {},
}
