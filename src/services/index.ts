/**
 * Service registry. Components import services from here only.
 *
 * VITE_DATA_SOURCE=demo (default) uses the in-browser demo farm. A Supabase
 * implementation of the same contracts plugs in here (anon key + RLS only —
 * never a service_role key in the frontend).
 */
import { demoAlertService } from './demo/demoAlertService'
import { demoAuthService } from './demo/demoAuthService'
import { demoDashboardService } from './demo/demoDashboardService'
import { demoPreferencesService } from './demo/demoPreferencesService'
import { demoSearchService } from './demo/demoSearchService'
import { demoSensorProvider } from './demo/demoSensorProvider'

export * from './contracts'
export { changeFeed, type DataTopic } from './changeFeed'
export { ServiceError, type ServiceErrorCode } from './errors'
export { DEFAULT_LAYOUT } from './demo/demoPreferencesService'

export const authService = demoAuthService
export const dashboardService = demoDashboardService
export const sensorProvider = demoSensorProvider
export const alertService = demoAlertService
export const searchService = demoSearchService
export const preferencesService = demoPreferencesService

/** True while the app runs on generated demo data. */
export const isDemoData = (import.meta.env.VITE_DATA_SOURCE ?? 'demo') === 'demo'
