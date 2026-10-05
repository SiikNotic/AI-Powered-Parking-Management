/**
 * Role-based permissions. The UI uses these to hide what a role cannot see;
 * Supabase RLS policies enforce the same rules on the server.
 */
import type { Role } from '@/types'

export type Permission =
  | 'production.view'
  | 'inventory.view'
  | 'sales.view'
  | 'finance.view'
  | 'environment.view'
  | 'alerts.manage'
  | 'tasks.view'
  | 'audit.view'
  | 'farms.manage'

const ALL: Permission[] = ['production.view', 'inventory.view', 'sales.view', 'finance.view', 'environment.view', 'alerts.manage', 'tasks.view', 'audit.view', 'farms.manage']

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ALL,
  FARM_MANAGER: ['production.view', 'inventory.view', 'sales.view', 'finance.view', 'environment.view', 'alerts.manage', 'tasks.view', 'audit.view'],
  GROWER: ['production.view', 'inventory.view', 'environment.view', 'alerts.manage', 'tasks.view'],
  PACKING: ['production.view', 'inventory.view', 'tasks.view'],
  SALES: ['inventory.view', 'sales.view', 'tasks.view'],
  ACCOUNTING: ['inventory.view', 'sales.view', 'finance.view', 'audit.view'],
  EMPLOYEE: ['production.view', 'tasks.view'],
}

export const ROLES = Object.keys(ROLE_PERMISSIONS) as Role[]

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}
