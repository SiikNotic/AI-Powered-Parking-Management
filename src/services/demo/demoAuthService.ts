import { demoFarms, demoUser } from '@/data/demo'
import type { Role } from '@/types'
import { changeFeed } from '../changeFeed'
import type { AuthService, Session } from '../contracts'
import { delay } from './delay'

const ROLE_KEY = 'mushroom-farm.demo-role'

function storedRole(): Role {
  try {
    const r = localStorage.getItem(ROLE_KEY)
    if (r) return r as Role
  } catch {
    /* storage unavailable */
  }
  return demoUser.role
}

function session(): Session {
  const user = { ...demoUser, role: storedRole() }
  // Same rule RLS applies: a user only sees farms they are a member of.
  const farms = demoFarms.filter((f) => user.farmIds.includes(f.id))
  return { user, farms, memberships: farms.map((f) => ({ farmId: f.id, role: user.role })) }
}

export const demoAuthService: AuthService = {
  getSession: () => delay(session(), 120),
  // The demo has a single signed-in user and fixed farms.
  signIn: async () => undefined,
  signUp: async () => false,
  signOut: async () => undefined,
  createFarm: async () => demoFarms[0].id,
  async setRole(role) {
    try {
      localStorage.setItem(ROLE_KEY, role)
    } catch {
      /* ignore */
    }
    changeFeed.publish('session')
  },
}
