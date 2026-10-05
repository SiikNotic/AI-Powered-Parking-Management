import { useSession } from '@/context/session'
import { farmDataService } from '@/services'
import { useAsync } from './useAsync'

/** All records of the selected farm for module pages; reloads after any write or realtime change. */
export function useFarmData() {
  const { farm } = useSession()
  const result = useAsync(() => farmDataService.get(farm.id), [farm.id], ['dashboard'])
  // Ignore data that belongs to the previously selected farm.
  const data = result.data && result.data.farm.id === farm.id ? result.data : undefined
  return { ...result, data }
}
