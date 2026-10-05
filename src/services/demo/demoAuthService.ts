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
  return { user, farms: demoFarms.filter((f) => user.farmIds.includes(f.id)) }
}

export const demoAuthService: AuthService = {
  getSession: () => delay(session(), 120),
  async setRole(role) {
    try {
      localStorage.setItem(ROLE_KEY, role)
    } catch {
      /* ignore */
    }
    changeFeed.publish('session')
    return session()
  },
}
