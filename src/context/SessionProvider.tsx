import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LogoMark } from '@/components/layout/Logo'
import { ErrorState } from '@/components/ui/States'
import { can as roleCan } from '@/domain/permissions'
import { useAsync } from '@/hooks/useAsync'
import { CreateFarmPage } from '@/pages/CreateFarmPage'
import { SignInPage } from '@/pages/SignInPage'
import { authService, preferencesService } from '@/services'
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

/**
 * Loads the signed-in user and the farms they belong to; tracks the selected
 * farm. Shows sign-in when signed out and onboarding when the user has no farm.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useAsync(() => authService.getSession(), [], ['session'])
  const [farmId, setFarmIdState] = useState<string | null>(storedFarm)
  const userId = session.data?.user.id
  const [hydrated, setHydrated] = useState<string | null>(null)

  // Pull the saved dashboard layout from the server before the dashboard reads it.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const done = () => !cancelled && setHydrated(userId)
    if (preferencesService.hydrate) preferencesService.hydrate(userId).then(done, done)
    else done()
    return () => {
      cancelled = true
    }
  }, [userId])

  const setFarmId = useCallback((id: string) => {
    setFarmIdState(id)
    try {
      localStorage.setItem(FARM_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const setRole = useCallback((role: Role) => void authService.setRole?.(role), [])
  const signOut = useCallback(() => void authService.signOut(), [])

  const value = useMemo<SessionContextValue | null>(() => {
    const s = session.data
    if (!s || !s.farms.length) return null
    // Only farms the user belongs to are selectable; the role is the one on that farm.
    const farm = s.farms.find((f) => f.id === farmId) ?? s.farms[0]
    const role = s.memberships.find((m) => m.farmId === farm.id)?.role ?? s.user.role
    const user = { ...s.user, role }
    return { user, farms: s.farms, farm, setFarmId, setRole, signOut, canSwitchRole: Boolean(authService.setRole), can: (p) => roleCan(role, p) }
  }, [session.data, farmId, setFarmId, setRole, signOut])

  if (session.status === 'error' && session.data === undefined) return <ErrorState onRetry={session.retry} className="min-h-dvh" />
  if (session.data === null) return <SignInPage />
  if (session.data && !session.data.farms.length) return <CreateFarmPage name={session.data.user.name} />
  if (!value || hydrated !== value.user.id)
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-busy="true">
        <LogoMark className="size-12 animate-pulse" />
      </div>
    )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
