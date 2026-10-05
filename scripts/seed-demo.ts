/**
 * Writes SQL that loads the generated demo farm into a Supabase project, so a
 * new project has realistic data to explore. Usage:
 *
 *   npm run seed:sql            → supabase/seed/out/*.sql (git-ignored)
 *
 * Run the files in order in the SQL editor (or `psql`). They insert a farm
 * named "Evergreen Mycology (demo)" and its history. Triggers are disabled
 * while seeding so history can be back-dated. Then add yourself as owner:
 *
 *   insert into farm_members (farm_id, user_id, role)
 *   values ('<farm id printed below>', '<your auth user id>', 'OWNER');
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateFarm } from '../src/data/demo/generate'

const FARM_ID = '0d6b8f3a-5c2e-4f7a-9e1b-3a4c5d6e7f80'
const OUT = process.argv[2] ?? 'supabase/seed/out'
const MAX_ROWS = 400

const data = generateFarm({ farm: { id: FARM_ID, name: 'Evergreen Mycology (demo)', location: 'Lancaster, PA', timezone: 'America/New_York' }, seed: 2026, scale: 1 })

type Value = string | number | boolean | null | undefined | object
const lit = (v: Value): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
  return `'${v.replace(/'/g, "''")}'`
}

const files: string[] = []
let part = 0
function insert(table: string, rows: Record<string, Value>[]) {
  for (let i = 0; i < rows.length; i += MAX_ROWS) {
    const chunk = rows.slice(i, i + MAX_ROWS)
    if (!chunk.length) continue
    const cols = Object.keys(chunk[0])
    const values = chunk.map((r) => `(${cols.map((c) => lit(r[c])).join(', ')})`).join(',\n')
    files.push(`-- ${table}\nset session_replication_role = replica;\ninsert into ${table} (${cols.join(', ')}) values\n${values};\nset session_replication_role = origin;\n`)
  }
}

const uuid = (n: number) => `5e2f0000-0000-4000-8000-${String(n).padStart(12, '0')}`
const sensorIds = new Map(data.rooms.map((r, i) => [r.id, uuid(i + 1)]))

insert('farms', [{ id: FARM_ID, name: data.farm.name, location: data.farm.location, timezone: data.farm.timezone }])
insert('employees', data.employees.map((e) => ({ id: e.id, farm_id: FARM_ID, name: e.name, role: e.role, phone: e.phone, email: e.email, active: e.active })))
insert('mushroom_species', data.species.map((s) => ({
  id: s.id, farm_id: FARM_ID, name: s.name, scientific_name: s.scientificName,
  incubation_temp_min: s.incubationTemp.min, incubation_temp_max: s.incubationTemp.max, fruiting_temp_min: s.fruitingTemp.min, fruiting_temp_max: s.fruitingTemp.max,
  humidity_min: s.humidity.min, humidity_max: s.humidity.max, co2_min: s.co2.min, co2_max: s.co2.max,
  average_yield: s.averageYield, average_grow_days: s.averageGrowDays, shelf_life_days: s.shelfLifeDays, color_index: s.colorIndex,
})))
insert('grow_rooms', data.rooms.map((r) => ({
  id: r.id, farm_id: FARM_ID, name: r.name, type: r.type,
  target_temp_min: r.targets.temperature.min, target_temp_max: r.targets.temperature.max,
  target_humidity_min: r.targets.humidity.min, target_humidity_max: r.targets.humidity.max,
  target_co2_min: r.targets.co2.min, target_co2_max: r.targets.co2.max,
})))
insert('sensors', data.rooms.map((r) => ({ id: sensorIds.get(r.id)!, farm_id: FARM_ID, room_id: r.id, provider: 'demo', external_id: r.sensorId, last_seen_at: null })))
insert('inventory_locations', data.locations.map((l) => ({ id: l.id, farm_id: FARM_ID, name: l.name, kind: l.kind })))
insert('inventory_products', data.products.map((p) => ({
  id: p.id, farm_id: FARM_ID, sku: p.sku, name: p.name, species_id: p.speciesId, category: p.category, unit: p.unit, unit_weight: p.unitWeight,
  cost: p.cost, price: p.price, reorder_point: p.reorderPoint, location_id: p.locationId, perishable: p.perishable,
})))
insert('production_batches', data.batches.map((b) => ({
  id: b.id, farm_id: FARM_ID, code: b.code, species_id: b.speciesId, room_id: b.roomId, substrate: b.substrate, substrate_weight: b.substrateWeight,
  spawn_weight: b.spawnWeight, bags: b.bags, spawn_date: b.spawnDate, inoculation_date: b.inoculationDate, colonization_date: b.colonizationDate,
  fruiting_date: b.fruitingDate, expected_harvest_date: b.expectedHarvestDate, status: b.status, cost: b.cost, notes: b.notes ?? null, created_at: b.spawnDate,
})))
insert('harvests', data.harvests.map((h) => ({
  id: h.id, farm_id: FARM_ID, batch_id: h.batchId, room_id: h.roomId, harvested_at: h.date, wet_weight: h.wetWeight, waste_weight: h.wasteWeight,
  grade: h.grade, employee_id: h.employeeId, created_by: null, created_at: h.date,
})))
insert('inventory_movements', data.movements.map((m) => ({
  id: m.id, farm_id: FARM_ID, product_id: m.productId, type: m.type, quantity: m.quantity, batch_id: m.batchId, expires_at: m.expiresAt,
  from_location_id: m.fromLocationId, to_location_id: m.toLocationId, reference: m.reference ?? null, user_id: null, created_at: m.date,
})))
insert('customers', data.customers.map((c) => ({ id: c.id, farm_id: FARM_ID, name: c.name, company: c.company ?? null, type: c.type, email: c.email, phone: c.phone, payment_terms: c.paymentTerms })))
insert('orders', data.orders.map((o) => ({
  id: o.id, farm_id: FARM_ID, code: o.code, customer_id: o.customerId, channel: o.channel, status: o.status, discount: o.discount, tax_rate: o.taxRate,
  payment_method: o.paymentMethod, paid: o.paid, fulfillment: o.fulfillment, due_at: o.dueAt, processed_by: null, created_at: o.createdAt,
})))
insert('order_items', data.orders.flatMap((o) => o.items.map((i) => ({ farm_id: FARM_ID, order_id: o.id, product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice, unit_cost: i.unitCost }))))
insert('expenses', data.expenses.map((e) => ({ id: e.id, farm_id: FARM_ID, spent_at: e.date, category: e.category, description: e.description, amount: e.amount, vendor: e.vendor, payment_method: e.paymentMethod, created_by: null, created_at: e.date })))
insert('equipment', data.equipment.map((e) => ({ id: e.id, farm_id: FARM_ID, room_id: e.roomId, name: e.name, kind: e.kind, serial: e.serial, status: e.status, next_maintenance: e.nextMaintenance })))
insert('farm_tasks', data.tasks.map((t) => ({ id: t.id, farm_id: FARM_ID, title: t.title, status: t.status, priority: t.priority, assignee_id: t.assigneeId, due_at: t.dueAt, related_batch_id: t.relatedBatchId ?? null })))
// Sensor history: the last 7 days (hourly, then every 5 minutes for the last 24 h).
const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
insert('environmental_readings', data.readings.filter((r) => r.timestamp >= weekAgo).map((r) => ({
  farm_id: FARM_ID, room_id: r.roomId, sensor_id: sensorIds.get(r.roomId)!, recorded_at: r.timestamp, temperature: r.temperature, humidity: r.humidity, co2: r.co2,
})))

mkdirSync(OUT, { recursive: true })
for (const sql of files) writeFileSync(join(OUT, `${String(++part).padStart(3, '0')}.sql`), sql)
console.log(`Wrote ${files.length} files to ${OUT}. Farm id: ${FARM_ID}`)
