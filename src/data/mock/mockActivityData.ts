/**
 * ⚠️ DEMO DATA — NOT REAL.
 * Recent activity feed and operational alerts.
 * Stored as structured events so the UI can translate them.
 */
import type { ActivityEvent, Alert } from '@/types'
import { minutesAgo } from './demoUtils'

export const mockActivity: ActivityEvent[] = [
  { id: 'evt_01', type: 'space_occupied', locationId: 'loc_phl', occurredAt: minutesAgo(4), params: { spaceNumber: 42 } },
  { id: 'evt_hou_1', type: 'check_in', locationId: 'loc_hou', occurredAt: minutesAgo(9), params: { spaceNumber: 14, customerName: 'Rachel Kim' } },
  { id: 'evt_02', type: 'reservation_confirmed', locationId: 'loc_dal', occurredAt: minutesAgo(15), params: { reservationCode: 'SP-1042', customerName: 'John Smith' } },
  { id: 'evt_03', type: 'space_available', locationId: 'loc_phl', occurredAt: minutesAgo(31), params: { spaceNumber: 17 } },
  { id: 'evt_hou_2', type: 'space_occupied', locationId: 'loc_hou', occurredAt: minutesAgo(34), params: { spaceNumber: 9 } },
  { id: 'evt_04', type: 'payment_received', locationId: 'loc_dal', occurredAt: minutesAgo(38), params: { amount: 80, reservationCode: 'SP-1039' } },
  { id: 'evt_05', type: 'reservation_received', locationId: 'loc_njr', occurredAt: minutesAgo(48), params: { customerName: 'Emily Carter' } },
  { id: 'evt_06', type: 'check_in', locationId: 'loc_dal', occurredAt: minutesAgo(66), params: { spaceNumber: 7, customerName: 'Luis Ramirez' } },
  { id: 'evt_07', type: 'check_out', locationId: 'loc_phl', occurredAt: minutesAgo(92), params: { spaceNumber: 23 } },
  { id: 'evt_08', type: 'reservation_cancelled', locationId: 'loc_njr', occurredAt: minutesAgo(118), params: { reservationCode: 'SP-1036' } },
  { id: 'evt_09', type: 'space_occupied', locationId: 'loc_dal', occurredAt: minutesAgo(145), params: { spaceNumber: 31 } },
  { id: 'evt_10', type: 'space_available', locationId: 'loc_njr', occurredAt: minutesAgo(190), params: { spaceNumber: 9 } },
  { id: 'evt_11', type: 'payment_received', locationId: 'loc_phl', occurredAt: minutesAgo(232), params: { amount: 45, reservationCode: 'SP-1035' } },
]

export const mockAlerts: Alert[] = [
  { id: 'alr_01', type: 'camera_offline', severity: 'critical', locationId: 'loc_phl', createdAt: minutesAgo(12), params: { cameraName: 'Gate B · Entrance' } },
  { id: 'alr_02', type: 'high_occupancy', severity: 'warning', locationId: 'loc_dal', createdAt: minutesAgo(26), params: { percentage: 94 } },
  { id: 'alr_03', type: 'payment_issue', severity: 'critical', locationId: 'loc_njr', createdAt: minutesAgo(54), params: { reservationCode: 'SP-1038', amount: 55 } },
  { id: 'alr_04', type: 'space_maintenance', severity: 'warning', locationId: 'loc_phl', createdAt: minutesAgo(130), params: { spaceNumber: 32 } },
  { id: 'alr_hou', type: 'camera_offline', severity: 'warning', locationId: 'loc_hou', createdAt: minutesAgo(170), params: { cameraName: 'Level 2 · Ramp' } },
  { id: 'alr_05', type: 'reservation_conflict', severity: 'info', locationId: 'loc_dal', createdAt: minutesAgo(205), params: { reservationCode: 'SP-1047', spaceNumber: 18 } },
]
