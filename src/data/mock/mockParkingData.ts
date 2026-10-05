/**
 * ⚠️ DEMO DATA — NOT REAL.
 * Parking locations, spaces and stats used while the app is not connected
 * to Supabase. Replace by switching the data source in `src/services`.
 */
import type {
  ParkingLocation,
  ParkingSpace,
  ParkingStats,
  PriceUnit,
  SpaceStatus,
  SpaceType,
  VehicleType,
} from '@/types'
import { createRandom, minutesAgo, shuffle } from './demoUtils'

export const mockLocations: ParkingLocation[] = [
  {
    id: 'loc_phl',
    name: 'Philadelphia Truck Stop',
    city: 'Philadelphia',
    state: 'PA',
    address: '2800 S Columbus Blvd, Philadelphia, PA',
    timezone: 'America/New_York',
    totalSpaces: 60,
    category: 'truck',
    code: 'PHL',
  },
  {
    id: 'loc_dal',
    name: 'Dallas Truck Parking',
    city: 'Dallas',
    state: 'TX',
    address: '4100 Irving Blvd, Dallas, TX',
    timezone: 'America/Chicago',
    totalSpaces: 54,
    category: 'truck',
    code: 'DAL',
  },
  {
    id: 'loc_njr',
    name: 'New Jersey RV Parking',
    city: 'Elizabeth',
    state: 'NJ',
    address: '650 Division St, Elizabeth, NJ',
    timezone: 'America/New_York',
    totalSpaces: 36,
    category: 'rv',
    code: 'NJR',
  },
  {
    id: 'loc_hou',
    name: 'Houston Car Parking',
    city: 'Houston',
    state: 'TX',
    address: '1200 Louisiana St, Houston, TX',
    timezone: 'America/Chicago',
    totalSpaces: 48,
    category: 'car',
    code: 'HOU',
  },
]

interface LocationBlueprint {
  locationId: string
  zones: string[]
  perZone: number
  counts: Record<Exclude<SpaceStatus, 'available'>, number>
  /** Space numbers forced into a given status (used to keep alerts consistent). */
  pinned: Record<number, SpaceStatus>
  type: SpaceType
  size: { length: number; width: number }
  price: number
  priceUnit: PriceUnit
  vehicleTypes: VehicleType[]
  previous: ParkingStats['previous']
  seed: number
}

const blueprints: LocationBlueprint[] = [
  {
    locationId: 'loc_phl',
    zones: ['A', 'B', 'C', 'D', 'E'],
    perZone: 12,
    counts: { occupied: 16, reserved: 5, maintenance: 2, disabled: 0 },
    pinned: { 32: 'maintenance', 47: 'maintenance', 42: 'occupied' },
    type: 'truck',
    size: { length: 75, width: 12 },
    price: 45,
    priceUnit: 'night',
    vehicleTypes: ['semi_trailer', 'bobtail', 'box_truck'],
    previous: { available: 33, occupied: 19, reserved: 6 },
    seed: 11,
  },
  {
    locationId: 'loc_dal',
    zones: ['A', 'B', 'C', 'D', 'E', 'F'],
    perZone: 9,
    counts: { occupied: 40, reserved: 11, maintenance: 0, disabled: 0 },
    pinned: { 18: 'reserved' },
    type: 'trailer',
    size: { length: 80, width: 12 },
    price: 40,
    priceUnit: 'night',
    vehicleTypes: ['semi_trailer', 'bobtail'],
    previous: { available: 5, occupied: 39, reserved: 10 },
    seed: 23,
  },
  {
    locationId: 'loc_njr',
    zones: ['A', 'B', 'C'],
    perZone: 12,
    counts: { occupied: 5, reserved: 0, maintenance: 0, disabled: 1 },
    pinned: {},
    type: 'rv',
    size: { length: 45, width: 14 },
    price: 55,
    priceUnit: 'night',
    vehicleTypes: ['rv', 'van'],
    previous: { available: 27, occupied: 7, reserved: 1 },
    seed: 37,
  },
  {
    locationId: 'loc_hou',
    zones: ['A', 'B', 'C', 'D'],
    perZone: 12,
    counts: { occupied: 24, reserved: 4, maintenance: 1, disabled: 0 },
    pinned: { 14: 'occupied', 9: 'occupied' },
    type: 'car',
    size: { length: 18, width: 9 },
    price: 15,
    priceUnit: 'day',
    vehicleTypes: ['car', 'suv', 'pickup', 'van'],
    previous: { available: 22, occupied: 21, reserved: 5 },
    seed: 53,
  },
]

/** Adds realistic variety: oversized truck bays, EV-charging and compact car spaces. */
function spaceVariant(bp: LocationBlueprint, number: number): Pick<ParkingSpace, 'type' | 'length' | 'price'> {
  const { length } = bp.size
  if ((bp.type === 'truck' || bp.type === 'trailer') && number % 4 === 0) {
    return { type: 'oversized', length: length + 10, price: bp.price + 10 }
  }
  if (bp.type === 'car' && number % 6 === 0) return { type: 'ev', length, price: bp.price + 5 }
  if (bp.type === 'car' && number % 5 === 0) return { type: 'compact', length: length - 3, price: bp.price - 3 }
  return { type: bp.type, length, price: bp.price }
}

function buildSpaces(bp: LocationBlueprint): ParkingSpace[] {
  const random = createRandom(bp.seed)
  const total = bp.zones.length * bp.perZone
  const numbers = Array.from({ length: total }, (_, i) => i + 1)

  const statusByNumber = new Map<number, SpaceStatus>()
  const remaining = { ...bp.counts }
  for (const [num, status] of Object.entries(bp.pinned)) {
    statusByNumber.set(Number(num), status)
    if (status !== 'available') remaining[status] -= 1
  }

  const free = shuffle(
    numbers.filter((n) => !statusByNumber.has(n)),
    random,
  )
  for (const status of ['occupied', 'reserved', 'maintenance', 'disabled'] as const) {
    for (let i = 0; i < remaining[status]; i++) {
      const n = free.pop()
      if (n !== undefined) statusByNumber.set(n, status)
    }
  }

  return numbers.map((number) => {
    const zone = bp.zones[Math.floor((number - 1) / bp.perZone)]
    const variant = spaceVariant(bp, number)
    return {
      id: `${bp.locationId}_sp_${number}`,
      locationId: bp.locationId,
      number,
      zone,
      status: statusByNumber.get(number) ?? 'available',
      ...variant,
      width: bp.size.width,
      priceUnit: bp.priceUnit,
      vehicleTypes: bp.vehicleTypes,
      updatedAt: minutesAgo(Math.floor(random() * 600)),
    }
  })
}

export const mockSpaces: ParkingSpace[] = blueprints.flatMap(buildSpaces)

export const mockPreviousStats: Record<string, ParkingStats['previous']> = Object.fromEntries(
  blueprints.map((bp) => [bp.locationId, bp.previous]),
)
