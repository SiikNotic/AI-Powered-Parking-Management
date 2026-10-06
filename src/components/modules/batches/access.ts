import type { BatchStatus, Role } from '@/types'

/** Roles allowed to write production batches (mirrors the RLS writer list). */
export const BATCH_WRITERS: Role[] = ['OWNER', 'FARM_MANAGER', 'GROWER']
/** Roles allowed to record harvests (mirrors the RLS writer list). */
export const HARVEST_WRITERS: Role[] = ['OWNER', 'FARM_MANAGER', 'GROWER', 'EMPLOYEE']
/** Statuses at which a batch can be picked (same rule as the services). */
export const HARVESTABLE: BatchStatus[] = ['FRUITING', 'READY_TO_HARVEST', 'HARVESTED']
