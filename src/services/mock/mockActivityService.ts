import type { ActivityService } from '../contracts'
import { read, write } from './db'
import { matchesLocation, withLatency } from './delay'
import { allAlerts } from './selectors'

export const mockActivityService: ActivityService = {
  getRecentActivity: (location, limit = 7) =>
    withLatency(() =>
      read()
        .activity.filter((e) => matchesLocation(e.locationId, location))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, limit),
    ),

  getAlerts: (location) => withLatency(() => allAlerts().filter((a) => matchesLocation(a.locationId, location))),

  resolveAlert: (id) =>
    withLatency(() => {
      write(['alerts'], (draft) => {
        draft.alerts = draft.alerts.filter((a) => a.id !== id)
      })
    }),
}
