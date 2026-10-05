/**
 * Service registry. Components import services from here only.
 *
 * VITE_DATA_SOURCE=demo (default) uses the in-browser demo farm.
 * VITE_DATA_SOURCE=supabase uses Supabase with the public anon key and the
 * user's session — RLS decides what each user can read and write. Never use a
 * service_role key in the frontend.
 */
import type { AlertService, AuthService, DashboardService, PreferencesService, SearchService, SensorProvider } from './contracts'
import { demoAlertService } from './demo/demoAlertService'
import { demoAuthService } from './demo/demoAuthService'
import { demoDashboardService } from './demo/demoDashboardService'
import { demoPreferencesService } from './demo/demoPreferencesService'
import { demoSearchService } from './demo/demoSearchService'
import { demoSensorProvider } from './demo/demoSensorProvider'
import {
  supabaseAlertService,
  supabaseAuthService,
  supabaseDashboardService,
  supabasePreferencesService,
  supabaseSearchService,
  supabaseSensorProvider,
} from './supabase/services'

export * from './contracts'
export { changeFeed, type DataTopic } from './changeFeed'
export { ServiceError, type ServiceErrorCode } from './errors'
export { DEFAULT_LAYOUT } from './demo/demoPreferencesService'

export const dataSource: 'demo' | 'supabase' = import.meta.env.VITE_DATA_SOURCE === 'supabase' ? 'supabase' : 'demo'
/** True while the app runs on generated demo data. */
export const isDemoData = dataSource === 'demo'

const live = dataSource === 'supabase'

export const authService: AuthService = live ? supabaseAuthService : demoAuthService
export const dashboardService: DashboardService = live ? supabaseDashboardService : demoDashboardService
export const sensorProvider: SensorProvider = live ? supabaseSensorProvider : demoSensorProvider
export const alertService: AlertService = live ? supabaseAlertService : demoAlertService
export const searchService: SearchService = live ? supabaseSearchService : demoSearchService
export const preferencesService: PreferencesService = live ? supabasePreferencesService : demoPreferencesService
