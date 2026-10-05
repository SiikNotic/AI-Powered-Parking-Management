import type { CustomerType, Equipment, ExpenseCategory, GrowRoom, InventoryProduct, MushroomSpecies, Range, StaffRole } from '@/types'

export type { CustomerType }

export type SpeciesKey = 'oyster' | 'lions_mane' | 'shiitake' | 'king_oyster' | 'reishi'
export type RoomKey = 'grow1' | 'grow2' | 'grow3' | 'incubation' | 'fruiting' | 'cold' | 'packing' | 'processing'

export type SpeciesSeed = Omit<MushroomSpecies, 'id' | 'colorIndex'> & { key: SpeciesKey; costPerLb: number }

export interface RoomSeed {
  key: RoomKey
  name: string
  type: GrowRoom['type']
  species: SpeciesKey[]
  targets: GrowRoom['targets']
  base: { temperature: number; humidity: number; co2: number }
}

export interface ProductSeed {
  sku: string
  name: string
  species: SpeciesKey | null
  category: InventoryProduct['category']
  unit: InventoryProduct['unit']
  unitWeight: number | null
  price: number
  reorderPoint: number
  location: RoomKey | 'warehouse'
  perishable: boolean
  cost?: number
  packedFrom?: string
  driedFrom?: string
}

export interface StaffSeed {
  name: string
  role: StaffRole
}

export interface EquipmentRecordSeed {
  name: string
  kind: Equipment['kind']
  room: RoomKey
  dueInDays: number
  offline?: boolean
}

export interface ExpenseSeed {
  category: ExpenseCategory
  description: string
  vendor: string
  amount: number
  everyDays: number
  offset: number
  jitter?: number
}

export type { Range }
