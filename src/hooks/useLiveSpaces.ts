import { useEffect, useMemo, useState } from 'react'
import { parkingService } from '@/services'
import type { LocationFilter, ParkingSpace } from '@/types'
import { useAsync, type AsyncResult } from './useAsync'

/**
 * Loads the spaces for a location and keeps them up to date through
 * `parkingService.subscribeToSpaces` (Supabase Realtime later; a no-op with demo data).
 */
export function useLiveSpaces(location: LocationFilter): AsyncResult<ParkingSpace[]> {
  const initial = useAsync(() => parkingService.getSpaces(location), [location], ['locations'])
  const [updates, setUpdates] = useState<{ location: LocationFilter; byId: Record<string, ParkingSpace> }>({
    location,
    byId: {},
  })

  useEffect(() => {
    return parkingService.subscribeToSpaces(location, (space) =>
      setUpdates((prev) => ({
        location,
        byId: { ...(prev.location === location ? prev.byId : {}), [space.id]: space },
      })),
    )
  }, [location])

  const data = useMemo(() => {
    if (!initial.data) return undefined
    const byId = updates.location === location ? updates.byId : {}
    return Object.keys(byId).length ? initial.data.map((s) => byId[s.id] ?? s) : initial.data
  }, [initial.data, updates, location])

  return { ...initial, data } as AsyncResult<ParkingSpace[]>
}
