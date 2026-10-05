/** Row shapes as returned by PostgREST (snake_case) and their mapping to the domain model. */
import type {
  AuditEntry,
  Employee,
  EnvironmentalReading,
  Equipment,
  Expense,
  Farm,
  FarmTask,
  GrowRoom,
  Harvest,
  InventoryMovement,
  InventoryProduct,
  MushroomSpecies,
  Order,
  ProductionBatch,
} from '@/types'

const num = (v: number | string | null | undefined) => (v === null || v === undefined ? 0 : Number(v))

export interface FarmRow { id: string; name: string; location: string | null; timezone: string }
export const toFarm = (r: FarmRow): Farm => ({ id: r.id, name: r.name, location: r.location ?? '', timezone: r.timezone })

export interface SpeciesRow {
  id: string
  name: string
  scientific_name: string | null
  incubation_temp_min: number | null
  incubation_temp_max: number | null
  fruiting_temp_min: number | null
  fruiting_temp_max: number | null
  humidity_min: number | null
  humidity_max: number | null
  co2_min: number | null
  co2_max: number | null
  average_yield: number | string
  average_grow_days: number
  shelf_life_days: number
  color_index: number
}
export const toSpecies = (r: SpeciesRow): MushroomSpecies => ({
  id: r.id,
  name: r.name,
  scientificName: r.scientific_name ?? '',
  incubationTemp: { min: num(r.incubation_temp_min), max: num(r.incubation_temp_max) },
  fruitingTemp: { min: num(r.fruiting_temp_min), max: num(r.fruiting_temp_max) },
  humidity: { min: num(r.humidity_min), max: num(r.humidity_max) },
  co2: { min: num(r.co2_min), max: num(r.co2_max) },
  averageYield: num(r.average_yield),
  averageGrowDays: r.average_grow_days,
  shelfLifeDays: r.shelf_life_days,
  colorIndex: r.color_index,
})

export interface RoomRow {
  id: string
  farm_id: string
  name: string
  type: GrowRoom['type']
  target_temp_min: number | string
  target_temp_max: number | string
  target_humidity_min: number | string
  target_humidity_max: number | string
  target_co2_min: number
  target_co2_max: number
  sensors: { external_id: string }[] | null
}
export const toRoom = (r: RoomRow): GrowRoom => ({
  id: r.id,
  farmId: r.farm_id,
  name: r.name,
  type: r.type,
  targets: {
    temperature: { min: num(r.target_temp_min), max: num(r.target_temp_max) },
    humidity: { min: num(r.target_humidity_min), max: num(r.target_humidity_max) },
    co2: { min: num(r.target_co2_min), max: num(r.target_co2_max) },
  },
  sensorId: r.sensors?.[0]?.external_id ?? '',
})

export interface ReadingRow { room_id: string; sensor_id: string; recorded_at: string; temperature: number | string | null; humidity: number | string | null; co2: number | null }
export const toReading = (r: ReadingRow): EnvironmentalReading => ({
  roomId: r.room_id,
  sensorId: r.sensor_id,
  timestamp: new Date(r.recorded_at).toISOString(),
  temperature: num(r.temperature),
  humidity: num(r.humidity),
  co2: num(r.co2),
})

export interface EmployeeRow { id: string; farm_id: string; name: string; role: Employee['role']; phone: string | null; email: string | null; active: boolean }
export const toEmployee = (r: EmployeeRow): Employee => ({ id: r.id, farmId: r.farm_id, name: r.name, role: r.role, phone: r.phone ?? '', email: r.email ?? '', active: r.active })

export interface BatchRow {
  id: string
  farm_id: string
  code: string
  species_id: string
  room_id: string
  substrate: string
  substrate_weight: number | string
  spawn_weight: number | string
  bags: number
  spawn_date: string
  inoculation_date: string | null
  colonization_date: string | null
  fruiting_date: string | null
  expected_harvest_date: string
  status: ProductionBatch['status']
  cost: number | string
  notes: string | null
  created_by: string | null
}
const iso = (v: string) => new Date(v).toISOString()
const isoOrNull = (v: string | null) => (v ? iso(v) : null)
export const toBatch = (r: BatchRow): ProductionBatch => ({
  id: r.id,
  code: r.code,
  farmId: r.farm_id,
  speciesId: r.species_id,
  roomId: r.room_id,
  substrate: r.substrate,
  substrateWeight: num(r.substrate_weight),
  spawnWeight: num(r.spawn_weight),
  bags: r.bags,
  spawnDate: iso(r.spawn_date),
  inoculationDate: isoOrNull(r.inoculation_date),
  colonizationDate: isoOrNull(r.colonization_date),
  fruitingDate: isoOrNull(r.fruiting_date),
  expectedHarvestDate: iso(r.expected_harvest_date),
  status: r.status,
  createdBy: r.created_by ?? '',
  cost: num(r.cost),
  notes: r.notes ?? undefined,
})

export interface HarvestRow { id: string; batch_id: string; room_id: string; harvested_at: string; wet_weight: number | string; waste_weight: number | string; grade: Harvest['grade']; employee_id: string | null }
export const toHarvest = (r: HarvestRow): Harvest => ({
  id: r.id,
  batchId: r.batch_id,
  date: iso(r.harvested_at),
  wetWeight: num(r.wet_weight),
  wasteWeight: num(r.waste_weight),
  grade: r.grade,
  employeeId: r.employee_id ?? '',
  roomId: r.room_id,
})

export interface ProductRow {
  id: string
  farm_id: string
  sku: string
  name: string
  species_id: string | null
  category: InventoryProduct['category']
  unit: InventoryProduct['unit']
  unit_weight: number | string | null
  cost: number | string
  price: number | string
  reorder_point: number | string
  location_id: string | null
  perishable: boolean
}
export const toProduct = (r: ProductRow): InventoryProduct => ({
  id: r.id,
  farmId: r.farm_id,
  sku: r.sku,
  name: r.name,
  speciesId: r.species_id,
  category: r.category,
  unit: r.unit,
  unitWeight: r.unit_weight === null ? null : num(r.unit_weight),
  cost: num(r.cost),
  price: num(r.price),
  reorderPoint: num(r.reorder_point),
  locationId: r.location_id ?? '',
  perishable: r.perishable,
})

export interface MovementRow {
  id: string
  product_id: string
  type: InventoryMovement['type']
  quantity: number | string
  created_at: string
  batch_id: string | null
  expires_at: string | null
  from_location_id: string | null
  to_location_id: string | null
  user_id: string | null
  reference: string | null
}
export const toMovement = (r: MovementRow): InventoryMovement => ({
  id: r.id,
  productId: r.product_id,
  type: r.type,
  quantity: num(r.quantity),
  date: iso(r.created_at),
  batchId: r.batch_id,
  expiresAt: isoOrNull(r.expires_at),
  fromLocationId: r.from_location_id,
  toLocationId: r.to_location_id,
  userId: r.user_id ?? '',
  reference: r.reference ?? undefined,
})

export interface OrderRow {
  id: string
  farm_id: string
  code: string
  customer_id: string | null
  channel: Order['channel']
  status: Order['status']
  discount: number | string
  tax_rate: number | string
  payment_method: Order['paymentMethod']
  paid: boolean
  fulfillment: Order['fulfillment']
  due_at: string | null
  processed_by: string | null
  created_at: string
  order_items: { product_id: string; quantity: number | string; unit_price: number | string; unit_cost: number | string }[] | null
}
export const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  code: r.code,
  farmId: r.farm_id,
  customerId: r.customer_id ?? '',
  channel: r.channel,
  status: r.status,
  items: (r.order_items ?? []).map((i) => ({ productId: i.product_id, quantity: num(i.quantity), unitPrice: num(i.unit_price), unitCost: num(i.unit_cost) })),
  discount: num(r.discount),
  taxRate: num(r.tax_rate),
  paymentMethod: r.payment_method,
  paid: r.paid,
  createdAt: iso(r.created_at),
  dueAt: r.due_at ? iso(r.due_at) : iso(r.created_at),
  fulfillment: r.fulfillment,
  processedBy: r.processed_by ?? '',
})

export interface ExpenseRow { id: string; farm_id: string; spent_at: string; category: Expense['category']; description: string; amount: number | string; vendor: string | null; payment_method: Expense['paymentMethod'] }
export const toExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  farmId: r.farm_id,
  date: iso(r.spent_at),
  category: r.category,
  description: r.description,
  amount: num(r.amount),
  vendor: r.vendor ?? '',
  paymentMethod: r.payment_method,
})

export interface TaskRow { id: string; farm_id: string; title: string; status: FarmTask['status']; priority: FarmTask['priority']; assignee_id: string | null; due_at: string | null; related_batch_id: string | null }
export const toTask = (r: TaskRow): FarmTask => ({
  id: r.id,
  farmId: r.farm_id,
  title: r.title,
  status: r.status,
  priority: r.priority,
  assigneeId: r.assignee_id ?? '',
  dueAt: r.due_at ? iso(r.due_at) : new Date().toISOString(),
  relatedBatchId: r.related_batch_id ?? undefined,
})

export interface EquipmentRow { id: string; farm_id: string; room_id: string | null; name: string; kind: Equipment['kind']; serial: string | null; status: Equipment['status']; next_maintenance: string | null }
export const toEquipment = (r: EquipmentRow): Equipment => ({
  id: r.id,
  farmId: r.farm_id,
  name: r.name,
  kind: r.kind,
  roomId: r.room_id ?? '',
  serial: r.serial ?? '',
  status: r.status,
  nextMaintenance: r.next_maintenance ? iso(r.next_maintenance) : iso('2100-01-01'),
})

type Json = string | number | boolean | null | { [key: string]: Json } | Json[]
export interface AuditRow { id: number; user_id: string | null; action: string; entity: string; entity_id: string | null; old_value: Json; new_value: Json; created_at: string }

const ENTITY: Record<string, AuditEntry['entity']> = {
  production_batches: 'batch',
  harvests: 'harvest',
  inventory_movements: 'inventory',
  inventory_products: 'product',
  orders: 'order',
  expenses: 'expense',
  alerts: 'alert',
}

const field = (v: Json, key: string): string | undefined => {
  if (v && typeof v === 'object' && !Array.isArray(v) && v[key] !== undefined && v[key] !== null) return String(v[key])
  return undefined
}

/** Turns a generic trigger row into a readable activity entry. */
export function toAudit(r: AuditRow, batchCode: (id: string) => string | undefined): AuditEntry | null {
  const entity = ENTITY[r.entity]
  if (!entity) return null
  const n = r.new_value
  const o = r.old_value
  const base = { id: String(r.id), userId: r.user_id ?? '', entity, date: iso(r.created_at) }
  switch (entity) {
    case 'batch':
      return { ...base, action: r.action === 'insert' ? 'created' : 'updated', entityLabel: `#${field(n, 'code') ?? ''}`, oldValue: r.action === 'update' ? field(o, 'status') : undefined, newValue: field(n, 'status') }
    case 'harvest': {
      const code = batchCode(field(n, 'batch_id') ?? '')
      return { ...base, action: 'recorded', entityLabel: code ? `#${code}` : '', newValue: `${field(n, 'wet_weight')} lb` }
    }
    case 'inventory':
      return { ...base, action: field(n, 'type') === 'WASTED' ? 'recorded' : 'adjusted', entity: field(n, 'type') === 'WASTED' ? 'waste' : 'inventory', entityLabel: field(n, 'reference') ?? '', newValue: field(n, 'quantity') }
    case 'product':
      return { ...base, action: r.action === 'insert' ? 'created' : 'updated', entityLabel: field(n, 'name') ?? field(o, 'name') ?? '', oldValue: field(o, 'price'), newValue: field(n, 'price') }
    case 'order':
      return { ...base, action: 'processed', entityLabel: field(n, 'code') ?? '', newValue: field(n, 'status') }
    case 'alert': {
      const status = field(n, 'status')
      return { ...base, action: status === 'RESOLVED' ? 'resolved' : 'acknowledged', entityLabel: field(n, 'location') ?? '', oldValue: field(o, 'status'), newValue: status }
    }
    case 'expense':
      return { ...base, action: 'recorded', entityLabel: field(n, 'description') ?? '', newValue: field(n, 'amount') }
    default:
      return null
  }
}
