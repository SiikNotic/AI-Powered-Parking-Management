import { lazy, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ROUTES } from '@/config/navigation'
import { useSession } from '@/context/session'
import { SessionProvider } from '@/context/SessionContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastProvider'
import { I18nProvider } from '@/i18n'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SignInPage } from '@/pages/SignInPage'

// The dashboard loads with the app; other pages load when first opened.
const page = <K extends string>(load: () => Promise<Record<K, () => ReactNode>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))
const ParkingLocationsPage = page(() => import('@/pages/ParkingLocationsPage'), 'ParkingLocationsPage')
const ParkingSpacesPage = page(() => import('@/pages/ParkingSpacesPage'), 'ParkingSpacesPage')
const ReservationsPage = page(() => import('@/pages/ReservationsPage'), 'ReservationsPage')
const CustomersPage = page(() => import('@/pages/CustomersPage'), 'CustomersPage')
const AnalyticsPage = page(() => import('@/pages/AnalyticsPage'), 'AnalyticsPage')
const CamerasPage = page(() => import('@/pages/CamerasPage'), 'CamerasPage')
const SettingsPage = page(() => import('@/pages/SettingsPage'), 'SettingsPage')

// Hash routing is for static hosts without SPA rewrites (set VITE_ROUTER=hash at build time).
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

/** Shows the sign-in screen when the (demo) session has ended. */
function AuthGate({ children }: { children: ReactNode }) {
  const { signedIn } = useSession()
  return signedIn ? children : <SignInPage />
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <SessionProvider>
            <AuthGate>
              <Router>
                <Routes>
                  <Route element={<DashboardLayout />}>
                    <Route index element={<Navigate to={ROUTES.dashboard} replace />} />
                    <Route path={ROUTES.dashboard} element={<DashboardPage />} />
                    <Route path={ROUTES.parkingLocations} element={<ParkingLocationsPage />} />
                    <Route path={ROUTES.parkingSpaces} element={<ParkingSpacesPage />} />
                    <Route path={ROUTES.reservations} element={<ReservationsPage />} />
                    <Route path={ROUTES.customers} element={<CustomersPage />} />
                    <Route path={ROUTES.analytics} element={<AnalyticsPage />} />
                    <Route path={ROUTES.cameras} element={<CamerasPage />} />
                    <Route path={ROUTES.settings} element={<SettingsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </Router>
            </AuthGate>
          </SessionProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
