/**
 * ⚠️ DEMO DATA — NOT REAL.
 * Parking locations, spaces and stats used while the app is not connected
 * to Supabase. Replace by switching the data source in `src/services`.
 */
import type {
  ParkingLocation,
  ParkingSpace,
  ParkingStats,
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
    code: 'NJR',
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
    vehicleTypes: ['rv', 'van'],
    previous: { available: 27, occupied: 7, reserved: 1 },
    seed: 37,
  },
]

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
    // Every fourth space is larger / oversized and priced accordingly.
    const oversized = number % 4 === 0 && bp.type !== 'rv'
    return {
      id: `${bp.locationId}_sp_${number}`,
      locationId: bp.locationId,
      number,
      zone,
      status: statusByNumber.get(number) ?? 'available',
      type: oversized ? 'oversized' : bp.type,
      length: oversized ? bp.size.length + 10 : bp.size.length,
      width: bp.size.width,
      price: oversized ? bp.price + 10 : bp.price,
      vehicleTypes: bp.vehicleTypes,
      updatedAt: minutesAgo(Math.floor(random() * 600)),
    }
  })
}

export const mockSpaces: ParkingSpace[] = blueprints.flatMap(buildSpaces)

export const mockPreviousStats: Record<string, ParkingStats['previous']> = Object.fromEntries(
  blueprints.map((bp) => [bp.locationId, bp.previous]),
)
