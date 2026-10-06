import { useEffect } from 'react'
import { useSession } from '@/context/session'
import { farmDataService, type FarmData } from '@/services'
import { useAsync } from './useAsync'

/** Last loaded data per farm, so a newly mounted form or drawer has data on its first render. */
const lastLoaded = new Map<string, FarmData>()

/** All records of the selected farm for module pages; reloads after any write or realtime change. */
export function useFarmData() {
  const { farm } = useSession()
  const result = useAsync(() => farmDataService.get(farm.id), [farm.id], ['dashboard'])
  // Ignore data that belongs to the previously selected farm.
  const fresh = result.data && result.data.farm.id === farm.id ? result.data : undefined
  useEffect(() => {
    if (fresh) lastLoaded.set(farm.id, fresh)
  }, [fresh, farm.id])
  const data = fresh ?? lastLoaded.get(farm.id)
  return { ...result, data }
}
