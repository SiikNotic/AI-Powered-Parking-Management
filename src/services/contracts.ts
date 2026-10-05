/**
 * Service contracts.
 *
 * The UI talks to these interfaces only. Today they are implemented with demo
 * data (`./mock`); a Supabase implementation can be added next to it and
 * selected in `./index.ts` without touching any component.
 */
import type {
  ActivityEvent,
  Alert,
  LocationFilter,
  Manager,
  OccupancyPeriod,
  OccupancySeries,
  ParkingLocation,
  ParkingSpace,
  ParkingStats,
  Reservation,
  RevenueStats,
} from '@/types'

export type Unsubscribe = () => void

export interface ParkingService {
  getLocations(): Promise<ParkingLocation[]>
  getSpaces(location: LocationFilter): Promise<ParkingSpace[]>
  getStats(location: LocationFilter): Promise<ParkingStats>
  /**
   * Push-based updates for space status changes.
   * Will be backed by Supabase Realtime (`postgres_changes` on `parking_spaces`).
   * Never implemented with polling.
   */
  subscribeToSpaces(location: LocationFilter, onChange: (space: ParkingSpace) => void): Unsubscribe
}

export interface ReservationService {
  getUpcoming(location: LocationFilter, limit?: number): Promise<Reservation[]>
}

export interface AnalyticsService {
  getOccupancy(location: LocationFilter, period: OccupancyPeriod): Promise<OccupancySeries>
  getRevenue(location: LocationFilter): Promise<RevenueStats>
}

export interface ActivityService {
  getRecentActivity(location: LocationFilter, limit?: number): Promise<ActivityEvent[]>
  getAlerts(location: LocationFilter): Promise<Alert[]>
}

export interface AuthService {
  getCurrentManager(): Promise<Manager>
  /** Ends the session. Backed by `supabase.auth.signOut()` once auth is connected. */
  signOut(): Promise<void>
}
