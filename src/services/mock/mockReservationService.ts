import type { Reservation, ReservationStatus } from '@/types'
import type { ReservationService } from '../contracts'
import { ServiceError } from '../errors'
import { logActivity, newId, read, write, type DemoDB, type ReservationRecord } from './db'
import { matchesLocation, withLatency } from './delay'
import { isActive, joinReservation } from './selectors'

function overlaps(a: { checkIn: string; checkOut: string }, b: { checkIn: string; checkOut: string }) {
  return a.checkIn < b.checkOut && b.checkIn < a.checkOut
}

/** After a reservation ends, the space is reserved again if another one holds it, otherwise available. */
function releaseSpace(draft: DemoDB, spaceId: string, exceptId: string) {
  const space = draft.spaces.find((s) => s.id === spaceId)
  if (!space || space.status === 'maintenance' || space.status === 'disabled') return
  const stillHeld = draft.reservations.some((r) => r.id !== exceptId && r.spaceId === spaceId && (r.status === 'pending' || r.status === 'confirmed'))
  space.status = stillHeld ? 'reserved' : 'available'
  space.updatedAt = new Date().toISOString()
}

function transition(
  id: string,
  allowed: ReservationStatus[],
  apply: (draft: DemoDB, record: ReservationRecord) => void,
): Promise<Reservation> {
  return withLatency(() => {
    const record = read().reservations.find((r) => r.id === id)
    if (!record) throw new ServiceError('notFound')
    if (!allowed.includes(record.status)) throw new ServiceError('invalidTransition')
    write(['reservations', 'spaces', 'activity', 'customers', 'alerts'], (draft) => {
      apply(draft, draft.reservations.find((r) => r.id === id)!)
    })
    return joinReservation(read().reservations.find((r) => r.id === id)!)
  })
}

export const mockReservationService: ReservationService = {
  list: ({ location, view = 'all', status, search }) =>
    withLatency(() => {
      const now = new Date().toISOString()
      const q = search?.trim().toLowerCase()
      return read()
        .reservations.filter((r) => matchesLocation(r.locationId, location))
        .filter((r) => !status || r.status === status)
        .filter((r) => {
          if (view === 'upcoming') return (r.status === 'pending' || r.status === 'confirmed') && r.checkOut >= now
          if (view === 'active') return r.status === 'checked_in'
          if (view === 'past') return r.status === 'completed' || r.status === 'cancelled'
          return true
        })
        .map((r) => joinReservation(r))
        .filter((r) => !q || `${r.code} ${r.customer.name} ${r.customer.company ?? ''} ${r.spaceNumber}`.toLowerCase().includes(q))
        .sort((a, b) => (view === 'past' ? b.checkIn.localeCompare(a.checkIn) : a.checkIn.localeCompare(b.checkIn)))
    }),

  getUpcoming: (location, limit = 6) =>
    withLatency(() =>
      read()
        .reservations.filter((r) => matchesLocation(r.locationId, location) && (r.status === 'pending' || r.status === 'confirmed'))
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
        .slice(0, limit)
        .map((r) => joinReservation(r)),
    ),

  create: (input) =>
    withLatency(() => {
      const db = read()
      if (input.checkOut <= input.checkIn) throw new ServiceError('invalidDates')
      const space = db.spaces.find((s) => s.id === input.spaceId)
      const customer = db.customers.find((c) => c.id === input.customerId)
      if (!space || !customer) throw new ServiceError('notFound')
      const busy = space.status === 'maintenance' || space.status === 'disabled'
      const clash = db.reservations.some((r) => r.spaceId === space.id && isActive(r) && overlaps(r, input))
      if (busy || clash) throw new ServiceError('spaceUnavailable')

      const number = db.nextReservationNumber
      const nights = Math.max(1, Math.ceil((new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / (space.priceUnit === 'hour' ? 3_600_000 : 86_400_000)))
      const record: ReservationRecord = {
        id: newId('res'),
        code: `SP-${number}`,
        locationId: space.locationId,
        spaceId: space.id,
        spaceNumber: space.number,
        customerId: customer.id,
        vehicleType: input.vehicleType,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        status: input.status,
        total: space.price * nights,
        currency: 'USD',
      }
      write(['reservations', 'spaces', 'activity', 'customers'], (draft) => {
        draft.nextReservationNumber += 1
        draft.reservations.push(record)
        const target = draft.spaces.find((s) => s.id === space.id)!
        if (target.status === 'available') {
          target.status = 'reserved'
          target.updatedAt = new Date().toISOString()
        }
        logActivity(draft, { type: 'reservation_received', locationId: space.locationId, params: { customerName: customer.name, reservationCode: record.code } })
      })
      return joinReservation(record)
    }),

  confirm: (id) =>
    transition(id, ['pending'], (draft, r) => {
      r.status = 'confirmed'
      logActivity(draft, { type: 'reservation_confirmed', locationId: r.locationId, params: { reservationCode: r.code } })
    }),

  checkIn: (id) =>
    transition(id, ['pending', 'confirmed'], (draft, r) => {
      r.status = 'checked_in'
      const space = draft.spaces.find((s) => s.id === r.spaceId)
      if (space) {
        space.status = 'occupied'
        space.updatedAt = new Date().toISOString()
      }
      const customer = draft.customers.find((c) => c.id === r.customerId)
      logActivity(draft, { type: 'check_in', locationId: r.locationId, params: { spaceNumber: r.spaceNumber, customerName: customer?.name } })
    }),

  checkOut: (id) =>
    transition(id, ['checked_in'], (draft, r) => {
      r.status = 'completed'
      releaseSpace(draft, r.spaceId, r.id)
      logActivity(draft, { type: 'check_out', locationId: r.locationId, params: { spaceNumber: r.spaceNumber } })
      logActivity(draft, { type: 'payment_received', locationId: r.locationId, params: { amount: r.total, reservationCode: r.code } })
    }),

  cancel: (id) =>
    transition(id, ['pending', 'confirmed'], (draft, r) => {
      r.status = 'cancelled'
      releaseSpace(draft, r.spaceId, r.id)
      logActivity(draft, { type: 'reservation_cancelled', locationId: r.locationId, params: { reservationCode: r.code } })
    }),
}
