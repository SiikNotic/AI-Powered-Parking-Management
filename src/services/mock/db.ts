/**
 * In-browser demo database.
 *
 * Seeds from `src/data/mock`, keeps every change in localStorage so the demo
 * survives reloads, and notifies subscribers on change (push-based, no polling).
 * Replaced entirely by Supabase tables + Realtime in the next phase.
 */
import {
  mockActivity,
  mockAlerts,
  mockCameras,
  mockCurrentStays,
  mockCustomers,
  mockLocations,
  mockManager,
  mockPastReservations,
  mockPreviousStats,
  mockReservations,
  mockSpaces,
} from '@/data/mock'
import type {
  ActivityEvent,
  Alert,
  AppSettings,
  Camera,
  Customer,
  Manager,
  ParkingLocation,
  ParkingSpace,
  ParkingStats,
  Reservation,
} from '@/types'

export type ReservationRecord = Omit<Reservation, 'customer'> & { customerId: string }
export type LocationRecord = Omit<ParkingLocation, 'totalSpaces'>

export interface DemoDB {
  version: number
  savedAt: string
  signedIn: boolean
  manager: Manager
  settings: AppSettings
  locations: LocationRecord[]
  spaces: ParkingSpace[]
  customers: Customer[]
  reservations: ReservationRecord[]
  cameras: Camera[]
  activity: ActivityEvent[]
  alerts: Alert[]
  previousStats: Record<string, ParkingStats['previous']>
  nextReservationNumber: number
}

export type Topic =
  | 'locations'
  | 'spaces'
  | 'reservations'
  | 'customers'
  | 'cameras'
  | 'activity'
  | 'alerts'
  | 'settings'
  | 'session'

const STORAGE_KEY = 'sky-parking.demo-db'
const VERSION = 1

function seed(): DemoDB {
  const allReservations = [...mockPastReservations, ...mockCurrentStays, ...mockReservations]
  const now = Date.now()
  return {
    version: VERSION,
    savedAt: new Date().toISOString(),
    signedIn: true,
    manager: structuredClone(mockManager),
    settings: { occupancyAlertThreshold: 90, emailAlerts: true, dailySummary: false },
    locations: mockLocations.map(({ totalSpaces: _ignored, ...rest }) => rest),
    spaces: structuredClone(mockSpaces),
    customers: mockCustomers.map((c, i) => ({ ...c, createdAt: new Date(now - (90 - i * 3) * 86_400_000).toISOString() })),
    reservations: allReservations.map(({ customer, ...r }) => ({ ...r, customerId: customer.id })),
    cameras: structuredClone(mockCameras),
    activity: structuredClone(mockActivity),
    alerts: structuredClone(mockAlerts),
    previousStats: structuredClone(mockPreviousStats),
    nextReservationNumber: 1200,
  }
}

/** Moves every stored timestamp forward so a demo saved days ago still looks current. */
function shiftTimestamps(db: DemoDB, deltaMs: number) {
  const shift = (iso: string) => new Date(new Date(iso).getTime() + deltaMs).toISOString()
  db.spaces.forEach((s) => (s.updatedAt = shift(s.updatedAt)))
  db.customers.forEach((c) => c.createdAt && (c.createdAt = shift(c.createdAt)))
  db.reservations.forEach((r) => {
    r.checkIn = shift(r.checkIn)
    r.checkOut = shift(r.checkOut)
  })
  db.cameras.forEach((c) => (c.lastSeenAt = shift(c.lastSeenAt)))
  db.activity.forEach((e) => (e.occurredAt = shift(e.occurredAt)))
  db.alerts.forEach((a) => (a.createdAt = shift(a.createdAt)))
}

function load(): DemoDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDB
      if (parsed.version === VERSION) {
        const delta = Date.now() - new Date(parsed.savedAt).getTime()
        if (delta > 5 * 60_000) shiftTimestamps(parsed, delta)
        return parsed
      }
    }
  } catch {
    /* corrupt or unavailable storage: start from the seed */
  }
  return seed()
}

let db: DemoDB = load()
const listeners = new Set<(topics: Topic[]) => void>()

function persist() {
  db.savedAt = new Date().toISOString()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

/** Read-only access to the current state. */
export function read(): DemoDB {
  return db
}

/** Applies a change, saves it and notifies subscribers of the touched topics. */
export function write(topics: Topic[], mutate: (draft: DemoDB) => void) {
  mutate(db)
  persist()
  listeners.forEach((listener) => listener(topics))
}

export function subscribe(listener: (topics: Topic[]) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Restores the original demo data. */
export function reset() {
  db = seed()
  persist()
  const all: Topic[] = ['locations', 'spaces', 'reservations', 'customers', 'cameras', 'activity', 'alerts', 'settings', 'session']
  listeners.forEach((listener) => listener(all))
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function logActivity(draft: DemoDB, event: Omit<ActivityEvent, 'id' | 'occurredAt'>) {
  draft.activity.unshift({ ...event, id: newId('evt'), occurredAt: new Date().toISOString() })
  draft.activity = draft.activity.slice(0, 100)
}
