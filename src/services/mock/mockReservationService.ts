import { mockReservations } from '@/data/mock'
import type { ReservationService } from '../contracts'
import { matchesLocation, withLatency } from './delay'

export const mockReservationService: ReservationService = {
  getUpcoming: (location, limit = 6) =>
    withLatency(
      mockReservations
        .filter((r) => matchesLocation(r.locationId, location) && r.status !== 'cancelled')
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
        .slice(0, limit),
    ),
}
