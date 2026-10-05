import type { Alert, ParkingLocation, Reservation } from '@/types'
import { read, type DemoDB, type ReservationRecord } from './db'

export function locationsWithTotals(db: DemoDB = read()): ParkingLocation[] {
  return db.locations.map((l) => ({ ...l, totalSpaces: db.spaces.filter((s) => s.locationId === l.id).length }))
}

export function joinReservation(record: ReservationRecord, db: DemoDB = read()): Reservation {
  const { customerId, ...rest } = record
  const customer = db.customers.find((c) => c.id === customerId) ?? {
    id: customerId,
    name: '—',
    email: '',
    phone: '',
  }
  return { ...rest, customer }
}

/** Reservations that hold a space now or in the future. */
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in'] as const

export function isActive(r: { status: string }): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(r.status)
}

/** Stored alerts plus alerts computed from live state. */
export function allAlerts(db: DemoDB = read()): Alert[] {
  const derived: Alert[] = []
  for (const camera of db.cameras) {
    if (camera.status === 'offline') {
      derived.push({
        id: `cam:${camera.id}`,
        derived: true,
        type: 'camera_offline',
        severity: 'critical',
        locationId: camera.locationId,
        createdAt: camera.lastSeenAt,
        params: { cameraName: camera.name },
      })
    }
  }
  for (const space of db.spaces) {
    if (space.status === 'maintenance') {
      derived.push({
        id: `sp:${space.id}`,
        derived: true,
        type: 'space_maintenance',
        severity: 'warning',
        locationId: space.locationId,
        createdAt: space.updatedAt,
        params: { spaceNumber: space.number },
      })
    }
  }
  for (const location of db.locations) {
    const spaces = db.spaces.filter((s) => s.locationId === location.id)
    const inService = spaces.filter((s) => s.status !== 'maintenance' && s.status !== 'disabled').length
    const used = spaces.filter((s) => s.status === 'occupied' || s.status === 'reserved').length
    const percentage = inService ? Math.round((used / inService) * 100) : 0
    if (inService > 0 && percentage >= db.settings.occupancyAlertThreshold) {
      const latest = spaces.reduce((max, s) => (s.updatedAt > max ? s.updatedAt : max), spaces[0]?.updatedAt ?? new Date().toISOString())
      derived.push({
        id: `occ:${location.id}`,
        derived: true,
        type: 'high_occupancy',
        severity: 'warning',
        locationId: location.id,
        createdAt: latest,
        params: { percentage },
      })
    }
  }
  return [...derived, ...db.alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
