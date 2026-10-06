import { lazy, type ComponentType } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { RequirePermission } from '@/components/layout/RequirePermission'
import { MODULES, type ModuleId } from '@/config/navigation'
import { SessionProvider } from '@/context/SessionProvider'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastProvider'
import { I18nProvider } from '@/i18n'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// Hash routing is for static hosts without SPA rewrites (set VITE_ROUTER=hash at build time).
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

// Module pages load when first opened (the dashboard ships with the app).
const ProductionPage = lazy(() => import('@/pages/modules/ProductionPage').then((m) => ({ default: m.ProductionPage })))
const BatchesPage = lazy(() => import('@/pages/modules/BatchesPage').then((m) => ({ default: m.BatchesPage })))
const HarvestPage = lazy(() => import('@/pages/modules/HarvestPage').then((m) => ({ default: m.HarvestPage })))
const InventoryPage = lazy(() => import('@/pages/modules/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const ProductsPage = lazy(() => import('@/pages/modules/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const CustomersPage = lazy(() => import('@/pages/modules/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const OrdersPage = lazy(() => import('@/pages/modules/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const SalesPage = lazy(() => import('@/pages/modules/SalesPage').then((m) => ({ default: m.SalesPage })))
const ExpensesPage = lazy(() => import('@/pages/modules/ExpensesPage').then((m) => ({ default: m.ExpensesPage })))
const ProfitLossPage = lazy(() => import('@/pages/modules/ProfitLossPage').then((m) => ({ default: m.ProfitLossPage })))
const EnvironmentPage = lazy(() => import('@/pages/modules/EnvironmentPage').then((m) => ({ default: m.EnvironmentPage })))
const SuppliersPage = lazy(() => import('@/pages/modules/SuppliersPage').then((m) => ({ default: m.SuppliersPage })))
const EmployeesPage = lazy(() => import('@/pages/modules/EmployeesPage').then((m) => ({ default: m.EmployeesPage })))
const EquipmentPage = lazy(() => import('@/pages/modules/EquipmentPage').then((m) => ({ default: m.EquipmentPage })))
const ReportsPage = lazy(() => import('@/pages/modules/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/modules/SettingsPage').then((m) => ({ default: m.SettingsPage })))

const PAGES: Record<Exclude<ModuleId, 'dashboard'>, ComponentType> = {
  production: ProductionPage,
  batches: BatchesPage,
  harvest: HarvestPage,
  inventory: InventoryPage,
  products: ProductsPage,
  customers: CustomersPage,
  orders: OrdersPage,
  sales: SalesPage,
  expenses: ExpensesPage,
  profitLoss: ProfitLossPage,
  environment: EnvironmentPage,
  suppliers: SuppliersPage,
  employees: EmployeesPage,
  equipment: EquipmentPage,
  reports: ReportsPage,
  settings: SettingsPage,
}

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
                  {(Object.keys(PAGES) as (keyof typeof PAGES)[]).map((id) => {
                    const Page = PAGES[id]
                    return (
                      <Route
                        key={id}
                        path={MODULES[id].path}
                        element={
                          <RequirePermission permission={MODULES[id].permission}>
                            <Page />
                          </RequirePermission>
                        }
                      />
                    )
                  })}
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
