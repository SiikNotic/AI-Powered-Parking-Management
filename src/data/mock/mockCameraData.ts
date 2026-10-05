/**
 * ⚠️ DEMO DATA — NOT REAL.
 * Camera records per location (no video streams in the demo).
 */
import type { Camera } from '@/types'
import { minutesAgo } from './demoUtils'

export const mockCameras: Camera[] = [
  { id: 'cam_phl_1', locationId: 'loc_phl', name: 'Gate A · Entrance', coverage: 'Main entrance', status: 'online', resolution: '1080p', lastSeenAt: minutesAgo(0) },
  { id: 'cam_phl_2', locationId: 'loc_phl', name: 'Gate B · Entrance', coverage: 'Truck entrance', status: 'offline', resolution: '1080p', lastSeenAt: minutesAgo(12) },
  { id: 'cam_phl_3', locationId: 'loc_phl', name: 'Zones A–C', coverage: 'Zones A, B, C', status: 'online', resolution: '4K', lastSeenAt: minutesAgo(0) },
  { id: 'cam_phl_4', locationId: 'loc_phl', name: 'Zones D–E', coverage: 'Zones D, E', status: 'online', resolution: '4K', lastSeenAt: minutesAgo(1) },
  { id: 'cam_dal_1', locationId: 'loc_dal', name: 'Entrance', coverage: 'Entrance and exit', status: 'online', resolution: '1080p', lastSeenAt: minutesAgo(0) },
  { id: 'cam_dal_2', locationId: 'loc_dal', name: 'Zones A–C', coverage: 'Zones A, B, C', status: 'online', resolution: '1080p', lastSeenAt: minutesAgo(0) },
  { id: 'cam_dal_3', locationId: 'loc_dal', name: 'Zones D–F', coverage: 'Zones D, E, F', status: 'maintenance', resolution: '1080p', lastSeenAt: minutesAgo(340) },
  { id: 'cam_njr_1', locationId: 'loc_njr', name: 'Front gate', coverage: 'Entrance', status: 'online', resolution: '720p', lastSeenAt: minutesAgo(2) },
  { id: 'cam_njr_2', locationId: 'loc_njr', name: 'RV lot', coverage: 'Zones A–C', status: 'online', resolution: '1080p', lastSeenAt: minutesAgo(0) },
  { id: 'cam_hou_1', locationId: 'loc_hou', name: 'Level 1 · Entry', coverage: 'Entrance and pay station', status: 'online', resolution: '4K', lastSeenAt: minutesAgo(0) },
  { id: 'cam_hou_2', locationId: 'loc_hou', name: 'Level 2 · Ramp', coverage: 'Ramp to level 2', status: 'offline', resolution: '1080p', lastSeenAt: minutesAgo(170) },
  { id: 'cam_hou_3', locationId: 'loc_hou', name: 'EV bays', coverage: 'EV charging spaces', status: 'online', resolution: '1080p', lastSeenAt: minutesAgo(0) },
]
