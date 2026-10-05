/**
 * ⚠️ DEMO DATA — NOT REAL.
 * Signed-in manager used until Supabase Auth is connected.
 */
import type { Manager } from '@/types'

export const mockManager: Manager = {
  id: 'mgr_demo',
  firstName: 'Alex',
  lastName: 'Morgan',
  email: 'alex.morgan@example.com',
  role: 'owner',
  organization: { id: 'org_demo', name: 'Morgan Fleet Properties' },
}
