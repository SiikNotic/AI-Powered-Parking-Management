import {
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Cog,
  FileBarChart,
  FlaskConical,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Sprout,
  Thermometer,
  Truck,
  Users,
  UserSquare2,
  Wheat,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Permission } from '@/domain/permissions'
import type { TranslationKey } from '@/i18n'

export type ModuleId =
  | 'dashboard'
  | 'production'
  | 'batches'
  | 'harvest'
  | 'inventory'
  | 'products'
  | 'customers'
  | 'orders'
  | 'sales'
  | 'expenses'
  | 'profitLoss'
  | 'environment'
  | 'suppliers'
  | 'employees'
  | 'equipment'
  | 'reports'
  | 'settings'

export interface ModuleDef {
  id: ModuleId
  path: string
  icon: LucideIcon
  permission?: Permission
}

export const MODULES: Record<ModuleId, ModuleDef> = {
  dashboard: { id: 'dashboard', path: '/', icon: LayoutDashboard },
  production: { id: 'production', path: '/production', icon: Sprout, permission: 'production.view' },
  batches: { id: 'batches', path: '/batches', icon: FlaskConical, permission: 'production.view' },
  harvest: { id: 'harvest', path: '/harvest', icon: Wheat, permission: 'production.view' },
  inventory: { id: 'inventory', path: '/inventory', icon: Boxes, permission: 'inventory.view' },
  products: { id: 'products', path: '/products', icon: Package, permission: 'inventory.view' },
  customers: { id: 'customers', path: '/customers', icon: Users, permission: 'sales.view' },
  orders: { id: 'orders', path: '/orders', icon: ClipboardList, permission: 'sales.view' },
  sales: { id: 'sales', path: '/sales', icon: ShoppingCart, permission: 'sales.view' },
  expenses: { id: 'expenses', path: '/expenses', icon: Receipt, permission: 'finance.view' },
  profitLoss: { id: 'profitLoss', path: '/profit-loss', icon: CircleDollarSign, permission: 'finance.view' },
  environment: { id: 'environment', path: '/environment', icon: Thermometer, permission: 'environment.view' },
  suppliers: { id: 'suppliers', path: '/suppliers', icon: Truck, permission: 'inventory.view' },
  employees: { id: 'employees', path: '/employees', icon: UserSquare2, permission: 'farms.manage' },
  equipment: { id: 'equipment', path: '/equipment', icon: Wrench, permission: 'environment.view' },
  reports: { id: 'reports', path: '/reports', icon: FileBarChart, permission: 'finance.view' },
  settings: { id: 'settings', path: '/settings', icon: Cog },
}

export interface NavGroup {
  label: TranslationKey
  items: ModuleId[]
}

export const NAV_GROUPS: NavGroup[] = [
  { label: 'nav.groups.overview', items: ['dashboard'] },
  { label: 'nav.groups.growing', items: ['production', 'batches', 'harvest', 'environment'] },
  { label: 'nav.groups.stock', items: ['inventory', 'products', 'suppliers'] },
  { label: 'nav.groups.sales', items: ['customers', 'orders', 'sales'] },
  { label: 'nav.groups.finance', items: ['expenses', 'profitLoss', 'reports'] },
  { label: 'nav.groups.operations', items: ['employees', 'equipment', 'settings'] },
]
