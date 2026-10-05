/**
 * Service registry — the single place that decides where data comes from.
 *
 * Current source: DEMO data kept in the browser (`./mock`).
 *
 * To connect Supabase later:
 *   1. `npm install @supabase/supabase-js`
 *   2. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to `.env.local`
 *      (public anon key only — never a service_role key in the browser).
 *   3. Implement the contracts in `./supabase/*` (Realtime for `changeFeed`)
 *      and return them below when `VITE_DATA_SOURCE=supabase`.
 */
import type {
  ActivityService,
  AnalyticsService,
  AuthService,
  CameraService,
  ChangeFeed,
  CustomerService,
  ParkingService,
  ReservationService,
  SettingsService,
} from './contracts'
import { subscribe } from './mock/db'
import { mockActivityService } from './mock/mockActivityService'
import { mockAnalyticsService } from './mock/mockAnalyticsService'
import { mockAuthService, mockSettingsService } from './mock/mockAuthService'
import { mockCameraService } from './mock/mockCameraService'
import { mockCustomerService } from './mock/mockCustomerService'
import { mockParkingService } from './mock/mockParkingService'
import { mockReservationService } from './mock/mockReservationService'

export type DataSource = 'mock' | 'supabase'

export const dataSource: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'supabase' ? 'supabase' : 'mock'

if (dataSource === 'supabase' && import.meta.env.DEV) {
  console.warn('[Sky Parking] Supabase services are not implemented yet — falling back to demo data.')
}

/** Every service below is currently a demo implementation. */
export const isDemoData = true

export const parkingService: ParkingService = mockParkingService
export const reservationService: ReservationService = mockReservationService
export const customerService: CustomerService = mockCustomerService
export const analyticsService: AnalyticsService = mockAnalyticsService
export const activityService: ActivityService = mockActivityService
export const cameraService: CameraService = mockCameraService
export const authService: AuthService = mockAuthService
export const settingsService: SettingsService = mockSettingsService

export const changeFeed: ChangeFeed = {
  subscribe: (topics, onChange) =>
    subscribe((changed) => {
      if (changed.some((t) => topics.includes(t))) onChange()
    }),
}

export type * from './contracts'
export { ServiceError } from './errors'
