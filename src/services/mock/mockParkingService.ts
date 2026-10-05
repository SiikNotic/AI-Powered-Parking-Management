import type { LocationFilter, ParkingSpace, ParkingStats } from '@/types'
import type { ParkingService } from '../contracts'
import { ServiceError } from '../errors'
import { logActivity, newId, read, subscribe, write } from './db'
import { matchesLocation, withLatency } from './delay'
import { isActive, locationsWithTotals } from './selectors'

function computeStats(location: LocationFilter): ParkingStats {
  const db = read()
  const spaces = db.spaces.filter((s) => matchesLocation(s.locationId, location))
  const count = (status: string) => spaces.filter((s) => s.status === status).length
  const current = { available: count('available'), occupied: count('occupied'), reserved: count('reserved') }
  const previous = db.locations
    .filter((l) => matchesLocation(l.id, location))
    .reduce(
      (acc, l) => {
        // New locations have no history yet: compare against today.
        const own = db.spaces.filter((s) => s.locationId === l.id)
        const p = db.previousStats[l.id] ?? {
          available: own.filter((s) => s.status === 'available').length,
          occupied: own.filter((s) => s.status === 'occupied').length,
          reserved: own.filter((s) => s.status === 'reserved').length,
        }
        return { available: acc.available + p.available, occupied: acc.occupied + p.occupied, reserved: acc.reserved + p.reserved }
      },
      { available: 0, occupied: 0, reserved: 0 },
    )
  return {
    total: spaces.length,
    ...current,
    maintenance: count('maintenance'),
    disabled: count('disabled'),
    previous,
  }
}

const statusEvent = {
  occupied: 'space_occupied',
  available: 'space_available',
  maintenance: 'space_maintenance',
} as const

export const mockParkingService: ParkingService = {
  getLocations: () => withLatency(() => locationsWithTotals()),

  createLocation: (input, setup) =>
    withLatency(() => {
      const db = read()
      if (db.locations.some((l) => l.code.toLowerCase() === input.code.toLowerCase())) throw new ServiceError('duplicateLocationCode')
      const id = newId('loc')
      write(['locations', 'spaces', 'activity'], (draft) => {
        draft.locations.push({ id, ...input })
        if (setup && setup.spaces > 0) {
          const zones = Math.max(1, Math.min(setup.zones, 26))
          const perZone = Math.ceil(setup.spaces / zones)
          const size = input.category === 'car' ? { length: 18, width: 9 } : input.category === 'rv' ? { length: 45, width: 14 } : { length: 75, width: 12 }
          const vehicleTypes: ParkingSpace['vehicleTypes'] =
            input.category === 'car' ? ['car', 'suv', 'pickup', 'van'] : input.category === 'rv' ? ['rv', 'van'] : ['semi_trailer', 'bobtail', 'box_truck']
          for (let n = 1; n <= setup.spaces; n++) {
            draft.spaces.push({
              id: newId('sp'),
              locationId: id,
              number: n,
              zone: String.fromCharCode(65 + Math.floor((n - 1) / perZone)),
              status: 'available',
              type: input.category,
              length: size.length,
              width: size.width,
              price: setup.price,
              priceUnit: setup.priceUnit,
              vehicleTypes,
              updatedAt: new Date().toISOString(),
            })
          }
        }
        logActivity(draft, { type: 'location_created', locationId: id, params: { locationName: input.name } })
      })
      return locationsWithTotals().find((l) => l.id === id)!
    }),

  updateLocation: (id, input) =>
    withLatency(() => {
      const db = read()
      if (!db.locations.some((l) => l.id === id)) throw new ServiceError('notFound')
      if (db.locations.some((l) => l.id !== id && l.code.toLowerCase() === input.code.toLowerCase())) throw new ServiceError('duplicateLocationCode')
      write(['locations'], (draft) => {
        const index = draft.locations.findIndex((l) => l.id === id)
        draft.locations[index] = { id, ...input }
      })
      return locationsWithTotals().find((l) => l.id === id)!
    }),

  deleteLocation: (id) =>
    withLatency(() => {
      write(['locations', 'spaces', 'cameras', 'reservations', 'alerts', 'activity'], (draft) => {
        draft.locations = draft.locations.filter((l) => l.id !== id)
        draft.spaces = draft.spaces.filter((s) => s.locationId !== id)
        draft.cameras = draft.cameras.filter((c) => c.locationId !== id)
        draft.reservations = draft.reservations.filter((r) => r.locationId !== id)
        draft.alerts = draft.alerts.filter((a) => a.locationId !== id)
        draft.activity = draft.activity.filter((e) => e.locationId !== id)
      })
    }),

  getSpaces: (location) =>
    withLatency(() => read().spaces.filter((s) => matchesLocation(s.locationId, location)).sort((a, b) => a.number - b.number)),

  createSpace: (input) =>
    withLatency(() => {
      const db = read()
      if (db.spaces.some((s) => s.locationId === input.locationId && s.number === input.number)) throw new ServiceError('duplicateSpaceNumber')
      const space: ParkingSpace = { ...input, id: newId('sp'), updatedAt: new Date().toISOString() }
      write(['spaces', 'locations'], (draft) => {
        draft.spaces.push(space)
      })
      return space
    }),

  updateSpace: (id, patch) =>
    withLatency(() => {
      const db = read()
      const existing = db.spaces.find((s) => s.id === id)
      if (!existing) throw new ServiceError('notFound')
      const next = { ...existing, ...patch, updatedAt: new Date().toISOString() }
      if (db.spaces.some((s) => s.id !== id && s.locationId === next.locationId && s.number === next.number)) throw new ServiceError('duplicateSpaceNumber')
      write(['spaces', 'locations', 'activity', 'alerts'], (draft) => {
        const index = draft.spaces.findIndex((s) => s.id === id)
        draft.spaces[index] = next
        if (patch.status && patch.status !== existing.status && patch.status in statusEvent) {
          logActivity(draft, {
            type: statusEvent[patch.status as keyof typeof statusEvent],
            locationId: next.locationId,
            params: { spaceNumber: next.number },
          })
        }
      })
      return next
    }),

  deleteSpace: (id) =>
    withLatency(() => {
      write(['spaces', 'locations', 'reservations'], (draft) => {
        draft.spaces = draft.spaces.filter((s) => s.id !== id)
        draft.reservations = draft.reservations.map((r) => (r.spaceId === id && isActive(r) ? { ...r, status: 'cancelled' as const } : r))
      })
    }),

  getStats: (location) => withLatency(() => computeStats(location)),

  subscribeToSpaces: (location, onChange) => {
    let previous = new Map(read().spaces.map((s) => [s.id, s.updatedAt]))
    return subscribe((topics) => {
      if (!topics.includes('spaces')) return
      const spaces = read().spaces
      for (const space of spaces) {
        if (matchesLocation(space.locationId, location) && previous.get(space.id) !== space.updatedAt) onChange(structuredClone(space))
      }
      previous = new Map(spaces.map((s) => [s.id, s.updatedAt]))
    })
  },
}
