import { useCallback } from 'react'
import { useSession } from '@/context/session'
import { commands, type CommandService } from '@/services'
import { useMutation } from './useMutation'

type Command = keyof CommandService
type Args<K extends Command> = CommandService[K] extends (farmId: string, ...args: infer A) => Promise<unknown> ? A : never
type Result<K extends Command> = CommandService[K] extends (...args: never[]) => Promise<infer R> ? R : never

/**
 * Runs a write operation for the selected farm with pending state, a success
 * toast and translated errors. `run(args, successMessage)`.
 */
export function useCommand<K extends Command>(name: K) {
  const { farm } = useSession()
  const action = useCallback(
    (...args: Args<K>) => (commands[name] as unknown as (farmId: string, ...a: Args<K>) => Promise<Result<K>>).call(commands, farm.id, ...args),
    [farm.id, name],
  )
  return useMutation<Args<K>, Result<K>>(action)
}
