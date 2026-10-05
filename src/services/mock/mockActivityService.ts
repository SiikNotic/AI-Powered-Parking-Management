import { mockActivity, mockAlerts } from '@/data/mock'
import type { ActivityService } from '../contracts'
import { matchesLocation, withLatency } from './delay'

export const mockActivityService: ActivityService = {
  getRecentActivity: (location, limit = 7) =>
    withLatency(mockActivity.filter((e) => matchesLocation(e.locationId, location)).slice(0, limit)),
  getAlerts: (location) => withLatency(mockAlerts.filter((a) => matchesLocation(a.locationId, location))),
}
