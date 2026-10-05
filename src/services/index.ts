/**
 * Service registry — the single place that decides where data comes from.
 *
 * Current source: DEMO data (`./mock`).
 *
 * To connect Supabase later:
 *   1. `npm install @supabase/supabase-js`
 *   2. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to `.env.local`
 *      (public anon key only — never a service_role key in the browser).
 *   3. Implement the contracts in `./supabase/*` and return them below when
 *      `VITE_DATA_SOURCE=supabase`.
 */
import type {
  ActivityService,
  AnalyticsService,
  AuthService,
  ParkingService,
  ReservationService,
} from './contracts'
import { mockActivityService } from './mock/mockActivityService'
import { mockAnalyticsService } from './mock/mockAnalyticsService'
import { mockAuthService } from './mock/mockAuthService'
import { mockParkingService } from './mock/mockParkingService'
import { mockReservationService } from './mock/mockReservationService'

export type DataSource = 'mock' | 'supabase'

export const dataSource: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'supabase' ? 'supabase' : 'mock'

if (dataSource === 'supabase' && import.meta.env.DEV) {
  console.warn('[Sky Parking] Supabase services are not implemented yet — falling back to demo data.')
}

/** Every service above is currently a demo implementation. */
export const isDemoData = true

export const parkingService: ParkingService = mockParkingService
export const reservationService: ReservationService = mockReservationService
export const analyticsService: AnalyticsService = mockAnalyticsService
export const activityService: ActivityService = mockActivityService
export const authService: AuthService = mockAuthService

export type * from './contracts'
