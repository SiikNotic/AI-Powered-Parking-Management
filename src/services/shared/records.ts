import type {
  AuditEntry,
  Employee,
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

/** Everything the dashboard needs about one farm — loaded from demo data or Supabase. */
export interface FarmRecords {
  farm: Farm
  species: MushroomSpecies[]
  rooms: GrowRoom[]
  employees: Employee[]
  batches: ProductionBatch[]
  harvests: Harvest[]
  products: InventoryProduct[]
  movements: InventoryMovement[]
  orders: Order[]
  expenses: Expense[]
  tasks: FarmTask[]
  equipment: Equipment[]
  /** Newest first. */
  audit: AuditEntry[]
}
