import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { authService, changeFeed, parkingService } from '@/services'
import type { LocationFilter } from '@/types'
import { SessionContext, type SessionContextValue } from './session'

const STORAGE_KEY = 'sky-parking.location'

function storedLocation(): LocationFilter {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'all'
  } catch {
    return 'all'
  }
}

/**
 * Holds the signed-in manager and the location selector state.
 * When Supabase Auth is connected, `authService.getCurrentManager` will read the session.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const managerState = useAsync(() => authService.getCurrentManager(), [], ['session'])
  const locations = useAsync(() => parkingService.getLocations(), [], ['locations', 'spaces'])
  const [signedIn, setSignedIn] = useState(() => authService.isSignedIn())

  useEffect(() => changeFeed.subscribe(['session'], () => setSignedIn(authService.isSignedIn())), [])
  const [selectedLocation, setSelected] = useState<LocationFilter>(storedLocation)

  // Fall back to "all" if a stored location no longer exists.
  const effectiveLocation: LocationFilter =
    selectedLocation === 'all' || !locations.data || locations.data.some((l) => l.id === selectedLocation)
      ? selectedLocation
      : 'all'

  const value = useMemo<SessionContextValue>(
    () => ({
      signedIn,
      manager: managerState.data,
      locations,
      selectedLocation: effectiveLocation,
      setSelectedLocation: (location) => {
        setSelected(location)
        try {
          localStorage.setItem(STORAGE_KEY, location)
        } catch {
          /* ignore */
        }
      },
      activeLocation: locations.data?.find((l) => l.id === effectiveLocation),
    }),
    [signedIn, managerState.data, locations, effectiveLocation],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
