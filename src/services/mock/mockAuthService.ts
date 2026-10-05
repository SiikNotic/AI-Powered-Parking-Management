import { mockManager } from '@/data/mock'
import type { AuthService } from '../contracts'
import { withLatency } from './delay'

export const mockAuthService: AuthService = {
  getCurrentManager: () => withLatency(mockManager),
  // Demo mode has no real session to end; the manager stays signed in.
  signOut: () => Promise.resolve(),
}
