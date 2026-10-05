import {
  Building2,
  CalendarCheck2,
  Cctv,
  CameraOff,
  UserPlus,
  Wrench,
  CalendarPlus,
  CalendarX2,
  CircleCheck,
  CircleDollarSign,
  LogIn,
  LogOut,
  CarFront,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityTone, ActivityType } from '@/types'
import type { BadgeTone } from '@/components/ui/Badge'

export const activityVisuals: Record<ActivityType, { icon: LucideIcon; tone: ActivityTone }> = {
  space_occupied: { icon: CarFront, tone: 'danger' },
  space_available: { icon: CircleCheck, tone: 'success' },
  reservation_confirmed: { icon: CalendarCheck2, tone: 'info' },
  reservation_received: { icon: CalendarPlus, tone: 'info' },
  reservation_cancelled: { icon: CalendarX2, tone: 'warning' },
  check_in: { icon: LogIn, tone: 'neutral' },
  check_out: { icon: LogOut, tone: 'neutral' },
  payment_received: { icon: CircleDollarSign, tone: 'success' },
  location_created: { icon: Building2, tone: 'info' },
  customer_created: { icon: UserPlus, tone: 'neutral' },
  space_maintenance: { icon: Wrench, tone: 'warning' },
  camera_offline: { icon: CameraOff, tone: 'danger' },
  camera_online: { icon: Cctv, tone: 'success' },
}

export const activityToneBadge: Record<ActivityTone, BadgeTone> = {
  success: 'success',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  neutral: 'neutral',
}

export const activityToneIcon: Record<ActivityTone, string> = {
  success: 'bg-available-soft text-available-ink',
  info: 'bg-reserved-soft text-reserved-ink',
  warning: 'bg-maintenance-soft text-maintenance-ink',
  danger: 'bg-occupied-soft text-occupied-ink',
  neutral: 'bg-surface-sunken text-text-secondary',
}
