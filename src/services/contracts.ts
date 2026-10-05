/**
 * Service contracts.
 *
 * The UI talks to these interfaces only. Today they are implemented with demo
 * data kept in the browser (`./mock`); a Supabase implementation can be added
 * next to it and selected in `./index.ts` without touching any component.
 */
import type {
  ActivityEvent,
  Alert,
  AppSettings,
  Camera,
  CameraInput,
  CameraStatus,
  Customer,
  CustomerInput,
  CustomerSummary,
  LocationFilter,
  LocationInput,
  LocationSetup,
  Manager,
  ManagerInput,
  OccupancyPeriod,
  OccupancySeries,
  ParkingLocation,
  ParkingSpace,
  ParkingStats,
  Reservation,
  ReservationInput,
  ReservationStatus,
  RevenueStats,
  SpaceInput,
} from '@/types'

export type Unsubscribe = () => void

/** Data areas a screen can listen to for changes. */
export type DataTopic =
  | 'locations'
  | 'spaces'
  | 'reservations'
  | 'customers'
  | 'cameras'
  | 'activity'
  | 'alerts'
  | 'settings'
  | 'session'

/**
 * Push-based change notifications.
 * Will be backed by Supabase Realtime (`postgres_changes`). Never polling.
 */
export interface ChangeFeed {
  subscribe(topics: DataTopic[], onChange: () => void): Unsubscribe
}

export interface ParkingService {
  getLocations(): Promise<ParkingLocation[]>
  createLocation(input: LocationInput, setup?: LocationSetup): Promise<ParkingLocation>
  updateLocation(id: string, input: LocationInput): Promise<ParkingLocation>
  /** Also removes the location's spaces, cameras and reservations. */
  deleteLocation(id: string): Promise<void>

  getSpaces(location: LocationFilter): Promise<ParkingSpace[]>
  createSpace(input: SpaceInput): Promise<ParkingSpace>
  updateSpace(id: string, patch: Partial<SpaceInput>): Promise<ParkingSpace>
  deleteSpace(id: string): Promise<void>

  getStats(location: LocationFilter): Promise<ParkingStats>
  /** Push-based updates for space status changes (Supabase Realtime later). */
  subscribeToSpaces(location: LocationFilter, onChange: (space: ParkingSpace) => void): Unsubscribe
}

export type ReservationView = 'upcoming' | 'active' | 'past' | 'all'

export interface ReservationQuery {
  location: LocationFilter
  view?: ReservationView
  status?: ReservationStatus
  search?: string
}

export interface ReservationService {
  list(query: ReservationQuery): Promise<Reservation[]>
  getUpcoming(location: LocationFilter, limit?: number): Promise<Reservation[]>
  create(input: ReservationInput): Promise<Reservation>
  confirm(id: string): Promise<Reservation>
  checkIn(id: string): Promise<Reservation>
  checkOut(id: string): Promise<Reservation>
  cancel(id: string): Promise<Reservation>
}

export interface CustomerService {
  list(search?: string): Promise<CustomerSummary[]>
  getReservations(customerId: string): Promise<Reservation[]>
  create(input: CustomerInput): Promise<Customer>
  update(id: string, input: CustomerInput): Promise<Customer>
  delete(id: string): Promise<void>
}

export interface LocationRevenue {
  locationId: string
  name: string
  amount: number
}

export interface AnalyticsService {
  getOccupancy(location: LocationFilter, period: OccupancyPeriod): Promise<OccupancySeries>
  getRevenue(location: LocationFilter): Promise<RevenueStats>
  getRevenueByLocation(): Promise<LocationRevenue[]>
}

export interface ActivityService {
  getRecentActivity(location: LocationFilter, limit?: number): Promise<ActivityEvent[]>
  getAlerts(location: LocationFilter): Promise<Alert[]>
  /** Dismisses a stored alert. Derived alerts clear themselves when the cause is fixed. */
  resolveAlert(id: string): Promise<void>
}

export interface CameraService {
  list(location: LocationFilter): Promise<Camera[]>
  create(input: CameraInput): Promise<Camera>
  update(id: string, input: CameraInput): Promise<Camera>
  setStatus(id: string, status: CameraStatus): Promise<Camera>
  delete(id: string): Promise<void>
}

export interface AuthService {
  getCurrentManager(): Promise<Manager>
  updateManager(input: ManagerInput): Promise<Manager>
  isSignedIn(): boolean
  signIn(): Promise<void>
  /** Ends the session. Backed by `supabase.auth.signOut()` once auth is connected. */
  signOut(): Promise<void>
}

export interface SettingsService {
  get(): Promise<AppSettings>
  update(patch: Partial<AppSettings>): Promise<AppSettings>
  /** Demo only: restores the original sample data. */
  resetDemoData(): Promise<void>
}
