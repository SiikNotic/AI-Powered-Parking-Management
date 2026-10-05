/**
 * ⚠️ DEMO DATA — reference catalog for the sample farm (species, rooms,
 * products, people, equipment). Records over time are built in generate.ts.
 */
import type { CustomerType, EquipmentRecordSeed, ExpenseSeed, ProductSeed, RoomSeed, SpeciesSeed, StaffSeed } from './seedTypes'

export const SPECIES: SpeciesSeed[] = [
  { key: 'oyster', name: 'Blue Oyster', scientificName: 'Pleurotus ostreatus', incubationTemp: { min: 70, max: 75 }, fruitingTemp: { min: 55, max: 65 }, humidity: { min: 85, max: 95 }, co2: { min: 400, max: 900 }, averageYield: 0.78, averageGrowDays: 21, shelfLifeDays: 7, costPerLb: 3.4 },
  { key: 'lions_mane', name: 'Lion’s Mane', scientificName: 'Hericium erinaceus', incubationTemp: { min: 70, max: 75 }, fruitingTemp: { min: 60, max: 70 }, humidity: { min: 85, max: 95 }, co2: { min: 400, max: 1000 }, averageYield: 0.58, averageGrowDays: 28, shelfLifeDays: 7, costPerLb: 4.6 },
  { key: 'shiitake', name: 'Shiitake', scientificName: 'Lentinula edodes', incubationTemp: { min: 70, max: 77 }, fruitingTemp: { min: 55, max: 70 }, humidity: { min: 80, max: 90 }, co2: { min: 400, max: 1500 }, averageYield: 0.52, averageGrowDays: 56, shelfLifeDays: 10, costPerLb: 5.1 },
  { key: 'king_oyster', name: 'King Oyster', scientificName: 'Pleurotus eryngii', incubationTemp: { min: 70, max: 75 }, fruitingTemp: { min: 55, max: 65 }, humidity: { min: 85, max: 90 }, co2: { min: 400, max: 1500 }, averageYield: 0.62, averageGrowDays: 35, shelfLifeDays: 10, costPerLb: 4.2 },
  { key: 'reishi', name: 'Reishi', scientificName: 'Ganoderma lingzhi', incubationTemp: { min: 75, max: 82 }, fruitingTemp: { min: 75, max: 85 }, humidity: { min: 85, max: 95 }, co2: { min: 400, max: 2000 }, averageYield: 0.18, averageGrowDays: 60, shelfLifeDays: 365, costPerLb: 14 },
]

export const ROOMS: RoomSeed[] = [
  { key: 'grow1', name: 'Grow Room 01', type: 'grow', species: ['oyster', 'king_oyster'], targets: { temperature: { min: 58, max: 66 }, humidity: { min: 85, max: 95 }, co2: { min: 400, max: 1000 } }, base: { temperature: 62, humidity: 89, co2: 820 } },
  { key: 'grow2', name: 'Grow Room 02', type: 'grow', species: ['lions_mane'], targets: { temperature: { min: 60, max: 70 }, humidity: { min: 85, max: 95 }, co2: { min: 400, max: 1000 } }, base: { temperature: 66, humidity: 88, co2: 760 } },
  { key: 'grow3', name: 'Grow Room 03', type: 'grow', species: ['shiitake', 'reishi'], targets: { temperature: { min: 58, max: 72 }, humidity: { min: 80, max: 92 }, co2: { min: 400, max: 1500 } }, base: { temperature: 65, humidity: 86, co2: 980 } },
  { key: 'incubation', name: 'Incubation Room', type: 'incubation', species: [], targets: { temperature: { min: 70, max: 77 }, humidity: { min: 60, max: 75 }, co2: { min: 800, max: 5000 } }, base: { temperature: 73, humidity: 68, co2: 2400 } },
  { key: 'fruiting', name: 'Fruiting Room', type: 'fruiting', species: ['oyster', 'lions_mane'], targets: { temperature: { min: 58, max: 68 }, humidity: { min: 85, max: 95 }, co2: { min: 400, max: 1000 } }, base: { temperature: 63, humidity: 90, co2: 880 } },
  { key: 'cold', name: 'Cold Storage', type: 'cold_storage', species: [], targets: { temperature: { min: 34, max: 38 }, humidity: { min: 85, max: 95 }, co2: { min: 400, max: 5000 } }, base: { temperature: 36, humidity: 90, co2: 650 } },
  { key: 'packing', name: 'Packing Area', type: 'packing', species: [], targets: { temperature: { min: 60, max: 72 }, humidity: { min: 35, max: 65 }, co2: { min: 400, max: 1200 } }, base: { temperature: 67, humidity: 48, co2: 520 } },
  { key: 'processing', name: 'Processing Area', type: 'processing', species: [], targets: { temperature: { min: 60, max: 75 }, humidity: { min: 30, max: 60 }, co2: { min: 400, max: 1200 } }, base: { temperature: 69, humidity: 41, co2: 560 } },
]

export const PRODUCTS: ProductSeed[] = [
  { sku: 'FR-OYS-LB', name: 'Fresh Blue Oyster', species: 'oyster', category: 'fresh', unit: 'lb', unitWeight: null, price: 12, reorderPoint: 25, location: 'cold', perishable: true },
  { sku: 'FR-LMN-LB', name: 'Fresh Lion’s Mane', species: 'lions_mane', category: 'fresh', unit: 'lb', unitWeight: null, price: 18, reorderPoint: 15, location: 'cold', perishable: true },
  { sku: 'FR-SHI-LB', name: 'Fresh Shiitake', species: 'shiitake', category: 'fresh', unit: 'lb', unitWeight: null, price: 16, reorderPoint: 15, location: 'cold', perishable: true },
  { sku: 'FR-KOY-LB', name: 'Fresh King Oyster', species: 'king_oyster', category: 'fresh', unit: 'lb', unitWeight: null, price: 14, reorderPoint: 12, location: 'cold', perishable: true },
  { sku: 'PK-LMN-8OZ', name: 'Lion’s Mane · 8 oz', species: 'lions_mane', category: 'fresh', unit: 'unit', unitWeight: 0.5, price: 11, reorderPoint: 20, location: 'cold', perishable: true, packedFrom: 'FR-LMN-LB' },
  { sku: 'PK-OYS-8OZ', name: 'Blue Oyster · 8 oz', species: 'oyster', category: 'fresh', unit: 'unit', unitWeight: 0.5, price: 7.5, reorderPoint: 24, location: 'cold', perishable: true, packedFrom: 'FR-OYS-LB' },
  { sku: 'PK-SHI-1LB', name: 'Shiitake · 1 lb', species: 'shiitake', category: 'fresh', unit: 'unit', unitWeight: 1, price: 17, reorderPoint: 10, location: 'cold', perishable: true, packedFrom: 'FR-SHI-LB' },
  { sku: 'DR-SHI-LB', name: 'Dried Shiitake', species: 'shiitake', category: 'dried', unit: 'lb', unitWeight: null, price: 48, reorderPoint: 4, location: 'warehouse', perishable: false, driedFrom: 'FR-SHI-LB' },
  { sku: 'DR-REI-LB', name: 'Dried Reishi', species: 'reishi', category: 'dried', unit: 'lb', unitWeight: null, price: 85, reorderPoint: 3, location: 'warehouse', perishable: false },
  { sku: 'PW-LMN-2OZ', name: 'Lion’s Mane Powder · 2 oz', species: 'lions_mane', category: 'powder', unit: 'unit', unitWeight: 0.125, price: 24, reorderPoint: 15, location: 'warehouse', perishable: false },
  { sku: 'KIT-OYS', name: 'Oyster Grow Kit', species: 'oyster', category: 'kit', unit: 'unit', unitWeight: 5, price: 32, reorderPoint: 8, location: 'warehouse', perishable: false },
  { sku: 'SUP-SPAWN', name: 'Grain Spawn', species: null, category: 'spawn', unit: 'lb', unitWeight: null, price: 0, reorderPoint: 60, location: 'warehouse', perishable: false, cost: 3 },
  { sku: 'SUP-SUBST', name: 'Hardwood Substrate', species: null, category: 'substrate', unit: 'lb', unitWeight: null, price: 0, reorderPoint: 400, location: 'warehouse', perishable: false, cost: 0.8 },
  { sku: 'SUP-CLAM8', name: 'Clamshell 8 oz', species: null, category: 'packaging', unit: 'unit', unitWeight: null, price: 0, reorderPoint: 150, location: 'packing', perishable: false, cost: 0.22 },
  { sku: 'SUP-BOX', name: 'Shipping Box', species: null, category: 'packaging', unit: 'unit', unitWeight: null, price: 0, reorderPoint: 40, location: 'packing', perishable: false, cost: 1.1 },
  { sku: 'SUP-LABEL', name: 'Product Labels', species: null, category: 'packaging', unit: 'unit', unitWeight: null, price: 0, reorderPoint: 300, location: 'packing', perishable: false, cost: 0.04 },
  { sku: 'SUP-BAGS', name: 'Filter Patch Grow Bags', species: null, category: 'supplies', unit: 'unit', unitWeight: null, price: 0, reorderPoint: 200, location: 'warehouse', perishable: false, cost: 0.45 },
]

export const STAFF: StaffSeed[] = [
  { name: 'Maria Lopez', role: 'farm_manager' },
  { name: 'John Becker', role: 'grower' },
  { name: 'Aisha Rahman', role: 'grower' },
  { name: 'Michael Chen', role: 'harvester' },
  { name: 'Sofia Alvarez', role: 'harvester' },
  { name: 'Sarah Kim', role: 'packing' },
  { name: 'David Okafor', role: 'sales' },
  { name: 'Luis Ortega', role: 'delivery' },
]

export const CUSTOMERS: { name: string; company?: string; type: CustomerType }[] = [
  { name: 'Elena Marsh', company: 'Harvest Table Bistro', type: 'restaurant' },
  { name: 'Tom Reyes', company: 'Fork & Spore', type: 'restaurant' },
  { name: 'Priya Nair', company: 'Green Basket Market', type: 'retail' },
  { name: 'Ben Walsh', company: 'Keystone Produce Co.', type: 'wholesale' },
  { name: 'Grace Liu', company: 'Golden Wok', type: 'restaurant' },
  { name: 'Marcus Hill', company: 'Lancaster Food Hub', type: 'distributor' },
  { name: 'Olivia Grant', company: 'The Root Cellar', type: 'restaurant' },
  { name: 'Daniel Price', company: 'Main Street Co-op', type: 'retail' },
  { name: 'Hannah Stoltz', type: 'individual' },
  { name: 'Carlos Vega', company: 'Vega Fine Foods', type: 'wholesale' },
  { name: 'Emily Park', type: 'individual' },
  { name: 'Noah Fischer', company: 'Amish Country Grocers', type: 'retail' },
  { name: 'Ava Romano', company: 'Trattoria Romano', type: 'restaurant' },
  { name: 'Liam Murphy', type: 'individual' },
  { name: 'Chloe Martin', company: 'Wellness Pantry', type: 'retail' },
  { name: 'Ethan Brooks', company: 'Mid-Atlantic Fresh', type: 'distributor' },
  { name: 'Isabel Cruz', type: 'individual' },
  { name: 'Ryan Kelly', company: 'Smokehouse 23', type: 'restaurant' },
]

export const EQUIPMENT: EquipmentRecordSeed[] = [
  { name: 'Ultrasonic Humidifier A', kind: 'humidifier', room: 'grow1', dueInDays: 18 },
  { name: 'Ultrasonic Humidifier B', kind: 'humidifier', room: 'grow2', dueInDays: 2 },
  { name: 'Humidifier C', kind: 'humidifier', room: 'fruiting', dueInDays: 25 },
  { name: 'HVAC Unit 1', kind: 'hvac', room: 'grow1', dueInDays: 40 },
  { name: 'HVAC Unit 2', kind: 'hvac', room: 'grow3', dueInDays: 12 },
  { name: 'Inline Fan — Fruiting', kind: 'fan', room: 'fruiting', dueInDays: 1 },
  { name: 'Exhaust Fan — Incubation', kind: 'fan', room: 'incubation', dueInDays: 30 },
  { name: 'Walk-in Cooler', kind: 'fridge', room: 'cold', dueInDays: 21 },
  { name: 'Bench Scale 30 lb', kind: 'scale', room: 'packing', dueInDays: 60 },
  { name: 'Floor Scale 300 lb', kind: 'scale', room: 'processing', dueInDays: 45 },
  { name: 'Impulse Sealer', kind: 'sealer', room: 'packing', dueInDays: 35 },
  { name: 'Env. Sensor — Processing', kind: 'sensor', room: 'processing', dueInDays: 90, offline: true },
]

export const EXPENSES: ExpenseSeed[] = [
  { category: 'rent', description: 'Facility lease', vendor: 'Conestoga Properties', amount: 3200, everyDays: 30, offset: 4 },
  { category: 'insurance', description: 'Farm & liability insurance', vendor: 'Penn Mutual Ag', amount: 385, everyDays: 30, offset: 9 },
  { category: 'electricity', description: 'Electricity', vendor: 'PPL Electric', amount: 460, everyDays: 7, offset: 2, jitter: 0.18 },
  { category: 'water', description: 'Water & sewer', vendor: 'Lancaster Water', amount: 95, everyDays: 14, offset: 6, jitter: 0.1 },
  { category: 'labor', description: 'Weekly payroll', vendor: 'Payroll', amount: 1850, everyDays: 7, offset: 5, jitter: 0.05 },
  { category: 'transportation', description: 'Delivery fuel', vendor: 'Sheetz', amount: 85, everyDays: 4, offset: 1, jitter: 0.35 },
  { category: 'maintenance', description: 'HVAC service', vendor: 'Comfort Air Services', amount: 240, everyDays: 30, offset: 17 },
  { category: 'marketing', description: 'Farmers market booth', vendor: 'Lancaster Central Market', amount: 120, everyDays: 14, offset: 10 },
  { category: 'equipment', description: 'Replacement sensor probes', vendor: 'GrowTech Supply', amount: 310, everyDays: 30, offset: 21 },
]
