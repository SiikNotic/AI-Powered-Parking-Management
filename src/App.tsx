import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ROUTES } from '@/config/navigation'
import { SessionProvider } from '@/context/SessionContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { I18nProvider } from '@/i18n'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const placeholderPages = [
  'parkingLocations',
  'parkingSpaces',
  'reservations',
  'customers',
  'analytics',
  'cameras',
  'settings',
] as const

// Hash routing is for static hosts without SPA rewrites (set VITE_ROUTER=hash at build time).
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SessionProvider>
          <Router>
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route index element={<Navigate to={ROUTES.dashboard} replace />} />
                <Route path={ROUTES.dashboard} element={<DashboardPage />} />
                {placeholderPages.map((page) => (
                  <Route key={page} path={`${ROUTES[page]}/*`} element={<ComingSoonPage page={page} />} />
                ))}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Router>
        </SessionProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
