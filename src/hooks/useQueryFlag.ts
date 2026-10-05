import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Reads a URL query parameter once when the page opens (e.g. `?new=1` from a
 * quick action) and then removes it from the URL so a reload doesn't repeat it.
 */
export function useInitialQueryParam(name: string): string | null {
  const [params, setParams] = useSearchParams()
  const [initial] = useState(() => params.get(name))

  useEffect(() => {
    if (initial === null) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(name)
        return next
      },
      { replace: true },
    )
  }, [initial, name, setParams])

  return initial
}
