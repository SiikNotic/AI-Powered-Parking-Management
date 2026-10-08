import type { MushroomSpecies } from '@/types'

/** Public URL of a species photo, or null when the species has none. */
export function speciesImageUrl(species: Pick<MushroomSpecies, 'imageKey'> | undefined): string | null {
  if (!species?.imageKey) return null
  return `${import.meta.env.BASE_URL}images/species/${species.imageKey}.jpg`
}
