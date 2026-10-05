/**
 * Domain model for Mushroom Farm Manager.
 *
 * Mirrors the Supabase schema in `supabase/migrations` (snake_case columns are
 * mapped to camelCase in the service layer). Every record belongs to a farm,
 * ids are UUIDs, and history is append-only: harvests, weighings, inventory
 * movements and financial transactions are never overwritten.
 */

export type ID = string
export type ISODate = string

// ---------- Organization ----------

export interface Farm {
  id: ID
  name: string
  location: string
  timezone: string
}

export type Role = 'OWNER' | 'FARM_MANAGER' | 'GROWER' | 'PACKING' | 'SALES' | 'ACCOUNTING' | 'EMPLOYEE'

export interface AppUser {
  id: ID
  name: string
  email: string
  role: Role
  /** Farms this user may access (enforced by RLS through farm_members). */
  farmIds: ID[]
}

export type StaffRole = 'farm_manager' | 'grower' | 'harvester' | 'packing' | 'sales' | 'delivery'

export interface Employee {
  id: ID
  farmId: ID
  name: string
  role: StaffRole
  phone: string
  email: string
  active: boolean
}

// ---------- Growing ----------

export interface Range {
  min: number
  max: number
}

export interface MushroomSpecies {
  id: ID
  name: string
  scientificName: string
  /** °F */
  incubationTemp: Range
  fruitingTemp: Range
  /** % relative humidity */
  humidity: Range
  /** ppm */
  co2: Range
  /** Expected harvest as a share of substrate weight (0–1). */
  averageYield: number
  /** Days from inoculation to first harvest. */
  averageGrowDays: number
  shelfLifeDays: number
  /** Chart colour slot (stable per species). */
  colorIndex: number
}

export type RoomType = 'grow' | 'incubation' | 'fruiting' | 'cold_storage' | 'packing' | 'processing'

export interface GrowRoom {
  id: ID
  farmId: ID
  name: string
  type: RoomType
  /** Target environment for the room. */
  targets: { temperature: Range; humidity: Range; co2: Range }
  sensorId: string
}

export type Metric = 'temperature' | 'humidity' | 'co2'

export interface EnvironmentalReading {
  roomId: ID
  sensorId: string
  timestamp: ISODate
  temperature: number
  humidity: number
  co2: number
}

export type BatchStatus =
  | 'PLANNED'
  | 'INOCULATED'
  | 'COLONIZING'
  | 'FRUITING'
  | 'READY_TO_HARVEST'
  | 'HARVESTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'DISCARDED'

export interface ProductionBatch {
  id: ID
  /** Human-facing code, e.g. 2026-00124. */
  code: string
  farmId: ID
  speciesId: ID
  roomId: ID
  substrate: string
  /** lb */
  substrateWeight: number
  spawnWeight: number
  bags: number
  spawnDate: ISODate
  inoculationDate: ISODate | null
  colonizationDate: ISODate | null
  fruitingDate: ISODate | null
  expectedHarvestDate: ISODate
  status: BatchStatus
  createdBy: ID
  /** Production cost attributed to the batch (substrate, spawn, labour share). */
  cost: number
  notes?: string
}

export type HarvestGrade = 'A' | 'B' | 'C'

/** One harvest flush. Append-only. */
export interface Harvest {
  id: ID
  batchId: ID
  date: ISODate
  /** Wet weight at harvest, lb */
  wetWeight: number
  wasteWeight: number
  grade: HarvestGrade
  employeeId: ID
  roomId: ID
}

// ---------- Inventory ----------

export type ProductCategory = 'fresh' | 'dried' | 'powder' | 'kit' | 'spawn' | 'substrate' | 'packaging' | 'supplies'

export type InventoryUnit = 'lb' | 'oz' | 'unit'

export interface InventoryLocation {
  id: ID
  farmId: ID
  name: string
  kind: 'grow_room' | 'cold_storage' | 'warehouse' | 'packing' | 'retail' | 'vehicle'
}

export interface InventoryProduct {
  id: ID
  farmId: ID
  sku: string
  name: string
  speciesId: ID | null
  category: ProductCategory
  unit: InventoryUnit
  /** Net weight of one unit in lb (for unit-based products). */
  unitWeight: number | null
  cost: number
  price: number
  reorderPoint: number
  locationId: ID
  perishable: boolean
}

export type MovementType = 'RECEIVED' | 'PRODUCED' | 'HARVESTED' | 'PACKED' | 'SOLD' | 'DAMAGED' | 'WASTED' | 'ADJUSTMENT' | 'TRANSFERRED'

/**
 * Every change to stock is a movement. Stock on hand is always the sum of
 * movements — the final number is never edited directly.
 */
export interface InventoryMovement {
  id: ID
  productId: ID
  type: MovementType
  /** Signed quantity in the product's unit. */
  quantity: number
  date: ISODate
  batchId: ID | null
  /** Lot expiry for perishable stock coming in. */
  expiresAt: ISODate | null
  fromLocationId: ID | null
  toLocationId: ID | null
  userId: ID
  reference?: string
}

// ---------- Sales ----------

export type CustomerType = 'wholesale' | 'restaurant' | 'retail' | 'individual' | 'distributor'

export interface Customer {
  id: ID
  farmId: ID
  name: string
  company?: string
  type: CustomerType
  email: string
  phone: string
  paymentTerms: 'due_on_receipt' | 'net_15' | 'net_30'
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED'
export type SaleChannel = 'in_person' | 'online' | 'wholesale' | 'delivery' | 'pickup'
export type PaymentMethod = 'card' | 'cash' | 'transfer' | 'invoice'

export interface OrderItem {
  productId: ID
  quantity: number
  unitPrice: number
  /** Unit cost captured at sale time (for COGS). */
  unitCost: number
}

export interface Order {
  id: ID
  code: string
  farmId: ID
  customerId: ID
  channel: SaleChannel
  status: OrderStatus
  items: OrderItem[]
  discount: number
  taxRate: number
  paymentMethod: PaymentMethod
  paid: boolean
  createdAt: ISODate
  dueAt: ISODate
  fulfillment: 'pickup' | 'delivery'
  processedBy: ID
}

// ---------- Finance ----------

export type ExpenseCategory =
  | 'substrate'
  | 'spawn'
  | 'electricity'
  | 'water'
  | 'rent'
  | 'labor'
  | 'packaging'
  | 'transportation'
  | 'equipment'
  | 'maintenance'
  | 'marketing'
  | 'insurance'
  | 'other'

/** Financial transactions are immutable; corrections are new records. */
export interface Expense {
  id: ID
  farmId: ID
  date: ISODate
  category: ExpenseCategory
  description: string
  /** Negative for a correction. */
  amount: number
  vendor: string
  paymentMethod: PaymentMethod
  supplierId?: ID | null
  /** Set when this record corrects (reverses) another expense. */
  correctsId?: ID | null
}

export interface Supplier {
  id: ID
  farmId: ID
  name: string
  email: string
  phone: string
}

/** A user with access to a farm (farm_members). */
export interface Member {
  userId: ID
  name: string
  email: string
  role: Role
}

export interface Sensor {
  id: ID
  farmId: ID
  roomId: ID
  provider: string
  externalId: string
  lastSeenAt: ISODate | null
}

// ---------- Operations ----------

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface FarmTask {
  id: ID
  farmId: ID
  title: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: ID
  dueAt: ISODate
  relatedBatchId?: ID
}

export interface Equipment {
  id: ID
  farmId: ID
  name: string
  kind: 'humidifier' | 'hvac' | 'fan' | 'sensor' | 'fridge' | 'scale' | 'sealer'
  roomId: ID
  serial: string
  status: 'operational' | 'maintenance_due' | 'offline'
  nextMaintenance: ISODate
}

// ---------- Alerts, audit ----------

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'
export type AlertType =
  | 'temperature_high'
  | 'temperature_low'
  | 'humidity_high'
  | 'humidity_low'
  | 'co2_high'
  | 'sensor_offline'
  | 'batch_overdue'
  | 'low_inventory'
  | 'order_overdue'
  | 'expiring'
  | 'maintenance_due'

export interface FarmAlert {
  /** Stable id derived from the cause, so status survives recomputation. */
  id: ID
  type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  createdAt: ISODate
  /** Room, product or entity the alert is about. */
  location: string
  params: Record<string, string | number>
  link?: string
}

export interface AuditEntry {
  id: ID
  userId: ID
  action: 'created' | 'updated' | 'recorded' | 'adjusted' | 'processed' | 'acknowledged' | 'resolved'
  entity: 'batch' | 'harvest' | 'inventory' | 'order' | 'product' | 'waste' | 'alert' | 'expense'
  entityLabel: string
  date: ISODate
  oldValue?: string
  newValue?: string
}

// ---------- Dashboard ----------

export type Period = 'today' | '7d' | '30d'

export interface DateRange {
  from: ISODate
  to: ISODate
}
