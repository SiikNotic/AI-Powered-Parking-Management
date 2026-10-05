import {
  BarChart3,
  CalendarClock,
  Cctv,
  LayoutDashboard,
  MapPinned,
  Settings,
  SquareParking,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavKey =
  | 'dashboard'
  | 'parkingLocations'
  | 'parkingSpaces'
  | 'reservations'
  | 'customers'
  | 'analytics'
  | 'cameras'
  | 'settings'

export interface NavItem {
  key: NavKey
  path: string
  icon: LucideIcon
}

export interface NavSection {
  key: 'main' | 'management' | 'system'
  items: NavItem[]
}

export const ROUTES = {
  dashboard: '/dashboard',
  parkingLocations: '/parking-locations',
  parkingSpaces: '/parking-spaces',
  reservations: '/reservations',
  customers: '/customers',
  analytics: '/analytics',
  cameras: '/cameras',
  settings: '/settings',
} as const satisfies Record<NavKey, string>

export const navigation: NavSection[] = [
  {
    key: 'main',
    items: [{ key: 'dashboard', path: ROUTES.dashboard, icon: LayoutDashboard }],
  },
  {
    key: 'management',
    items: [
      { key: 'parkingLocations', path: ROUTES.parkingLocations, icon: MapPinned },
      { key: 'parkingSpaces', path: ROUTES.parkingSpaces, icon: SquareParking },
      { key: 'reservations', path: ROUTES.reservations, icon: CalendarClock },
      { key: 'customers', path: ROUTES.customers, icon: Users },
      { key: 'analytics', path: ROUTES.analytics, icon: BarChart3 },
    ],
  },
  {
    key: 'system',
    items: [
      { key: 'cameras', path: ROUTES.cameras, icon: Cctv },
      { key: 'settings', path: ROUTES.settings, icon: Settings },
    ],
  },
]

export const allNavItems: NavItem[] = navigation.flatMap((section) => section.items)
