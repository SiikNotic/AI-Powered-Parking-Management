/**
 * Maps a generated demo farm to database rows (snake_case), table by table in
 * insert order. Used by the in-app "load sample data" action and the seed script.
 */
import type { FarmDataset } from './generate'

export type Row = Record<string, string | number | boolean | null>

const sensorId = (roomIndex: number, salt: string) => `${salt.slice(0, 8)}-5e2f-4000-8000-${String(roomIndex + 1).padStart(12, '0')}`

export function demoRows(data: FarmDataset, options: { readingsSinceDays?: number; salt: string }): [table: string, rows: Row[]][] {
  const sensorIds = new Map(data.rooms.map((r, i) => [r.id, sensorId(i, options.salt)]))
  const since = new Date(Date.now() - (options.readingsSinceDays ?? 7) * 86_400_000).toISOString()
  return [
    ['employees', data.employees.map((e) => ({ id: e.id, name: e.name, role: e.role, phone: e.phone, email: e.email, active: e.active }))],
    ['mushroom_species', data.species.map((s) => ({
      id: s.id, name: s.name, scientific_name: s.scientificName,
      incubation_temp_min: s.incubationTemp.min, incubation_temp_max: s.incubationTemp.max, fruiting_temp_min: s.fruitingTemp.min, fruiting_temp_max: s.fruitingTemp.max,
      humidity_min: s.humidity.min, humidity_max: s.humidity.max, co2_min: s.co2.min, co2_max: s.co2.max,
      average_yield: s.averageYield, average_grow_days: s.averageGrowDays, shelf_life_days: s.shelfLifeDays, color_index: s.colorIndex,
      image_key: s.imageKey ?? null,
    }))],
    ['grow_rooms', data.rooms.map((r) => ({
      id: r.id, name: r.name, type: r.type,
      target_temp_min: r.targets.temperature.min, target_temp_max: r.targets.temperature.max,
      target_humidity_min: r.targets.humidity.min, target_humidity_max: r.targets.humidity.max,
      target_co2_min: r.targets.co2.min, target_co2_max: r.targets.co2.max,
    }))],
    // External ids are global, so they carry the farm's salt.
    ['sensors', data.rooms.map((r) => ({ id: sensorIds.get(r.id)!, room_id: r.id, provider: 'demo', external_id: `${options.salt.slice(0, 8)}-${r.sensorId}`, last_seen_at: null }))],
    ['inventory_locations', data.locations.map((l) => ({ id: l.id, name: l.name, kind: l.kind }))],
    ['inventory_products', data.products.map((p) => ({
      id: p.id, sku: p.sku, name: p.name, species_id: p.speciesId, category: p.category, unit: p.unit, unit_weight: p.unitWeight,
      cost: p.cost, price: p.price, reorder_point: p.reorderPoint, location_id: p.locationId, perishable: p.perishable,
    }))],
    ['suppliers', data.suppliers.map((s) => ({ id: s.id, name: s.name, email: s.email, phone: s.phone }))],
    ['customers', data.customers.map((c) => ({ id: c.id, name: c.name, company: c.company ?? null, type: c.type, email: c.email, phone: c.phone, payment_terms: c.paymentTerms }))],
    ['production_batches', data.batches.map((b) => ({
      id: b.id, code: b.code, species_id: b.speciesId, room_id: b.roomId, substrate: b.substrate, substrate_weight: b.substrateWeight,
      spawn_weight: b.spawnWeight, bags: b.bags, spawn_date: b.spawnDate, inoculation_date: b.inoculationDate, colonization_date: b.colonizationDate,
      fruiting_date: b.fruitingDate, expected_harvest_date: b.expectedHarvestDate, status: b.status, cost: b.cost, notes: b.notes ?? null, created_at: b.spawnDate,
      location_code: b.locationCode ?? null,
    }))],
    ['batch_events', data.batchEvents.map((e) => ({
      id: e.id, batch_id: e.batchId, type: e.type, message: e.message, meta: JSON.stringify(e.meta), created_at: e.createdAt,
    }))],
    ['harvests', data.harvests.map((h) => ({
      id: h.id, batch_id: h.batchId, room_id: h.roomId, harvested_at: h.date, wet_weight: h.wetWeight, waste_weight: h.wasteWeight, grade: h.grade, employee_id: h.employeeId, created_at: h.date,
    }))],
    ['inventory_movements', data.movements.map((m) => ({
      id: m.id, product_id: m.productId, type: m.type, quantity: m.quantity, batch_id: m.batchId, expires_at: m.expiresAt,
      from_location_id: m.fromLocationId, to_location_id: m.toLocationId, reference: m.reference ?? null, created_at: m.date,
    }))],
    ['orders', data.orders.map((o) => ({
      id: o.id, code: o.code, customer_id: o.customerId, channel: o.channel, status: o.status, discount: o.discount, tax_rate: o.taxRate,
      payment_method: o.paymentMethod, paid: o.paid, fulfillment: o.fulfillment, due_at: o.dueAt, created_at: o.createdAt,
    }))],
    ['order_items', data.orders.flatMap((o) => o.items.map((i) => ({ order_id: o.id, product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice, unit_cost: i.unitCost })))],
    ['expenses', data.expenses.map((e) => ({ id: e.id, spent_at: e.date, category: e.category, description: e.description, amount: e.amount, vendor: e.vendor, supplier_id: e.supplierId ?? null, payment_method: e.paymentMethod, created_at: e.date }))],
    ['equipment', data.equipment.map((e) => ({ id: e.id, room_id: e.roomId, name: e.name, kind: e.kind, serial: e.serial, status: e.status, next_maintenance: e.nextMaintenance }))],
    ['farm_tasks', data.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, assignee_id: t.assigneeId, due_at: t.dueAt, related_batch_id: t.relatedBatchId ?? null }))],
    ['environmental_readings', data.readings.filter((r) => r.timestamp >= since).map((r) => ({
      room_id: r.roomId, sensor_id: sensorIds.get(r.roomId)!, recorded_at: r.timestamp, temperature: r.temperature, humidity: r.humidity, co2: r.co2,
    }))],
  ]
}
