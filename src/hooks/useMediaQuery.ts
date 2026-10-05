import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Matches the layout breakpoints used across the app. */
export const BREAKPOINTS = {
  tablet: '(min-width: 768px)',
  desktop: '(min-width: 1280px)',
} as const
