import { createContext, useContext } from 'react'
import type { AsyncResult } from '@/hooks/useAsync'
import type { LocationFilter, Manager, ParkingLocation } from '@/types'

export interface SessionContextValue {
  manager: Manager | undefined
  locations: AsyncResult<ParkingLocation[]>
  selectedLocation: LocationFilter
  setSelectedLocation: (location: LocationFilter) => void
  /** The selected location object, or undefined when "All Locations" is active. */
  activeLocation: ParkingLocation | undefined
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
