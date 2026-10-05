import { createContext, useContext } from 'react'
import type { Permission } from '@/domain/permissions'
import type { AppUser, Farm, Role } from '@/types'

export interface SessionContextValue {
  user: AppUser
  farms: Farm[]
  farm: Farm
  setFarmId: (id: string) => void
  can: (permission: Permission) => boolean
  setRole: (role: Role) => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
