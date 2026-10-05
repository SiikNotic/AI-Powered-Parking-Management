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

export interface Membership {
  farmId: ID
  role: Role
}

export interface Session {
  user: AppUser
  /** Only the farms the user is a member of. */
  farms: Farm[]
  /** The user's role on each farm (roles are per farm). */
  memberships: Membership[]
}

export interface AuthService {
  /** null when nobody is signed in. */
  getSession(): Promise<Session | null>
  signIn(email: string, password: string): Promise<void>
  /** Returns true when the email must be confirmed before signing in. */
  signUp(email: string, password: string, fullName: string): Promise<boolean>
  signOut(): Promise<void>
  /** Creates a farm owned by the signed-in user. */
  createFarm(name: string, location: string): Promise<void>
  /** Demo only: preview the dashboard as another role. */
  setRole?(role: Role): Promise<void>
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
  /** Synchronous read from the local cache (instant first paint). */
  getDashboardLayout(userId: ID): WidgetPreference[]
  saveDashboardLayout(userId: ID, layout: WidgetPreference[]): void
  /** Refreshes the local cache from the server, when there is one. */
  hydrate?(userId: ID): Promise<void>
}

// ---------- Module data & write operations ----------

export type { FarmData } from './shared/records'

export interface FarmDataService {
  /** Everything the module pages read for one farm (RLS-scoped in Supabase). */
  get(farmId: ID): Promise<import('./shared/records').FarmData>
}

type Editable<T> = Omit<T, 'id' | 'farmId'> & { id?: ID }

export interface BatchInput {
  speciesId: ID
  roomId: ID
  substrate: string
  substrateWeight: number
  spawnWeight: number
  bags: number
  spawnDate: string
  expectedHarvestDate: string
  cost: number
  notes?: string
}

export interface HarvestInput {
  batchId: ID
  wetWeight: number
  wasteWeight: number
  grade: import('@/types').HarvestGrade
  employeeId: ID | null
  date?: string
}

/** Manual stock change. `quantity` is signed (negative = stock out). */
export interface MovementInput {
  productId: ID
  type: 'RECEIVED' | 'ADJUSTMENT' | 'DAMAGED' | 'WASTED' | 'TRANSFERRED' | 'PRODUCED'
  quantity: number
  reference: string
  expiresAt?: string | null
  fromLocationId?: ID | null
  toLocationId?: ID | null
}

export interface PackInput {
  sourceId: ID
  targetId: ID
  units: number
}

export interface OrderInput {
  customerId: ID | null
  channel: SaleChannel
  paymentMethod: import('@/types').PaymentMethod
  fulfillment: 'pickup' | 'delivery'
  discount: number
  taxRate: number
  dueAt: string
  items: { productId: ID; quantity: number; unitPrice: number }[]
  /** COMPLETED for counter sales (stock leaves immediately). */
  status?: 'CONFIRMED' | 'COMPLETED'
}

export type ExpenseInput = Omit<import('@/types').Expense, 'id' | 'farmId' | 'correctsId'>

export interface RoomInput {
  id?: ID
  name: string
  type: GrowRoom['type']
  targets: GrowRoom['targets']
}

export interface CommandService {
  createBatch(farmId: ID, input: BatchInput): Promise<void>
  setBatchStatus(farmId: ID, batchId: ID, status: BatchStatus): Promise<void>
  /** Records a harvest and moves its net weight into stock. Append-only. */
  recordHarvest(farmId: ID, input: HarvestInput): Promise<void>
  recordMovement(farmId: ID, input: MovementInput): Promise<void>
  /** Bulk fresh product → retail packs. */
  packProduct(farmId: ID, input: PackInput): Promise<void>
  saveProduct(farmId: ID, input: Editable<import('@/types').InventoryProduct>): Promise<void>
  saveCustomer(farmId: ID, input: Editable<import('@/types').Customer>): Promise<void>
  saveSupplier(farmId: ID, input: Editable<import('@/types').Supplier>): Promise<void>
  saveEmployee(farmId: ID, input: Editable<import('@/types').Employee>): Promise<void>
  saveEquipment(farmId: ID, input: Editable<import('@/types').Equipment>): Promise<void>
  /** Marks maintenance done and schedules the next one. */
  completeMaintenance(farmId: ID, equipmentId: ID, nextMaintenance: string): Promise<void>
  /** Returns the new order code. */
  createOrder(farmId: ID, input: OrderInput): Promise<string>
  /** Stock leaves when an order ships or completes; cancelling a shipped order returns it. */
  setOrderStatus(farmId: ID, orderId: ID, status: import('@/types').OrderStatus): Promise<void>
  addExpense(farmId: ID, input: ExpenseInput): Promise<void>
  /** Expenses are never edited: a correction is a new, opposite record. */
  correctExpense(farmId: ID, expenseId: ID, reason: string): Promise<void>
  saveSpecies(farmId: ID, input: Editable<MushroomSpecies>): Promise<void>
  saveRoom(farmId: ID, input: RoomInput): Promise<void>
  saveFarm(farmId: ID, input: { name: string; location: string; timezone: string }): Promise<void>
  saveTask(farmId: ID, input: Editable<FarmTask>): Promise<void>
  setMemberRole(farmId: ID, userId: ID, role: Role): Promise<void>
  /** Registers a sensor for a room and stores its device token (hashed). */
  registerSensor(farmId: ID, input: { roomId: ID; provider: string; externalId: string; token: string }): Promise<void>
  /** Fills an empty farm with the sample data set. */
  loadDemoData(farmId: ID): Promise<void>
}
