/**
 * Supabase write operations. Single-row writes go straight to the tables
 * (RLS decides who may write); multi-step operations call SQL functions so
 * they are atomic (see migrations/…_business_operations.sql).
 */
import { generateFarm } from '@/data/demo/generate'
import { demoRows } from '@/data/demo/toRows'
import { changeFeed } from '../changeFeed'
import type { CommandService } from '../contracts'
import { ServiceError } from '../errors'
import { assertBatchTransition, assertOrderTransition, batchDates, nextBatchCode } from '../shared/rules'
import { fail, supabase } from './client'
import { getRecords, invalidateRecords } from './records'

async function done(farmId: string) {
  invalidateRecords(farmId)
  changeFeed.publish('dashboard')
  changeFeed.publish('alerts')
}

async function write(farmId: string, q: PromiseLike<{ error: { message: string; code?: string } | null }>) {
  const { error } = await q
  fail(error)
  await done(farmId)
}

const upsertRow = (table: string, id: string | undefined, row: Record<string, unknown>) =>
  id ? supabase().from(table).update(row).eq('id', id) : supabase().from(table).insert(row)

async function logBatchEvent(
  farmId: string,
  batchId: string,
  type: 'CREATED' | 'STATUS_CHANGED' | 'LOCATION_CHANGED' | 'HARVESTED' | 'NOTE_ADDED',
  message: string,
  meta: Record<string, unknown> = {},
) {
  const { error } = await supabase().from('batch_events').insert({
    farm_id: farmId,
    batch_id: batchId,
    type,
    message,
    meta,
    created_by: (await supabase().auth.getUser()).data.user?.id ?? null,
  })
  fail(error)
}

export const supabaseCommandService: CommandService = {
  async createBatch(farmId, i) {
    const { batches } = await getRecords(farmId)
    const code = nextBatchCode(batches, new Date().getFullYear())
    const { data, error } = await supabase()
      .from('production_batches')
      .insert({
        farm_id: farmId,
        code,
        species_id: i.speciesId,
        room_id: i.roomId,
        substrate: i.substrate,
        substrate_weight: i.substrateWeight,
        spawn_weight: i.spawnWeight,
        bags: i.bags,
        spawn_date: i.spawnDate,
        expected_harvest_date: i.expectedHarvestDate,
        cost: i.cost,
        notes: i.notes ?? null,
        location_code: i.locationCode?.trim().toUpperCase() || null,
        status: 'PLANNED',
        created_by: (await supabase().auth.getUser()).data.user?.id ?? null,
      })
      .select('id')
      .single()
    fail(error)
    if (!data) throw new ServiceError('not_found')
    await logBatchEvent(farmId, data.id, 'CREATED', `Lote ${code} creado`, {
      locationCode: i.locationCode?.trim().toUpperCase() || null,
      bags: i.bags,
    })
    await done(farmId)
  },
  async setBatchStatus(farmId, batchId, status) {
    const batch = (await getRecords(farmId)).batches.find((b) => b.id === batchId)
    if (!batch) throw new ServiceError('not_found')
    assertBatchTransition(batch, status)
    const dates = batchDates(status, new Date().toISOString())
    await write(
      farmId,
      supabase()
        .from('production_batches')
        .update({ status, inoculation_date: dates.inoculationDate, colonization_date: dates.colonizationDate, fruiting_date: dates.fruitingDate })
        .eq('id', batchId),
    )
    await logBatchEvent(farmId, batchId, 'STATUS_CHANGED', `Estado → ${status}`, { from: batch.status, to: status })
    await done(farmId)
  },
  async setBatchLocation(farmId, batchId, locationCode) {
    const batch = (await getRecords(farmId)).batches.find((b) => b.id === batchId)
    if (!batch) throw new ServiceError('not_found')
    const code = locationCode?.trim().toUpperCase() || null
    await write(farmId, supabase().from('production_batches').update({ location_code: code }).eq('id', batchId))
    await logBatchEvent(farmId, batchId, 'LOCATION_CHANGED', code ? `Ubicación → ${code}` : 'Ubicación liberada', {
      from: batch.locationCode,
      to: code,
    })
    await done(farmId)
  },
  async listBatchEvents(farmId, batchId) {
    const { toBatchEvent } = await import('./rows')
    const { data, error } = await supabase()
      .from('batch_events')
      .select('*')
      .eq('farm_id', farmId)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false })
    fail(error)
    return (data ?? []).map(toBatchEvent)
  },
  async recordHarvest(farmId, i) {
    await write(
      farmId,
      supabase().rpc('record_harvest', { p_batch: i.batchId, p_wet: i.wetWeight, p_waste: i.wasteWeight, p_grade: i.grade, p_employee: i.employeeId, p_harvested_at: i.date ?? new Date().toISOString() }),
    )
    await logBatchEvent(farmId, i.batchId, 'HARVESTED', `Cosecha: ${i.wetWeight} lb (grado ${i.grade})`, {
      wetWeight: i.wetWeight,
      wasteWeight: i.wasteWeight,
      grade: i.grade,
    })
    await done(farmId)
  },
  async recordMovement(farmId, i) {
    if (!i.quantity) throw new ServiceError('invalid')
    const product = (await getRecords(farmId)).products.find((p) => p.id === i.productId)
    if (!product) throw new ServiceError('not_found')
    await write(
      farmId,
      supabase()
        .from('inventory_movements')
        .insert({
          farm_id: farmId,
          product_id: i.productId,
          type: i.type,
          quantity: i.quantity,
          reference: i.reference,
          expires_at: i.expiresAt ?? null,
          from_location_id: i.fromLocationId ?? (i.quantity < 0 ? product.locationId || null : null),
          to_location_id: i.toLocationId ?? (i.quantity > 0 ? product.locationId || null : null),
        }),
    )
    if (i.type === 'TRANSFERRED' && i.toLocationId) await write(farmId, supabase().from('inventory_products').update({ location_id: i.toLocationId }).eq('id', i.productId))
  },
  async packProduct(farmId, i) {
    await write(farmId, supabase().rpc('pack_product', { p_source: i.sourceId, p_target: i.targetId, p_units: i.units }))
  },
  async saveProduct(farmId, p) {
    await write(
      farmId,
      upsertRow('inventory_products', p.id, {
        farm_id: farmId,
        sku: p.sku,
        name: p.name,
        species_id: p.speciesId,
        category: p.category,
        unit: p.unit,
        unit_weight: p.unitWeight,
        cost: p.cost,
        price: p.price,
        reorder_point: p.reorderPoint,
        location_id: p.locationId || null,
        perishable: p.perishable,
      }),
    )
  },
  async saveCustomer(farmId, c) {
    await write(farmId, upsertRow('customers', c.id, { farm_id: farmId, name: c.name, company: c.company ?? null, type: c.type, email: c.email, phone: c.phone, payment_terms: c.paymentTerms }))
  },
  async saveSupplier(farmId, s) {
    await write(farmId, upsertRow('suppliers', s.id, { farm_id: farmId, name: s.name, email: s.email, phone: s.phone }))
  },
  async saveEmployee(farmId, e) {
    await write(farmId, upsertRow('employees', e.id, { farm_id: farmId, name: e.name, role: e.role, phone: e.phone, email: e.email, active: e.active }))
  },
  async saveEquipment(farmId, e) {
    await write(
      farmId,
      upsertRow('equipment', e.id, { farm_id: farmId, name: e.name, kind: e.kind, room_id: e.roomId || null, serial: e.serial, status: e.status, next_maintenance: e.nextMaintenance }),
    )
  },
  async completeMaintenance(farmId, equipmentId, nextMaintenance) {
    await write(farmId, supabase().from('equipment').update({ status: 'operational', next_maintenance: nextMaintenance }).eq('id', equipmentId))
  },
  async createOrder(farmId, i) {
    const { data, error } = await supabase().rpc('create_order', {
      p_farm: farmId,
      p_customer: i.customerId,
      p_channel: i.channel,
      p_payment: i.paymentMethod,
      p_fulfillment: i.fulfillment,
      p_discount: i.discount,
      p_tax: i.taxRate,
      p_due: i.dueAt,
      p_items: i.items.map((x) => ({ product_id: x.productId, quantity: x.quantity, unit_price: x.unitPrice })),
      p_status: i.status ?? 'CONFIRMED',
    })
    fail(error)
    await done(farmId)
    return String(data)
  },
  async setOrderStatus(farmId, orderId, status) {
    const order = (await getRecords(farmId)).orders.find((o) => o.id === orderId)
    if (order) assertOrderTransition(order, status)
    await write(farmId, supabase().rpc('set_order_status', { p_order: orderId, p_status: status }))
  },
  async addExpense(farmId, e) {
    if (!(e.amount > 0)) throw new ServiceError('invalid')
    await write(
      farmId,
      supabase()
        .from('expenses')
        .insert({ farm_id: farmId, spent_at: e.date, category: e.category, description: e.description, amount: e.amount, vendor: e.vendor, supplier_id: e.supplierId ?? null, payment_method: e.paymentMethod }),
    )
  },
  async correctExpense(farmId, expenseId, reason) {
    const { expenses } = await getRecords(farmId)
    const e = expenses.find((x) => x.id === expenseId)
    if (!e) throw new ServiceError('not_found')
    if (e.correctsId || expenses.some((x) => x.correctsId === e.id)) throw new ServiceError('closed')
    await write(
      farmId,
      supabase()
        .from('expenses')
        .insert({
          farm_id: farmId,
          spent_at: new Date().toISOString(),
          category: e.category,
          description: `Correction: ${e.description} — ${reason}`,
          amount: -e.amount,
          vendor: e.vendor,
          supplier_id: e.supplierId ?? null,
          payment_method: e.paymentMethod,
          corrects_id: e.id,
        }),
    )
  },
  async saveSpecies(farmId, s) {
    await write(
      farmId,
      upsertRow('mushroom_species', s.id, {
        farm_id: farmId,
        name: s.name,
        scientific_name: s.scientificName,
        incubation_temp_min: s.incubationTemp.min,
        incubation_temp_max: s.incubationTemp.max,
        fruiting_temp_min: s.fruitingTemp.min,
        fruiting_temp_max: s.fruitingTemp.max,
        humidity_min: s.humidity.min,
        humidity_max: s.humidity.max,
        co2_min: s.co2.min,
        co2_max: s.co2.max,
        average_yield: s.averageYield,
        average_grow_days: s.averageGrowDays,
        shelf_life_days: s.shelfLifeDays,
        color_index: s.colorIndex,
      }),
    )
  },
  async saveRoom(farmId, r) {
    await write(
      farmId,
      upsertRow('grow_rooms', r.id, {
        farm_id: farmId,
        name: r.name,
        type: r.type,
        target_temp_min: r.targets.temperature.min,
        target_temp_max: r.targets.temperature.max,
        target_humidity_min: r.targets.humidity.min,
        target_humidity_max: r.targets.humidity.max,
        target_co2_min: r.targets.co2.min,
        target_co2_max: r.targets.co2.max,
      }),
    )
  },
  async saveFarm(farmId, f) {
    await write(farmId, supabase().from('farms').update({ name: f.name, location: f.location, timezone: f.timezone }).eq('id', farmId))
    changeFeed.publish('session')
  },
  async saveTask(farmId, t) {
    await write(
      farmId,
      upsertRow('farm_tasks', t.id, { farm_id: farmId, title: t.title, status: t.status, priority: t.priority, assignee_id: t.assigneeId || null, due_at: t.dueAt, related_batch_id: t.relatedBatchId ?? null }),
    )
  },
  async setMemberRole(farmId, userId, role) {
    await write(farmId, supabase().from('farm_members').update({ role }).eq('farm_id', farmId).eq('user_id', userId))
  },
  async registerSensor(farmId, i) {
    const { data, error } = await supabase().from('sensors').insert({ farm_id: farmId, room_id: i.roomId, provider: i.provider, external_id: i.externalId }).select('id').single()
    fail(error)
    const { error: tokenError } = await supabase().rpc('set_sensor_token', { p_sensor: (data as { id: string }).id, p_token: i.token })
    fail(tokenError)
    await done(farmId)
  },
  async loadDemoData(farmId) {
    // A fresh random seed keeps ids unique across farms.
    const seed = Math.floor(Math.random() * 1_000_000)
    const data = generateFarm({ farm: { id: farmId, name: '', location: '', timezone: 'UTC' }, seed, scale: 1 })
    for (const [table, rows] of demoRows(data, { salt: crypto.randomUUID() })) {
      const { error } = await supabase().rpc('load_demo_rows', { p_farm: farmId, p_table: table, p_rows: rows })
      fail(error)
    }
    const { error } = await supabase().rpc('finish_demo_load', { p_farm: farmId })
    fail(error)
    await done(farmId)
  },
}
