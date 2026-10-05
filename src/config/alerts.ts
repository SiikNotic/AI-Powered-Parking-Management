import { Droplets, Hourglass, PackageX, Thermometer, Timer, Truck, WifiOff, Wind, Wrench, type LucideIcon } from 'lucide-react'
import type { AlertSeverity, AlertStatus, AlertType } from '@/types'
import type { BadgeTone } from '@/components/ui/Badge'

export const alertIcons: Record<AlertType, LucideIcon> = {
  temperature_high: Thermometer,
  temperature_low: Thermometer,
  humidity_high: Droplets,
  humidity_low: Droplets,
  co2_high: Wind,
  sensor_offline: WifiOff,
  batch_overdue: Timer,
  low_inventory: PackageX,
  order_overdue: Truck,
  expiring: Hourglass,
  maintenance_due: Wrench,
}

export const severityIconClass: Record<AlertSeverity, string> = {
  critical: 'bg-crit-soft text-crit-ink',
  warning: 'bg-warn-soft text-warn-ink',
  info: 'bg-info-soft text-info-ink',
}

export const severityTone: Record<AlertSeverity, BadgeTone> = { critical: 'danger', warning: 'warning', info: 'info' }
export const statusTone: Record<AlertStatus, BadgeTone> = { NEW: 'brand', ACKNOWLEDGED: 'neutral', RESOLVED: 'success' }

