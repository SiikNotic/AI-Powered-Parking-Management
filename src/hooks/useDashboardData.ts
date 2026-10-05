import { activityService, analyticsService, parkingService, reservationService } from '@/services'
import type { LocationFilter } from '@/types'
import { useAsync } from './useAsync'
import { useLiveSpaces } from './useLiveSpaces'

/**
 * Loads every dashboard section for the selected location in parallel.
 * Each section keeps its own loading / error state so one failure never
 * blanks the whole page.
 */
export function useDashboardData(location: LocationFilter) {
  const stats = useAsync(() => parkingService.getStats(location), [location])
  const spaces = useLiveSpaces(location)
  const revenue = useAsync(() => analyticsService.getRevenue(location), [location])
  const reservations = useAsync(() => reservationService.getUpcoming(location, 6), [location])
  const activity = useAsync(() => activityService.getRecentActivity(location, 7), [location])
  const alerts = useAsync(() => activityService.getAlerts(location), [location])

  return { stats, spaces, revenue, reservations, activity, alerts }
}
