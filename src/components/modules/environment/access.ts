import type { Role } from '@/types'

/** Roles allowed to change room targets and register sensors (mirrors the RLS writer list). */
export const ENVIRONMENT_MANAGERS: Role[] = ['OWNER', 'FARM_MANAGER']
