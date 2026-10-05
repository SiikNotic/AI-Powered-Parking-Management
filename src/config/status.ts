import {
  Car,
  CarFront,
  Caravan,
  CircleCheck,
  CircleSlash,
  Clock3,
  Truck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ParkingCategory, SpaceStatus, SpaceType } from '@/types'

/**
 * Single source of truth for parking status visuals.
 * Each status always pairs a colour with an icon and a translated label.
 */
export interface StatusVisual {
  icon: LucideIcon
  /** Solid swatch (dots, map cells, chart marks). */
  dot: string
  /** Tinted background + readable text for badges. */
  badge: string
  /** Map cell styles. */
  cell: string
}

export const SPACE_STATUSES: SpaceStatus[] = ['available', 'occupied', 'reserved', 'maintenance', 'disabled']

export const statusVisuals: Record<SpaceStatus, StatusVisual> = {
  available: {
    icon: CircleCheck,
    dot: 'bg-available',
    badge: 'bg-available-soft text-available-ink',
    cell: 'bg-available-soft text-available-ink border-available/35 hover:border-available',
  },
  occupied: {
    icon: CarFront,
    dot: 'bg-occupied',
    badge: 'bg-occupied-soft text-occupied-ink',
    cell: 'bg-occupied text-white border-occupied hover:brightness-110',
  },
  reserved: {
    icon: Clock3,
    dot: 'bg-reserved',
    badge: 'bg-reserved-soft text-reserved-ink',
    cell: 'bg-reserved-soft text-reserved-ink border-reserved/45 hover:border-reserved',
  },
  maintenance: {
    icon: Wrench,
    dot: 'bg-maintenance',
    badge: 'bg-maintenance-soft text-maintenance-ink',
    cell: 'bg-maintenance-soft text-maintenance-ink border-maintenance/50 border-dashed hover:border-maintenance',
  },
  disabled: {
    icon: CircleSlash,
    dot: 'bg-disabled',
    badge: 'bg-disabled-soft text-disabled-ink',
    cell: 'bg-disabled-soft text-disabled-ink border-transparent opacity-70',
  },
}

/** Vehicle icon per space type — used for occupied spaces on the map. */
export const spaceTypeIcons: Record<SpaceType, LucideIcon> = {
  truck: Truck,
  trailer: Truck,
  oversized: Truck,
  rv: Caravan,
  car: Car,
  compact: Car,
  ev: Car,
}

export const categoryIcons: Record<ParkingCategory, LucideIcon> = {
  truck: Truck,
  car: Car,
  rv: Caravan,
}
