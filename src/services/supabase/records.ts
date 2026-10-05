/**
 * Loads a farm's records for the dashboard (RLS limits everything to farms
 * the user belongs to). Results are cached per farm and invalidated by
 * Realtime events.
 *
 * Next step: move heavy aggregates (stock, P&L) into SQL views/RPCs so the
 * browser downloads totals instead of history.
 */
import type { FarmRecords } from '../shared/records'
import { fetchAll, supabase } from './client'
import {
  toAudit,
  toBatch,
  toEmployee,
  toEquipment,
  toExpense,
  toFarm,
  toHarvest,
  toMovement,
  toOrder,
  toProduct,
  toRoom,
  toSpecies,
  toTask,
  type AuditRow,
  type BatchRow,
  type EmployeeRow,
  type EquipmentRow,
  type ExpenseRow,
  type FarmRow,
  type HarvestRow,
  type MovementRow,
  type OrderRow,
  type ProductRow,
  type RoomRow,
  type SpeciesRow,
  type TaskRow,
} from './rows'

const DAY = 86_400_000
/** 30-day period + the 30 days before it for comparisons. */
const HISTORY_DAYS = 62

const cache = new Map<string, Promise<FarmRecords>>()

export function invalidateRecords(farmId: string) {
  cache.delete(farmId)
}

export function getRecords(farmId: string): Promise<FarmRecords> {
  let pending = cache.get(farmId)
  if (!pending) {
    pending = load(farmId)
    pending.catch(() => cache.delete(farmId))
    cache.set(farmId, pending)
  }
  return pending
}

async function load(farmId: string): Promise<FarmRecords> {
  const db = supabase()
  const since = new Date(Date.now() - HISTORY_DAYS * DAY).toISOString()
  // Harvests further back are needed for batches still producing (forecast).
  const harvestSince = new Date(Date.now() - 150 * DAY).toISOString()
  const one = async <T,>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>) => {
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data as T
  }

  const [farm, species, rooms, employees, batches, harvests, products, movements, orders, openOrders, expenses, tasks, equipment, audit] = await Promise.all([
    one<FarmRow>(db.from('farms').select('id,name,location,timezone').eq('id', farmId).single()),
    one<SpeciesRow[]>(db.from('mushroom_species').select('*').eq('farm_id', farmId).order('name')),
    one<RoomRow[]>(db.from('grow_rooms').select('*, sensors(external_id)').eq('farm_id', farmId).order('name')),
    one<EmployeeRow[]>(db.from('employees').select('*').eq('farm_id', farmId)),
    fetchAll<BatchRow>((a, b) => db.from('production_batches').select('*').eq('farm_id', farmId).or(`spawn_date.gte.${harvestSince},status.in.(PLANNED,INOCULATED,COLONIZING,FRUITING,READY_TO_HARVEST,HARVESTED)`).order('spawn_date').range(a, b)),
    fetchAll<HarvestRow>((a, b) => db.from('harvests').select('*').eq('farm_id', farmId).gte('harvested_at', harvestSince).order('harvested_at').range(a, b)),
    one<ProductRow[]>(db.from('inventory_products').select('*').eq('farm_id', farmId).order('name')),
    // Stock is the sum of all movements, so the full history is needed.
    fetchAll<MovementRow>((a, b) => db.from('inventory_movements').select('*').eq('farm_id', farmId).order('created_at').order('id').range(a, b)),
    fetchAll<OrderRow>((a, b) => db.from('orders').select('*, order_items(product_id,quantity,unit_price,unit_cost)').eq('farm_id', farmId).gte('created_at', since).order('created_at').range(a, b)),
    one<OrderRow[]>(db.from('orders').select('*, order_items(product_id,quantity,unit_price,unit_cost)').eq('farm_id', farmId).lt('created_at', since).not('status', 'in', '(COMPLETED,CANCELLED)')),
    fetchAll<ExpenseRow>((a, b) => db.from('expenses').select('*').eq('farm_id', farmId).gte('spent_at', since).order('spent_at').range(a, b)),
    one<TaskRow[]>(db.from('farm_tasks').select('*').eq('farm_id', farmId).or(`status.neq.COMPLETED,due_at.gte.${new Date(Date.now() - DAY).toISOString()}`)),
    one<EquipmentRow[]>(db.from('equipment').select('*').eq('farm_id', farmId)),
    // Audit is visible to managers/accounting only; others get an empty list from RLS.
    one<AuditRow[]>(db.from('audit_log').select('*').eq('farm_id', farmId).order('created_at', { ascending: false }).limit(40)),
  ])

  const mappedBatches = batches.map(toBatch)
  const codeById = new Map(mappedBatches.map((b) => [b.id, b.code]))
  return {
    farm: toFarm(farm),
    species: species.map(toSpecies),
    rooms: rooms.map(toRoom),
    employees: employees.map(toEmployee),
    batches: mappedBatches,
    harvests: harvests.map(toHarvest),
    products: products.map(toProduct),
    movements: movements.map(toMovement),
    orders: [...openOrders, ...orders].map(toOrder),
    expenses: expenses.map(toExpense),
    tasks: tasks.map(toTask),
    equipment: equipment.map(toEquipment),
    audit: audit.map((r) => toAudit(r, (id) => codeById.get(id))).filter((a) => a !== null).slice(0, 12),
  }
}
