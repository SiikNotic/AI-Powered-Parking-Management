/**
 * ⚠️ DEMO DATA entry point. Only the demo services import this module.
 * Two farms show the multi-farm architecture; each user sees only theirs.
 */
import type { AppUser, Farm } from '@/types'
import { generateFarm, type FarmDataset } from './generate'

export type { FarmDataset }

export const demoFarms: Farm[] = [
  { id: '6f1b2c9e-4a7d-4f3e-9b21-0c5d8e7a1f01', name: 'Evergreen Mycology', location: 'Lancaster, PA', timezone: 'America/New_York' },
  { id: '9a2c4e1d-7b3f-4c8a-a5d2-1e6f9b0c2d02', name: 'North Annex', location: 'Ephrata, PA', timezone: 'America/New_York' },
]

export const demoUser: AppUser = {
  id: '3d7e9f1a-2b4c-4d6e-8f0a-1b2c3d4e5f60',
  name: 'Alex Morgan',
  email: 'alex@evergreenmyco.example',
  role: 'OWNER',
  farmIds: demoFarms.map((f) => f.id),
}

const cache = new Map<string, FarmDataset>()

/** Builds (once per session) the dataset for a farm. */
export function getFarmDataset(farmId: string): FarmDataset {
  const cached = cache.get(farmId)
  if (cached) return cached
  const index = demoFarms.findIndex((f) => f.id === farmId)
  const farm = demoFarms[Math.max(0, index)]
  const dataset = generateFarm({ farm, seed: index === 1 ? 977 : 2026, scale: index === 1 ? 0.45 : 1 })
  cache.set(farmId, dataset)
  return dataset
}
