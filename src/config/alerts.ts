import { CalendarX2, CameraOff, CreditCard, Gauge, Wrench, type LucideIcon } from 'lucide-react'
import type { AlertSeverity, AlertType } from '@/types'
import type { BadgeTone } from '@/components/ui/Badge'

export const alertIcons: Record<AlertType, LucideIcon> = {
  camera_offline: CameraOff,
  space_maintenance: Wrench,
  high_occupancy: Gauge,
  payment_issue: CreditCard,
  reservation_conflict: CalendarX2,
}

export const severityTone: Record<AlertSeverity, BadgeTone> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
}

export const severityIconClass: Record<AlertSeverity, string> = {
  critical: 'bg-occupied-soft text-occupied-ink',
  warning: 'bg-maintenance-soft text-maintenance-ink',
  info: 'bg-reserved-soft text-reserved-ink',
}

export const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }
