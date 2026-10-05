/**
 * Service contracts. The UI only talks to these interfaces; the demo
 * implementation lives in ./demo and a Supabase implementation can replace it
 * without touching components (see README → "Connecting Supabase").
 */
import type { DailyFinance, ProductSales, ProfitAndLoss } from '@/domain/finance'
import type { ExpiringLot, InventorySummary } from '@/domain/inventory'
import type { DailyHarvest, HarvestForecast, HarvestTotals, YieldStats } from '@/domain/production'
import type {
  AppUser,
  AuditEntry,
  BatchStatus,
  DateRange,
  EnvironmentalReading,
  Farm,
  FarmAlert,
  FarmTask,
  GrowRoom,
  ID,
  MushroomSpecies,
  Period,
  ProductionBatch,
  Role,
  SaleChannel,
} from '@/types'

export interface Session {
  user: AppUser
  /** Only the farms the user is a member of. */
  farms: Farm[]
}

export interface AuthService {
  getSession(): Promise<Session>
  /** Demo only: preview the dashboard as another role. */
  setRole(role: Role): Promise<Session>
}

export interface Metric<T = number> {
  value: T
  previous: T
}

export interface BatchSummary extends ProductionBatch {
  speciesName: string
  roomName: string
  harvestedLb: number
  expectedLb: number
}

export interface ActivityItem extends AuditEntry {
  userName: string
}

export interface TaskItem extends FarmTask {
  assigneeName: string
}

export interface DashboardKpis {
  harvestToday: Metric
  inventoryLb: number
  inventoryValue: number
  openOrders: number
  ordersInPeriod: Metric
  revenue: Metric
  expenses: Metric
  netProfit: Metric
  activeBatches: number
  readyToHarvest: number
  lowStockItems: number
}

export interface DashboardSnapshot {
  farm: Farm
  period: Period
  range: DateRange
  generatedAt: string
  species: MushroomSpecies[]
  rooms: GrowRoom[]
  kpis: DashboardKpis
  pnl: ProfitAndLoss
  finance: DailyFinance[]
  harvest: {
    totals: HarvestTotals
    daily: DailyHarvest[]
    bySpecies: { speciesId: ID; lb: number }[]
  }
  production: {
    pipeline: Record<BatchStatus, number>
    yield: YieldStats
    forecast: HarvestForecast
    ready: BatchSummary[]
    overdue: BatchSummary[]
  }
  inventory: InventorySummary & { expiring: ExpiringLot[] }
  sales: {
    soldLb: number
    topProducts: ProductSales[]
    bySpecies: { speciesId: ID; revenue: number }[]
    byChannel: { channel: SaleChannel; revenue: number }[]
  }
  tasks: TaskItem[]
  activity: ActivityItem[]
}

export interface DashboardService {
  getSnapshot(farmId: ID, period: Period): Promise<DashboardSnapshot>
}

/**
 * Hardware-agnostic sensor source. Any vendor (or a gateway writing to the
 * `environmental_readings` table) can implement it.
 */
export interface SensorProvider {
  /** Latest reading per room (rooms with no data are omitted). */
  getLatest(farmId: ID): Promise<EnvironmentalReading[]>
  /** Readings for a room over the last `hours`. */
  getHistory(farmId: ID, roomId: ID, hours: number): Promise<EnvironmentalReading[]>
  /** Pushes new readings as they arrive. Returns an unsubscribe function. */
  subscribe(farmId: ID, listener: (reading: EnvironmentalReading) => void): () => void
}

export interface AlertService {
  list(farmId: ID): Promise<FarmAlert[]>
  acknowledge(farmId: ID, alertId: ID): Promise<void>
  resolve(farmId: ID, alertId: ID): Promise<void>
}

export type SearchKind = 'batch' | 'product' | 'customer' | 'order' | 'room' | 'species'

export interface SearchResult {
  kind: SearchKind
  id: ID
  title: string
  subtitle: string
  link: string
}

export interface SearchService {
  search(farmId: ID, query: string): Promise<SearchResult[]>
}

export type WidgetId = 'glance' | 'overview' | 'alerts' | 'harvest' | 'forecast' | 'pipeline' | 'inventory' | 'finance' | 'sales' | 'tasks' | 'activity'

export interface WidgetPreference {
  id: WidgetId
  visible: boolean
}

export interface PreferencesService {
  getDashboardLayout(userId: ID): WidgetPreference[]
  saveDashboardLayout(userId: ID, layout: WidgetPreference[]): void
}
