import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { LogoMark } from '@/components/layout/Logo'
import { ErrorState } from '@/components/ui/States'
import { can as roleCan } from '@/domain/permissions'
import { useAsync } from '@/hooks/useAsync'
import { authService } from '@/services'
import type { Role } from '@/types'
import { SessionContext, type SessionContextValue } from './session'

const FARM_KEY = 'mushroom-farm.farm'

function storedFarm(): string | null {
  try {
    return localStorage.getItem(FARM_KEY)
  } catch {
    return null
  }
}

/** Loads the signed-in user and the farms they belong to; tracks the selected farm. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useAsync(() => authService.getSession(), [], ['session'])
  const [farmId, setFarmIdState] = useState<string | null>(storedFarm)

  const setFarmId = useCallback((id: string) => {
    setFarmIdState(id)
    try {
      localStorage.setItem(FARM_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const setRole = useCallback((role: Role) => void authService.setRole(role), [])

  const value = useMemo<SessionContextValue | null>(() => {
    if (!session.data) return null
    const { user, farms } = session.data
    // Only farms the user belongs to are selectable.
    const farm = farms.find((f) => f.id === farmId) ?? farms[0]
    return { user, farms, farm, setFarmId, setRole, can: (p) => roleCan(user.role, p) }
  }, [session.data, farmId, setFarmId, setRole])

  if (session.status === 'error' && !session.data) return <ErrorState onRetry={session.retry} className="min-h-dvh" />
  if (!value)
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-busy="true">
        <LogoMark className="size-12 animate-pulse" />
      </div>
    )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
