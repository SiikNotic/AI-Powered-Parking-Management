/**
 * Domain types for Sky Parking.
 *
 * These mirror the shape we expect from the future Supabase schema
 * (snake_case columns are mapped to camelCase in the service layer).
 * UI components only ever depend on these types — never on the data source.
 */

export type ID = string

/** ISO-8601 timestamp string, e.g. "2026-10-05T08:42:00.000Z". */
export type ISODateString = string

/** All monetary amounts in the app are expressed in whole units of this currency. */
export type CurrencyCode = 'USD'

/** "all" is a virtual selection meaning "aggregate every location". */
export type LocationFilter = ID | 'all'

export type SpaceStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'disabled'

/** What kind of vehicles a location is built for. */
export type ParkingCategory = 'truck' | 'car' | 'rv'

export type SpaceType = 'truck' | 'trailer' | 'oversized' | 'rv' | 'car' | 'compact' | 'ev'

export type VehicleType =
  | 'semi_trailer'
  | 'bobtail'
  | 'box_truck'
  | 'rv'
  | 'car'
  | 'suv'
  | 'pickup'
  | 'motorcycle'
  | 'van'

/** Billing period for a space's price (trucks/RVs per night, cars per day). */
export type PriceUnit = 'night' | 'day' | 'hour'

export interface ParkingLocation {
  id: ID
  name: string
  city: string
  state: string
  address: string
  timezone: string
  totalSpaces: number
  category: ParkingCategory
  /** Short code used for space labels (e.g. "PHL"). */
  code: string
}

export interface ParkingSpace {
  id: ID
  locationId: ID
  /** Human-facing space number, unique per location. */
  number: number
  /** Logical zone / row inside the lot, e.g. "A". */
  zone: string
  status: SpaceStatus
  type: SpaceType
  /** Length in feet. */
  length: number
  /** Width in feet. */
  width: number
  /** Price in USD per `priceUnit`. */
  price: number
  priceUnit: PriceUnit
  vehicleTypes: VehicleType[]
  updatedAt: ISODateString
}

export type ReservationStatus = 'confirmed' | 'pending' | 'checked_in' | 'cancelled'

export interface Customer {
  id: ID
  name: string
  email: string
  phone: string
  company?: string
}

export interface Reservation {
  id: ID
  /** Public code shown to managers and customers, e.g. "SP-1042". */
  code: string
  locationId: ID
  spaceId: ID
  spaceNumber: number
  customer: Customer
  vehicleType: VehicleType
  checkIn: ISODateString
  checkOut: ISODateString
  status: ReservationStatus
  total: number
  currency: CurrencyCode
}

/** Point-in-time snapshot used by KPI cards and the live status panel. */
export interface ParkingStats {
  total: number
  available: number
  occupied: number
  reserved: number
  maintenance: number
  disabled: number
  /** Same metrics 24h earlier, used for the "vs yesterday" deltas. */
  previous: {
    available: number
    occupied: number
    reserved: number
  }
}

export interface RevenuePoint {
  /** ISO date (yyyy-mm-dd) */
  date: string
  amount: number
}

export interface RevenueStats {
  currency: CurrencyCode
  today: number
  thisWeek: number
  thisMonth: number
  previousWeek: number
  /** Daily revenue, oldest first. */
  daily: RevenuePoint[]
}

export type OccupancyPeriod = 'today' | '7d' | '30d'

export interface OccupancyPoint {
  timestamp: ISODateString
  occupied: number
  available: number
}

export interface OccupancySeries {
  period: OccupancyPeriod
  capacity: number
  points: OccupancyPoint[]
}

export type ActivityType =
  | 'space_occupied'
  | 'space_available'
  | 'reservation_confirmed'
  | 'reservation_received'
  | 'reservation_cancelled'
  | 'check_in'
  | 'check_out'
  | 'payment_received'

export type ActivityTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

/**
 * Activity events are stored as structured data (type + params) instead of
 * pre-rendered sentences so the UI can translate them into any language.
 */
export interface ActivityEvent {
  id: ID
  type: ActivityType
  locationId: ID
  occurredAt: ISODateString
  params: {
    spaceNumber?: number
    reservationCode?: string
    customerName?: string
    amount?: number
  }
}

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type AlertType =
  | 'camera_offline'
  | 'space_maintenance'
  | 'high_occupancy'
  | 'payment_issue'
  | 'reservation_conflict'

export interface Alert {
  id: ID
  type: AlertType
  severity: AlertSeverity
  locationId: ID
  createdAt: ISODateString
  params: {
    spaceNumber?: number
    cameraName?: string
    percentage?: number
    reservationCode?: string
    amount?: number
  }
}

export interface Manager {
  id: ID
  firstName: string
  lastName: string
  email: string
  role: 'owner' | 'manager'
  organization: {
    id: ID
    name: string
  }
}
