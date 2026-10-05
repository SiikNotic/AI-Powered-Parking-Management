/** ⚠️ DEMO farm data + write operations, applied to the in-memory sample farm. */
import { demoUser, getFarmDataset } from '@/data/demo'
import { stockByProduct } from '@/domain/inventory'
import type { AuditEntry, InventoryMovement, Order } from '@/types'
import { changeFeed } from '../changeFeed'
import type { CommandService, FarmDataService } from '../contracts'
import { ServiceError } from '../errors'
import type { FarmData } from '../shared/records'
import { assertBatchTransition, assertOrderTransition, assertStock, batchDates, DRY_YIELD, harvestProduct, nextBatchCode, nextOrderCode, SHIPPED_STATUSES } from '../shared/rules'
import { delay } from './delay'

const id = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export const demoFarmDataService: FarmDataService = {
  get(farmId) {
    const d = getFarmDataset(farmId)
    const data: FarmData = {
      ...d,
      // Copies so React sees new arrays after each write.
      batches: [...d.batches],
      harvests: [...d.harvests],
      products: [...d.products],
      movements: [...d.movements],
      orders: [...d.orders],
      expenses: [...d.expenses],
      customers: [...d.customers],
      suppliers: [...d.suppliers],
      employees: [...d.employees],
      equipment: [...d.equipment],
      tasks: [...d.tasks],
      species: [...d.species],
      rooms: [...d.rooms],
      audit: [...d.audit],
      members: [{ userId: demoUser.id, name: demoUser.name, email: demoUser.email, role: demoUser.role }],
      sensors: d.rooms.map((r) => ({ id: `sensor-${r.id}`, farmId, roomId: r.id, provider: 'demo', externalId: r.sensorId, lastSeenAt: now() })),
    }
    return delay(data, 150)
  },
}

/** Every write lands in the audit log and refreshes the dashboard and pages. */
function done(farmId: string, entry?: Omit<AuditEntry, 'id' | 'userId' | 'date'>) {
  if (entry) getFarmDataset(farmId).audit.unshift({ ...entry, id: id(), userId: demoUser.id, date: now() })
  changeFeed.publish('dashboard')
  changeFeed.publish('alerts')
  return delay(undefined, 180)
}

function addMovement(farmId: string, m: Omit<InventoryMovement, 'id' | 'date' | 'userId'> & { date?: string }) {
  const d = getFarmDataset(farmId)
  assertStock(stockByProduct(d.movements), m.productId, m.quantity, m.type, m.reference)
  d.movements.push({ ...m, id: id(), date: m.date ?? now(), userId: demoUser.id })
}

function find<T extends { id: string }>(list: T[], key: string): T {
  const item = list.find((x) => x.id === key)
  if (!item) throw new ServiceError('not_found')
  return item
}

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id)
  if (i >= 0) list[i] = item
  else list.push(item)
}

function shipOrder(farmId: string, order: Order) {
  const d = getFarmDataset(farmId)
  // Check every line first so a partial shipment never happens.
  const stock = stockByProduct(d.movements)
  for (const item of order.items) assertStock(stock, item.productId, -item.quantity, 'SOLD')
  for (const item of order.items) {
    const p = find(d.products, item.productId)
    addMovement(farmId, { productId: p.id, type: 'SOLD', quantity: -item.quantity, batchId: null, expiresAt: null, fromLocationId: p.locationId, toLocationId: null, reference: order.code })
  }
}

export const demoCommandService: CommandService = {
  async createBatch(farmId, input) {
    const d = getFarmDataset(farmId)
    const code = nextBatchCode(d.batches, new Date().getFullYear())
    d.batches.push({
      id: id(),
      code,
      farmId,
      ...input,
      inoculationDate: null,
      colonizationDate: null,
      fruitingDate: null,
      status: 'PLANNED',
      createdBy: demoUser.id,
      notes: input.notes,
    })
    return done(farmId, { action: 'created', entity: 'batch', entityLabel: `#${code}` })
  },
  async setBatchStatus(farmId, batchId, status) {
    const b = find(getFarmDataset(farmId).batches, batchId)
    assertBatchTransition(b, status)
    const old = b.status
    Object.assign(b, { status, ...batchDates(status, now()) })
    return done(farmId, { action: 'updated', entity: 'batch', entityLabel: `#${b.code}`, oldValue: old, newValue: status })
  },
  async recordHarvest(farmId, input) {
    const d = getFarmDataset(farmId)
    const b = find(d.batches, input.batchId)
    if (!['FRUITING', 'READY_TO_HARVEST', 'HARVESTED'].includes(b.status)) throw new ServiceError('invalid', 'Only fruiting batches can be harvested')
    if (input.wetWeight <= 0 || input.wasteWeight < 0 || input.wasteWeight > input.wetWeight) throw new ServiceError('invalid')
    const product = harvestProduct(d.products, b.speciesId)
    const species = d.species.find((s) => s.id === b.speciesId)
    const date = input.date ?? now()
    const net = input.wetWeight - input.wasteWeight
    d.harvests.push({ id: id(), batchId: b.id, date, wetWeight: input.wetWeight, wasteWeight: input.wasteWeight, grade: input.grade, employeeId: input.employeeId ?? '', roomId: b.roomId })
    addMovement(farmId, {
      productId: product.id,
      type: 'HARVESTED',
      quantity: Math.round((product.category === 'dried' ? net * DRY_YIELD : net) * 100) / 100,
      batchId: b.id,
      expiresAt: product.perishable ? new Date(new Date(date).getTime() + (species?.shelfLifeDays ?? 7) * 86_400_000).toISOString() : null,
      fromLocationId: null,
      toLocationId: product.locationId,
      reference: `Harvest ${b.code}`,
      date,
    })
    if (b.status === 'FRUITING' || b.status === 'READY_TO_HARVEST') b.status = 'HARVESTED'
    return done(farmId, { action: 'recorded', entity: 'harvest', entityLabel: `#${b.code}`, newValue: `${input.wetWeight} lb` })
  },
  async recordMovement(farmId, input) {
    const p = find(getFarmDataset(farmId).products, input.productId)
    if (!input.quantity) throw new ServiceError('invalid')
    if (input.type === 'ADJUSTMENT' && !input.reference.trim()) throw new ServiceError('invalid', 'An adjustment needs a reason')
    addMovement(farmId, {
      productId: p.id,
      type: input.type,
      quantity: input.quantity,
      batchId: null,
      expiresAt: input.expiresAt ?? null,
      fromLocationId: input.fromLocationId ?? (input.quantity < 0 ? p.locationId : null),
      toLocationId: input.toLocationId ?? (input.quantity > 0 ? p.locationId : null),
      reference: input.reference,
    })
    if (input.type === 'TRANSFERRED' && input.toLocationId) p.locationId = input.toLocationId
    return done(farmId, { action: input.type === 'WASTED' ? 'recorded' : 'adjusted', entity: input.type === 'WASTED' ? 'waste' : 'inventory', entityLabel: p.name, newValue: String(input.quantity) })
  },
  async packProduct(farmId, input) {
    const d = getFarmDataset(farmId)
    const source = find(d.products, input.sourceId)
    const target = find(d.products, input.targetId)
    if (input.units <= 0 || !target.unitWeight || source.unit !== 'lb') throw new ServiceError('invalid')
    const lb = Math.round(input.units * target.unitWeight * 100) / 100
    const species = d.species.find((s) => s.id === target.speciesId)
    assertStock(stockByProduct(d.movements), source.id, -lb, 'PACKED')
    addMovement(farmId, { productId: source.id, type: 'PACKED', quantity: -lb, batchId: null, expiresAt: null, fromLocationId: source.locationId, toLocationId: null, reference: `Packed into ${target.sku}` })
    addMovement(farmId, {
      productId: target.id,
      type: 'PACKED',
      quantity: input.units,
      batchId: null,
      expiresAt: target.perishable ? new Date(Date.now() + (species?.shelfLifeDays ?? 7) * 86_400_000).toISOString() : null,
      fromLocationId: null,
      toLocationId: target.locationId,
      reference: `From ${source.sku}`,
    })
    return done(farmId, { action: 'adjusted', entity: 'inventory', entityLabel: target.name, newValue: `+${input.units}` })
  },
  async saveProduct(farmId, input) {
    const d = getFarmDataset(farmId)
    if (d.products.some((p) => p.sku.toLowerCase() === input.sku.toLowerCase() && p.id !== input.id)) throw new ServiceError('duplicate')
    const old = input.id ? d.products.find((p) => p.id === input.id) : undefined
    upsert(d.products, { ...input, id: input.id ?? id(), farmId })
    return done(farmId, { action: old ? 'updated' : 'created', entity: 'product', entityLabel: input.name, oldValue: old ? `$${old.price}` : undefined, newValue: `$${input.price}` })
  },
  async saveCustomer(farmId, input) {
    upsert(getFarmDataset(farmId).customers, { ...input, id: input.id ?? id(), farmId })
    return done(farmId)
  },
  async saveSupplier(farmId, input) {
    upsert(getFarmDataset(farmId).suppliers, { ...input, id: input.id ?? id(), farmId })
    return done(farmId)
  },
  async saveEmployee(farmId, input) {
    upsert(getFarmDataset(farmId).employees, { ...input, id: input.id ?? id(), farmId })
    return done(farmId)
  },
  async saveEquipment(farmId, input) {
    upsert(getFarmDataset(farmId).equipment, { ...input, id: input.id ?? id(), farmId })
    return done(farmId)
  },
  async completeMaintenance(farmId, equipmentId, nextMaintenance) {
    const e = find(getFarmDataset(farmId).equipment, equipmentId)
    Object.assign(e, { nextMaintenance, status: 'operational' })
    return done(farmId)
  },
  async createOrder(farmId, input) {
    const d = getFarmDataset(farmId)
    if (!input.items.length || input.items.some((i) => i.quantity <= 0)) throw new ServiceError('invalid')
    const order: Order = {
      id: id(),
      code: nextOrderCode(d.orders),
      farmId,
      customerId: input.customerId ?? '',
      channel: input.channel,
      status: 'CONFIRMED',
      items: input.items.map((i) => ({ ...i, unitCost: find(d.products, i.productId).cost })),
      discount: input.discount,
      taxRate: input.taxRate,
      paymentMethod: input.paymentMethod,
      paid: false,
      createdAt: now(),
      dueAt: input.dueAt,
      fulfillment: input.fulfillment,
      processedBy: demoUser.id,
    }
    if (input.status === 'COMPLETED') {
      shipOrder(farmId, order)
      order.status = 'COMPLETED'
      order.paid = order.paymentMethod !== 'invoice'
    }
    d.orders.push(order)
    await done(farmId, { action: 'processed', entity: 'order', entityLabel: order.code, newValue: order.status })
    return order.code
  },
  async setOrderStatus(farmId, orderId, status) {
    const d = getFarmDataset(farmId)
    const o = find(d.orders, orderId)
    assertOrderTransition(o, status)
    const shipped = d.movements.some((m) => m.type === 'SOLD' && m.reference === o.code)
    if (SHIPPED_STATUSES.includes(status) && !shipped) shipOrder(farmId, o)
    if (status === 'CANCELLED' && shipped) {
      for (const item of o.items) {
        const p = find(d.products, item.productId)
        addMovement(farmId, { productId: p.id, type: 'ADJUSTMENT', quantity: item.quantity, batchId: null, expiresAt: null, fromLocationId: null, toLocationId: p.locationId, reference: `${o.code} cancelled — returned to stock` })
      }
    }
    o.status = status
    if (status === 'COMPLETED' && o.paymentMethod !== 'invoice') o.paid = true
    return done(farmId, { action: 'processed', entity: 'order', entityLabel: o.code, newValue: status })
  },
  async addExpense(farmId, input) {
    if (!(input.amount > 0)) throw new ServiceError('invalid')
    getFarmDataset(farmId).expenses.push({ ...input, id: id(), farmId, correctsId: null })
    return done(farmId, { action: 'recorded', entity: 'expense', entityLabel: input.description, newValue: String(input.amount) })
  },
  async correctExpense(farmId, expenseId, reason) {
    const d = getFarmDataset(farmId)
    const e = find(d.expenses, expenseId)
    if (e.correctsId || d.expenses.some((x) => x.correctsId === e.id)) throw new ServiceError('closed')
    d.expenses.push({ ...e, id: id(), date: now(), amount: -e.amount, description: `Correction: ${e.description} — ${reason}`, correctsId: e.id })
    return done(farmId, { action: 'recorded', entity: 'expense', entityLabel: e.description, newValue: String(-e.amount) })
  },
  async saveSpecies(farmId, input) {
    const d = getFarmDataset(farmId)
    upsert(d.species, { ...input, id: input.id ?? id() })
    return done(farmId)
  },
  async saveRoom(farmId, input) {
    const d = getFarmDataset(farmId)
    const existing = input.id ? d.rooms.find((r) => r.id === input.id) : undefined
    upsert(d.rooms, { id: input.id ?? id(), farmId, name: input.name, type: input.type, targets: input.targets, sensorId: existing?.sensorId ?? '' })
    return done(farmId)
  },
  async saveFarm(farmId, input) {
    Object.assign(getFarmDataset(farmId).farm, input)
    changeFeed.publish('session')
    return done(farmId)
  },
  async saveTask(farmId, input) {
    upsert(getFarmDataset(farmId).tasks, { ...input, id: input.id ?? id(), farmId })
    return done(farmId)
  },
  async setMemberRole() {
    throw new ServiceError('forbidden', 'The demo has a single user')
  },
  async registerSensor(farmId, input) {
    const room = find(getFarmDataset(farmId).rooms, input.roomId)
    room.sensorId = input.externalId
    return done(farmId)
  },
  async loadDemoData() {
    return delay(undefined)
  },
}
