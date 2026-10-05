import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MODULES, type ModuleId } from '@/config/navigation'
import { SessionProvider } from '@/context/SessionProvider'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastProvider'
import { I18nProvider } from '@/i18n'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// Hash routing is for static hosts without SPA rewrites (set VITE_ROUTER=hash at build time).
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

// Phase 1 ships the dashboard; every other module has its route reserved.
const upcoming = (Object.keys(MODULES) as ModuleId[]).filter((id) => id !== 'dashboard')

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <SessionProvider>
            <Router>
              <Routes>
                <Route element={<DashboardLayout />}>
                  <Route index element={<DashboardPage />} />
                  {upcoming.map((id) => (
                    <Route key={id} path={MODULES[id].path} element={<ComingSoonPage module={id} />} />
                  ))}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Router>
          </SessionProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
