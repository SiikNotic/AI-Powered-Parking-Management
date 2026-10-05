/**
 * ⚠️ DEMO DATA GENERATOR — builds a realistic, internally consistent farm.
 *
 * It simulates the real cycle day by day: batches are inoculated, colonize,
 * fruit and are harvested in flushes; harvests enter stock; product is packed,
 * dried and sold from available stock (never below zero); expired lots are
 * written off; supplies are re-ordered. Every stock change is a movement, so
 * all dashboard figures are derived — nothing is hard-coded.
 */
import type {
  AuditEntry,
  BatchStatus,
  Customer,
  Employee,
  EnvironmentalReading,
  Equipment,
  Expense,
  ExpenseCategory,
  Farm,
  FarmTask,
  GrowRoom,
  Harvest,
  InventoryLocation,
  InventoryMovement,
  InventoryProduct,
  MovementType,
  MushroomSpecies,
  Order,
  OrderItem,
  OrderStatus,
  ProductionBatch,
} from '@/types'
import { CUSTOMERS, EQUIPMENT, EXPENSES, PRODUCTS, ROOMS, SPECIES, STAFF } from './catalog'
import { createRandom, round } from './random'
import type { RoomKey, SpeciesKey } from './seedTypes'

export interface FarmDataset {
  farm: Farm
  species: MushroomSpecies[]
  rooms: GrowRoom[]
  locations: InventoryLocation[]
  employees: Employee[]
  batches: ProductionBatch[]
  harvests: Harvest[]
  products: InventoryProduct[]
  movements: InventoryMovement[]
  customers: Customer[]
  orders: Order[]
  expenses: Expense[]
  tasks: FarmTask[]
  equipment: Equipment[]
  readings: EnvironmentalReading[]
  audit: AuditEntry[]
  generatedAt: string
}

interface Options {
  farm: Farm
  seed: number
  /** 1 = full-size farm; smaller values scale volumes down. */
  scale: number
}

const DAY = 86_400_000
const HISTORY_DAYS = 60
/** Batch cadence (days between new batches) per species at full scale. */
const CADENCE: Record<SpeciesKey, number> = { oyster: 4, lions_mane: 5, shiitake: 7, king_oyster: 7, reishi: 14 }
const FLUSHES: Record<SpeciesKey, number[]> = { oyster: [0.5, 0.3, 0.2], lions_mane: [0.6, 0.4], shiitake: [0.55, 0.45], king_oyster: [0.65, 0.35], reishi: [1] }

export function generateFarm({ farm, seed, scale }: Options): FarmDataset {
  const rnd = createRandom(seed)
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const at = (dayOffset: number, hour = 9, minute = 0) => new Date(today.getTime() + dayOffset * DAY + hour * 3_600_000 + minute * 60_000)
  const iso = (d: Date) => d.toISOString()
  const isPast = (d: Date) => d.getTime() <= now.getTime()

  // ---------- Reference data ----------
  const species: MushroomSpecies[] = SPECIES.map(({ key: _key, costPerLb: _cost, ...s }, i) => ({ ...s, id: rnd.uuid(), colorIndex: i }))
  const speciesByKey = Object.fromEntries(SPECIES.map((s, i) => [s.key, species[i]])) as Record<SpeciesKey, MushroomSpecies>
  const costPerLb = Object.fromEntries(SPECIES.map((s) => [s.key, s.costPerLb])) as Record<SpeciesKey, number>

  const rooms: GrowRoom[] = ROOMS.map((r) => ({ id: rnd.uuid(), farmId: farm.id, name: r.name, type: r.type, targets: r.targets, sensorId: `SNS-${r.key.toUpperCase()}` }))
  const roomByKey = Object.fromEntries(ROOMS.map((r, i) => [r.key, rooms[i]])) as Record<RoomKey, GrowRoom>

  const locations: InventoryLocation[] = [
    { id: rnd.uuid(), farmId: farm.id, name: 'Grow Rooms', kind: 'grow_room' },
    { id: rnd.uuid(), farmId: farm.id, name: 'Cold Storage', kind: 'cold_storage' },
    { id: rnd.uuid(), farmId: farm.id, name: 'Warehouse', kind: 'warehouse' },
    { id: rnd.uuid(), farmId: farm.id, name: 'Packing Room', kind: 'packing' },
    { id: rnd.uuid(), farmId: farm.id, name: 'Retail Store', kind: 'retail' },
    { id: rnd.uuid(), farmId: farm.id, name: 'Delivery Van', kind: 'vehicle' },
  ]
  const locationFor = (key: string) =>
    key === 'cold' ? locations[1].id : key === 'packing' ? locations[3].id : key === 'warehouse' ? locations[2].id : locations[0].id

  const employees: Employee[] = STAFF.map((s) => ({
    id: rnd.uuid(),
    farmId: farm.id,
    name: s.name,
    role: s.role,
    phone: `+1 717 555 0${rnd.int(100, 199)}`,
    email: `${s.name.split(' ')[0].toLowerCase()}@evergreenmyco.example`,
    active: true,
  }))
  const byRole = (role: Employee['role']) => employees.filter((e) => e.role === role)
  const pickStaff = (role: Employee['role']) => rnd.pick(byRole(role)).id

  // ---------- Products ----------
  const products: InventoryProduct[] = PRODUCTS.map((p) => {
    const sp = p.species ? costPerLb[p.species] : 0
    let cost = p.cost ?? 0
    if (p.category === 'fresh') cost = p.unit === 'unit' ? round(sp * (p.unitWeight ?? 0) + 0.26, 2) : sp
    if (p.sku === 'DR-SHI-LB') cost = round(sp * 7.5, 2)
    if (p.sku === 'DR-REI-LB') cost = round(sp * 2.4, 2)
    if (p.category === 'powder') cost = 5.4
    if (p.category === 'kit') cost = 7.2
    return {
      id: rnd.uuid(),
      farmId: farm.id,
      sku: p.sku,
      name: p.name,
      speciesId: p.species ? speciesByKey[p.species].id : null,
      category: p.category,
      unit: p.unit,
      unitWeight: p.unitWeight,
      cost,
      price: p.sku === 'DR-SHI-LB' ? 64 : p.price,
      reorderPoint: Math.max(1, Math.round(p.reorderPoint * Math.max(0.5, scale))),
      locationId: locationFor(p.location),
      perishable: p.perishable,
    }
  })
  const productBySku = Object.fromEntries(products.map((p) => [p.sku, p])) as Record<string, InventoryProduct>
  const freshFor = (key: SpeciesKey) => products.find((p) => p.speciesId === speciesByKey[key].id && p.category === 'fresh' && p.unit === 'lb')

  // ---------- Batches & harvests ----------
  const batches: ProductionBatch[] = []
  const harvests: Harvest[] = []
  let batchSeq = 1
  const year = today.getFullYear()

  for (const s of SPECIES) {
    const sp = speciesByKey[s.key]
    const cadence = Math.max(2, Math.round(CADENCE[s.key] / scale))
    const roomKeys = ROOMS.filter((r) => r.species.includes(s.key)).map((r) => r.key)
    for (let start = -(s.averageGrowDays + HISTORY_DAYS + 10); start <= 10; start += cadence + rnd.int(-1, 1)) {
      const substrateWeight = round(rnd.between(130, 240) * Math.max(0.6, scale), 0)
      const bags = Math.round(substrateWeight / 5)
      const spawnWeight = round(substrateWeight * 0.1, 1)
      const spawnDate = at(start - 1, 8)
      const inoculation = at(start, 9)
      const grow = s.averageGrowDays
      const colonization = at(start + Math.round(grow * 0.55), 9)
      const fruiting = at(start + Math.round(grow * 0.75), 9)
      const expected = at(start + grow, 9)
      const roomKey = rnd.pick(roomKeys)
      const fate = rnd.next()
      const failed = fate < 0.04 && isPast(colonization)
      const discarded = !failed && fate < 0.06 && isPast(colonization)
      const id = rnd.uuid()
      const yieldFactor = rnd.between(0.82, 1.1)
      const flushShares = FLUSHES[s.key]

      let status: BatchStatus
      const harvestRecords: Harvest[] = []
      if (!isPast(inoculation)) status = 'PLANNED'
      else if (failed) status = 'FAILED'
      else if (discarded) status = 'DISCARDED'
      else if (!isPast(colonization)) status = now.getTime() - inoculation.getTime() < 3 * DAY ? 'INOCULATED' : 'COLONIZING'
      else if (!isPast(fruiting)) status = 'COLONIZING'
      else {
        // Flushes roughly 8 days apart, starting at the expected harvest date.
        let lastFlushDate: Date | null = null
        let nextFlushDate: Date | null = null
        flushShares.forEach((share, i) => {
          const flushDate = at(start + grow + i * 8 + rnd.int(0, 1), rnd.int(6, 10), rnd.int(0, 59))
          if (isPast(flushDate)) {
            const wet = round(substrateWeight * s.averageYield * yieldFactor * share, 1)
            // A flush is picked over consecutive days as clusters mature.
            const pickDays = s.key === 'reishi' ? 1 : 3
            for (let p = 0; p < pickDays; p++) {
              const pickDate = new Date(flushDate.getTime() + p * DAY + rnd.int(-60, 60) * 60_000)
              if (!isPast(pickDate)) break
              const part = round(wet * (pickDays === 1 ? 1 : [0.45, 0.35, 0.2][p]), 1)
              harvestRecords.push({
                id: rnd.uuid(),
                batchId: id,
                date: iso(pickDate),
                wetWeight: part,
                wasteWeight: round(part * rnd.between(0.03, 0.09), 1),
                grade: rnd.chance(0.75) ? 'A' : rnd.chance(0.8) ? 'B' : 'C',
                employeeId: pickStaff('harvester'),
                roomId: roomByKey[roomKey].id,
              })
            }
            lastFlushDate = flushDate
          } else if (!nextFlushDate) nextFlushDate = flushDate
        })
        const next = nextFlushDate as Date | null
        const last = lastFlushDate as Date | null
        if (!harvestRecords.length) status = next && next.getTime() - now.getTime() < DAY ? 'READY_TO_HARVEST' : 'FRUITING'
        else if (!next) status = last && now.getTime() - last.getTime() > 3 * DAY ? 'COMPLETED' : 'HARVESTED'
        else status = next.getTime() - now.getTime() < DAY ? 'READY_TO_HARVEST' : 'HARVESTED'
      }

      batches.push({
        id,
        code: `${year}-${String(batchSeq++).padStart(5, '0')}`,
        farmId: farm.id,
        speciesId: sp.id,
        roomId: status === 'PLANNED' || status === 'INOCULATED' || status === 'COLONIZING' ? roomByKey.incubation.id : roomByKey[roomKey].id,
        substrate: s.key === 'reishi' || s.key === 'shiitake' ? 'Supplemented hardwood' : s.key === 'oyster' ? 'Straw & hardwood pellets' : 'Hardwood + soy hull (Master’s Mix)',
        substrateWeight,
        spawnWeight,
        bags,
        spawnDate: iso(spawnDate),
        inoculationDate: isPast(inoculation) ? iso(inoculation) : null,
        colonizationDate: isPast(colonization) ? iso(colonization) : null,
        fruitingDate: isPast(fruiting) && !failed && !discarded ? iso(fruiting) : null,
        expectedHarvestDate: iso(expected),
        status,
        createdBy: pickStaff('grower'),
        cost: round(substrateWeight * 0.8 + spawnWeight * 3 + bags * 0.45 + substrateWeight * 0.6, 2),
        notes: failed ? 'Trichoderma contamination found during colonization.' : discarded ? 'Discarded after slow colonization.' : undefined,
      })
      harvests.push(...harvestRecords)
    }
  }

  // Keep one Lion's Mane batch visibly overdue for harvest (it happens on real farms).
  const overdue = batches.find((b) => b.speciesId === speciesByKey.lions_mane.id && b.status === 'FRUITING')
  if (overdue) {
    overdue.expectedHarvestDate = iso(at(-3, 9))
    overdue.status = 'READY_TO_HARVEST'
  }

  // ---------- Inventory simulation ----------
  const movements: InventoryMovement[] = []
  const lots = new Map<string, { qty: number; expiresAt: Date | null }[]>()
  const onHand = (productId: string) => (lots.get(productId) ?? []).reduce((s, l) => s + l.qty, 0)
  const systemUser = employees[0].id

  const addMovement = (
    product: InventoryProduct,
    type: MovementType,
    quantity: number,
    date: Date,
    extra: Partial<InventoryMovement> = {},
  ) => {
    if (quantity === 0) return
    const q = round(quantity, 2)
    movements.push({
      id: rnd.uuid(),
      productId: product.id,
      type,
      quantity: q,
      date: iso(date),
      batchId: null,
      expiresAt: null,
      fromLocationId: null,
      toLocationId: null,
      userId: systemUser,
      ...extra,
    })
    const list = lots.get(product.id) ?? []
    if (q > 0) list.push({ qty: q, expiresAt: extra.expiresAt ? new Date(extra.expiresAt) : null })
    else {
      // Outflows consume the oldest lots first (FIFO).
      let remaining = -q
      for (const lot of list) {
        const take = Math.min(lot.qty, remaining)
        lot.qty = round(lot.qty - take, 2)
        remaining = round(remaining - take, 2)
        if (remaining <= 0) break
      }
    }
    lots.set(
      product.id,
      list.filter((l) => l.qty > 0.001),
    )
  }
  const shelf = (p: InventoryProduct) => {
    const sp = species.find((s) => s.id === p.speciesId)
    return sp ? sp.shelfLifeDays : 365
  }

  // Opening count before the history window.
  const openingDay = at(-HISTORY_DAYS - 1, 7)
  for (const p of products) {
    const opening =
      p.category === 'fresh' ? (p.unit === 'lb' ? rnd.between(20, 45) : rnd.int(20, 40)) : p.category === 'substrate' ? 1600 : p.category === 'spawn' ? 220 : p.category === 'packaging' ? (p.sku === 'SUP-LABEL' ? 2500 : p.sku === 'SUP-BOX' ? 120 : 1200) : p.category === 'supplies' ? 600 : rnd.int(10, 30)
    addMovement(p, 'ADJUSTMENT', round(opening * Math.max(0.5, scale), p.unit === 'unit' ? 0 : 1), openingDay, {
      reference: 'Opening count',
      toLocationId: p.locationId,
      expiresAt: p.perishable ? iso(new Date(openingDay.getTime() + 4 * DAY)) : null,
    })
  }

  const customers: Customer[] = CUSTOMERS.slice(0, Math.max(8, Math.round(CUSTOMERS.length * scale))).map((c) => ({
    id: rnd.uuid(),
    farmId: farm.id,
    name: c.name,
    company: c.company,
    type: c.type,
    email: `${c.name.split(' ')[0].toLowerCase()}@${(c.company ?? 'mail').toLowerCase().replace(/[^a-z]/g, '')}.example`,
    phone: `+1 717 555 0${rnd.int(200, 299)}`,
    paymentTerms: c.type === 'wholesale' || c.type === 'distributor' ? 'net_30' : c.type === 'restaurant' ? 'net_15' : 'due_on_receipt',
  }))

  const orders: Order[] = []
  const expenses: Expense[] = []
  let orderSeq = 4200
  let lateDeliveries = 0
  const restockQty: Record<string, number> = { 'SUP-SUBST': 1500, 'SUP-SPAWN': 200, 'SUP-CLAM8': 1000, 'SUP-BOX': 100, 'SUP-LABEL': 2000, 'SUP-BAGS': 500 }
  const restockCategory: Record<string, ExpenseCategory> = { 'SUP-SUBST': 'substrate', 'SUP-SPAWN': 'spawn', 'SUP-CLAM8': 'packaging', 'SUP-BOX': 'packaging', 'SUP-LABEL': 'packaging', 'SUP-BAGS': 'other' }
  const vendors: Record<string, string> = { 'SUP-SUBST': 'Penn Hardwood Supply', 'SUP-SPAWN': 'Mid-Atlantic Spawn Co.', 'SUP-CLAM8': 'ABC Packaging', 'SUP-BOX': 'ABC Packaging', 'SUP-LABEL': 'LabelWorks', 'SUP-BAGS': 'GrowTech Supply' }

  for (let d = -HISTORY_DAYS; d <= 0; d++) {
    const morning = at(d, 7)
    if (!isPast(morning)) break

    // 1) Write off expired perishable lots found at the morning check.
    for (const p of products.filter((x) => x.perishable)) {
      for (const lot of lots.get(p.id) ?? []) {
        if (lot.expiresAt && lot.expiresAt.getTime() < morning.getTime() && rnd.chance(d === 0 ? 0.3 : 0.85)) {
          addMovement(p, 'WASTED', -lot.qty, morning, { reference: 'Expired — spoilage', fromLocationId: p.locationId, userId: pickStaff('packing') })
        }
      }
    }

    // 2) Harvests enter stock (wet weight minus waste).
    for (const h of harvests.filter((x) => new Date(x.date).toDateString() === at(d).toDateString())) {
      const batch = batches.find((b) => b.id === h.batchId)!
      const key = SPECIES.find((s) => speciesByKey[s.key].id === batch.speciesId)!.key
      const net = round(h.wetWeight - h.wasteWeight, 1)
      if (key === 'reishi') {
        addMovement(productBySku['DR-REI-LB'], 'HARVESTED', round(net * 0.35, 2), new Date(h.date), { batchId: batch.id, reference: `Harvest ${batch.code} (dried)`, userId: h.employeeId, toLocationId: productBySku['DR-REI-LB'].locationId })
      } else {
        const fresh = freshFor(key)!
        addMovement(fresh, 'HARVESTED', net, new Date(h.date), {
          batchId: batch.id,
          reference: `Harvest ${batch.code}`,
          userId: h.employeeId,
          toLocationId: fresh.locationId,
          expiresAt: iso(new Date(new Date(h.date).getTime() + shelf(fresh) * DAY)),
        })
      }
    }

    // 3) Batches started today consume substrate, spawn and bags.
    for (const b of batches.filter((x) => x.inoculationDate && new Date(x.inoculationDate).toDateString() === at(d).toDateString())) {
      const when = new Date(b.inoculationDate!)
      const consume = (sku: string, qty: number) => addMovement(productBySku[sku], 'TRANSFERRED', -Math.min(qty, onHand(productBySku[sku].id)), when, { batchId: b.id, reference: `Used in batch ${b.code}`, fromLocationId: productBySku[sku].locationId, toLocationId: locations[0].id, userId: b.createdBy })
      consume('SUP-SUBST', b.substrateWeight)
      consume('SUP-SPAWN', b.spawnWeight)
      consume('SUP-BAGS', b.bags)
    }

    // 4) Packing: part of fresh bulk becomes retail packs.
    const packTime = at(d, 13)
    if (isPast(packTime)) {
      for (const packed of products.filter((p) => p.unit === 'unit' && p.category === 'fresh')) {
        const source = productBySku[PRODUCTS.find((s) => s.sku === packed.sku)!.packedFrom!]
        const want = Math.round(rnd.int(6, 16) * scale)
        const n = Math.min(want, Math.floor((onHand(source.id) * 0.4) / (packed.unitWeight ?? 1)), onHand(productBySku['SUP-CLAM8'].id))
        if (n <= 0) continue
        const staff = pickStaff('packing')
        addMovement(source, 'PACKED', -n * (packed.unitWeight ?? 1), packTime, { reference: `Packed into ${packed.sku}`, fromLocationId: source.locationId, userId: staff })
        addMovement(packed, 'PACKED', n, packTime, { reference: `From ${source.sku}`, toLocationId: packed.locationId, userId: staff, expiresAt: iso(new Date(packTime.getTime() + shelf(packed) * DAY)) })
        addMovement(productBySku['SUP-CLAM8'], 'PACKED', -n, packTime, { reference: `Packed ${packed.sku}`, userId: staff })
        addMovement(productBySku['SUP-LABEL'], 'PACKED', -Math.min(n, onHand(productBySku['SUP-LABEL'].id)), packTime, { reference: `Packed ${packed.sku}`, userId: staff })
      }
      // Drying shiitake every 5 days; powder and kits weekly.
      if ((d + HISTORY_DAYS) % 5 === 0) {
        const fresh = productBySku['FR-SHI-LB']
        const lb = Math.min(round(rnd.between(14, 24) * scale, 1), round(onHand(fresh.id) * 0.5, 1))
        if (lb > 1) {
          addMovement(fresh, 'PRODUCED', -lb, packTime, { reference: 'To dehydrator', userId: pickStaff('packing') })
          addMovement(productBySku['DR-SHI-LB'], 'PRODUCED', round(lb / 8, 2), packTime, { reference: 'Dehydrated shiitake', userId: pickStaff('packing') })
        }
      }
      if ((d + HISTORY_DAYS) % 7 === 3) {
        addMovement(productBySku['PW-LMN-2OZ'], 'PRODUCED', Math.round(26 * scale), packTime, { reference: 'Milled from dried Lion’s Mane', userId: pickStaff('packing') })
        const kits = Math.round(14 * scale)
        addMovement(productBySku['KIT-OYS'], 'PRODUCED', kits, packTime, { reference: 'Assembled grow kits', userId: pickStaff('grower') })
        addMovement(productBySku['SUP-SUBST'], 'TRANSFERRED', -Math.min(kits * 5, onHand(productBySku['SUP-SUBST'].id)), packTime, { reference: 'Used in grow kits', userId: pickStaff('grower') })
      }
    }

    // 5) Orders sold from available stock only.
    const orderCount = Math.round(rnd.int(7, 10) * scale) + (d === 0 ? 4 : 0)
    for (let o = 0; o < orderCount; o++) {
      const hour = rnd.int(7, 18)
      const created = at(d, hour, rnd.int(0, 59))
      if (!isPast(created)) continue
      const customer = rnd.pick(customers)
      const bulkBuyer = customer.type === 'wholesale' || customer.type === 'distributor' || customer.type === 'restaurant'
      const candidates = products.filter((p) => p.price > 0 && (bulkBuyer ? p.unit === 'lb' : p.unit === 'unit' || p.category === 'dried'))
      const items: OrderItem[] = []
      const lineCount = rnd.int(1, bulkBuyer ? 3 : 2)
      for (let l = 0; l < lineCount; l++) {
        const p = rnd.pick(candidates)
        if (items.some((i) => i.productId === p.id)) continue
        const wanted =
          customer.type === 'wholesale' || customer.type === 'distributor'
            ? rnd.between(8, 30)
            : customer.type === 'restaurant'
              ? rnd.between(3, 12)
              : p.unit === 'lb'
                ? rnd.between(0.5, 2)
                : rnd.int(customer.type === 'retail' ? 6 : 1, customer.type === 'retail' ? 18 : 3)
        const available = onHand(p.id)
        // Never promise more than is on hand; keep some stock back for other customers.
        const sellable = bulkBuyer ? available * 0.6 : available
        const qty = p.unit === 'unit' ? Math.min(Math.round(wanted), Math.floor(sellable)) : round(Math.min(wanted, sellable), 1)
        if (qty <= 0) continue
        const priceFactor = customer.type === 'wholesale' || customer.type === 'distributor' ? 0.8 : customer.type === 'restaurant' ? 0.9 : 1
        items.push({ productId: p.id, quantity: qty, unitPrice: round(p.price * priceFactor, 2), unitCost: p.cost })
      }
      if (!items.length) continue

      const channel: Order['channel'] =
        customer.type === 'wholesale' || customer.type === 'distributor' ? 'wholesale' : customer.type === 'restaurant' ? 'delivery' : customer.type === 'retail' ? rnd.pick(['delivery', 'pickup'] as const) : rnd.pick(['in_person', 'online'] as const)
      const fulfillment: Order['fulfillment'] = channel === 'pickup' || channel === 'in_person' ? 'pickup' : 'delivery'
      // Two of yesterday's deliveries are still waiting to ship (late orders happen).
      const late = d === -1 && fulfillment === 'delivery' && lateDeliveries < 2
      if (late) lateDeliveries++

      const ageHours = (now.getTime() - created.getTime()) / 3_600_000
      let status: OrderStatus
      if (late) status = 'PREPARING'
      else if (d < 0) status = rnd.chance(0.06) ? 'CANCELLED' : 'COMPLETED'
      else if (ageHours > 6) status = rnd.pick(['COMPLETED', 'COMPLETED', 'OUT_FOR_DELIVERY'] as const)
      else if (ageHours > 3) status = rnd.pick(['READY', 'OUT_FOR_DELIVERY', 'COMPLETED'] as const)
      else if (ageHours > 1) status = rnd.pick(['PREPARING', 'CONFIRMED', 'READY'] as const)
      else status = rnd.pick(['PENDING', 'CONFIRMED'] as const)

      const order: Order = {
        id: rnd.uuid(),
        code: `ORD-${orderSeq++}`,
        farmId: farm.id,
        customerId: customer.id,
        channel,
        status,
        items,
        discount: rnd.chance(0.12) ? 0.05 : 0,
        taxRate: channel === 'in_person' || channel === 'online' ? 0.06 : 0,
        paymentMethod: customer.paymentTerms === 'due_on_receipt' ? rnd.pick(['card', 'cash'] as const) : 'invoice',
        paid: customer.paymentTerms === 'due_on_receipt' ? status !== 'CANCELLED' : d < -12,
        createdAt: iso(created),
        dueAt: late ? iso(at(-1, 16)) : iso(new Date(created.getTime() + (channel === 'in_person' ? 0 : rnd.int(4, 26)) * 3_600_000)),
        fulfillment,
        processedBy: pickStaff('sales'),
      }
      orders.push(order)
      // Stock leaves when the order ships or is handed over.
      if (status === 'COMPLETED' || status === 'OUT_FOR_DELIVERY') {
        for (const item of items) {
          const p = products.find((x) => x.id === item.productId)!
          addMovement(p, 'SOLD', -item.quantity, created, { reference: order.code, fromLocationId: p.locationId, userId: order.processedBy })
        }
      }
    }

    // 6) Occasional damage and cycle-count adjustments.
    if (rnd.chance(0.35)) {
      const p = rnd.pick(products.filter((x) => x.perishable && x.unit === 'lb'))
      const qty = Math.min(round(rnd.between(0.5, 2.5), 1), onHand(p.id))
      if (qty > 0) addMovement(p, 'DAMAGED', -qty, at(d, 15), { reference: 'Bruised in handling', userId: pickStaff('packing'), fromLocationId: p.locationId })
    }
    if (rnd.chance(0.2)) {
      const p = rnd.pick(products)
      const delta = p.unit === 'unit' ? rnd.pick([-1, 1, -2]) : round(rnd.between(-0.8, 0.6), 1)
      if (onHand(p.id) + delta >= 0) addMovement(p, 'ADJUSTMENT', delta, at(d, 17), { reference: 'Cycle count', userId: employees[0].id })
    }

    // 7) Re-order supplies that ran low (deliveries stop 4 days before today).
    if (d <= -4) {
      for (const [sku, qty] of Object.entries(restockQty)) {
        const p = productBySku[sku]
        if (onHand(p.id) < p.reorderPoint * 1.5) {
          const q = Math.round(qty * Math.max(0.5, scale))
          addMovement(p, 'RECEIVED', q, at(d + 1, 10), { reference: `PO from ${vendors[sku]}`, toLocationId: p.locationId, userId: employees[0].id })
          expenses.push({ id: rnd.uuid(), farmId: farm.id, date: iso(at(d + 1, 10)), category: restockCategory[sku], description: `${p.name} × ${q}`, amount: round(q * p.cost, 2), vendor: vendors[sku], paymentMethod: 'invoice' })
        }
      }
    }
  }

  // ---------- Recurring expenses (90 days, financial history is append-only) ----------
  for (const e of EXPENSES) {
    for (let d = -90 + e.offset; d <= 0; d += e.everyDays) {
      const date = at(d, 11)
      if (!isPast(date)) continue
      const scaleAmount = e.category === 'rent' || e.category === 'insurance' ? Math.max(0.6, scale) : Math.max(0.5, scale)
      expenses.push({
        id: rnd.uuid(),
        farmId: farm.id,
        date: iso(date),
        category: e.category,
        description: e.description,
        amount: round(e.amount * scaleAmount * (1 + (e.jitter ? rnd.between(-e.jitter, e.jitter) : 0)), 2),
        vendor: e.vendor,
        paymentMethod: e.category === 'labor' ? 'transfer' : e.category === 'transportation' ? 'card' : 'invoice',
      })
    }
  }

  // ---------- Sensor readings: hourly for the history window, every 5 minutes for the last 24 h ----------
  const readings: EnvironmentalReading[] = []
  const series = (roomKey: RoomKey, t: Date) => {
    const r = ROOMS.find((x) => x.key === roomKey)!
    const hour = t.getHours() + t.getMinutes() / 60
    const diurnal = Math.sin(((hour - 9) / 24) * Math.PI * 2)
    const hoursAgo = (now.getTime() - t.getTime()) / 3_600_000
    let temperature = r.base.temperature + diurnal * (r.type === 'cold_storage' ? 0.5 : 1.6) + rnd.between(-0.4, 0.4)
    let humidity = r.base.humidity - diurnal * 1.8 + rnd.between(-1, 1)
    let co2 = r.base.co2 + diurnal * 60 + rnd.between(-35, 35)
    // Current issues the farm is dealing with right now:
    if (roomKey === 'grow2' && hoursAgo < 6) humidity -= (6 - hoursAgo) * 1.9 // humidifier B failing
    if (roomKey === 'fruiting' && hoursAgo < 4) co2 += (4 - hoursAgo) * 140 // fan due for service
    if (roomKey === 'grow3' && hoursAgo < 2) temperature += (2 - hoursAgo) * 1.6
    return { temperature: round(temperature, 1), humidity: round(Math.min(99, humidity), 1), co2: Math.round(co2) }
  }
  for (const r of ROOMS) {
    const room = roomByKey[r.key]
    const offlineAfter = r.key === 'processing' ? now.getTime() - 3 * 3_600_000 : Infinity
    for (let h = HISTORY_DAYS * 24; h > 24; h--) {
      const t = new Date(now.getTime() - h * 3_600_000)
      readings.push({ roomId: room.id, sensorId: room.sensorId, timestamp: iso(t), ...series(r.key, t) })
    }
    for (let m = 24 * 12; m >= 0; m--) {
      const t = new Date(now.getTime() - m * 5 * 60_000)
      if (t.getTime() > offlineAfter) break
      readings.push({ roomId: room.id, sensorId: room.sensorId, timestamp: iso(t), ...series(r.key, t) })
    }
  }

  // ---------- Equipment, tasks, audit ----------
  const equipment: Equipment[] = EQUIPMENT.map((e) => ({
    id: rnd.uuid(),
    farmId: farm.id,
    name: e.name,
    kind: e.kind,
    roomId: roomByKey[e.room].id,
    serial: `SN-${rnd.int(100000, 999999)}`,
    status: e.offline ? 'offline' : e.dueInDays <= 3 ? 'maintenance_due' : 'operational',
    nextMaintenance: iso(at(e.dueInDays, 9)),
  }))

  const ready = batches.filter((b) => b.status === 'READY_TO_HARVEST')
  // Task due times are relative to "now" so the list always reads like today's work.
  const inHours = (h: number) => iso(new Date(now.getTime() + h * 3_600_000))
  const openOrders = orders.filter((o) => ['CONFIRMED', 'PREPARING', 'READY'].includes(o.status))
  const taskSeed: Omit<FarmTask, 'id' | 'farmId'>[] = [
    { title: 'Check Grow Room 02 humidity', status: 'IN_PROGRESS', priority: 'URGENT', assigneeId: byRole('grower')[0].id, dueAt: inHours(-0.5) },
    ...ready.slice(0, 3).map((b) => ({ title: `Harvest batch #${b.code}`, status: 'TODO' as const, priority: 'HIGH' as const, assigneeId: pickStaff('harvester'), dueAt: inHours(1.5), relatedBatchId: b.id })),
    { title: 'Service inline fan — Fruiting Room', status: 'TODO', priority: 'HIGH', assigneeId: employees[0].id, dueAt: inHours(14) },
    { title: 'Package Lion’s Mane 8 oz', status: 'TODO', priority: 'MEDIUM', assigneeId: byRole('packing')[0].id, dueAt: inHours(3) },
    ...openOrders.slice(0, 2).map((o) => ({ title: `Deliver order ${o.code}`, status: 'TODO' as const, priority: 'MEDIUM' as const, assigneeId: byRole('delivery')[0].id, dueAt: inHours(2.5) })),
    { title: 'Clean Grow Room 01 between cycles', status: 'COMPLETED', priority: 'MEDIUM', assigneeId: byRole('grower')[1].id, dueAt: inHours(-3) },
    { title: 'Replace HEPA filter — Incubation', status: 'TODO', priority: 'LOW', assigneeId: employees[0].id, dueAt: inHours(38) },
    { title: 'Inspect Processing Area sensor', status: 'TODO', priority: 'HIGH', assigneeId: employees[0].id, dueAt: inHours(1) },
  ]
  const tasks: FarmTask[] = taskSeed.map((t) => ({ ...t, id: rnd.uuid(), farmId: farm.id }))

  const auditEntries: AuditEntry[] = [
    ...batches
      .filter((b) => b.inoculationDate)
      .slice(-6)
      .map((b) => ({ id: rnd.uuid(), userId: b.createdBy, action: 'created' as const, entity: 'batch' as const, entityLabel: `#${b.code}`, date: b.inoculationDate! })),
    ...harvests.slice(-8).map((h) => {
      const b = batches.find((x) => x.id === h.batchId)!
      return { id: rnd.uuid(), userId: h.employeeId, action: 'recorded' as const, entity: 'harvest' as const, entityLabel: `#${b.code}`, date: h.date, newValue: `${h.wetWeight} lb` }
    }),
    ...movements
      .filter((m) => m.type === 'ADJUSTMENT' && m.reference === 'Cycle count')
      .slice(-4)
      .map((m) => ({ id: rnd.uuid(), userId: m.userId, action: 'adjusted' as const, entity: 'inventory' as const, entityLabel: products.find((p) => p.id === m.productId)!.name, date: m.date, newValue: `${m.quantity > 0 ? '+' : ''}${m.quantity}` })),
    ...orders.slice(-6).map((o) => ({ id: rnd.uuid(), userId: o.processedBy, action: 'processed' as const, entity: 'order' as const, entityLabel: o.code, date: o.createdAt, newValue: o.status })),
    ...movements
      .filter((m) => m.type === 'WASTED')
      .slice(-3)
      .map((m) => ({ id: rnd.uuid(), userId: m.userId, action: 'recorded' as const, entity: 'waste' as const, entityLabel: products.find((p) => p.id === m.productId)!.name, date: m.date, newValue: `${-m.quantity}` })),
    { id: rnd.uuid(), userId: employees[0].id, action: 'updated', entity: 'product', entityLabel: 'Fresh Lion’s Mane', date: iso(at(-2, 16)), oldValue: '$17.00', newValue: '$18.00' },
  ]
  const audit = auditEntries.filter((a) => isPast(new Date(a.date))).sort((a, b) => b.date.localeCompare(a.date))

  return {
    farm,
    species,
    rooms,
    locations,
    employees,
    batches,
    harvests: harvests.sort((a, b) => a.date.localeCompare(b.date)),
    products,
    movements: movements.sort((a, b) => a.date.localeCompare(b.date)),
    customers,
    orders: orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    expenses: expenses.sort((a, b) => a.date.localeCompare(b.date)),
    tasks,
    equipment,
    readings,
    audit,
    generatedAt: iso(now),
  }
}
