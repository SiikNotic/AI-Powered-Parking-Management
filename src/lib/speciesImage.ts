import type { MushroomSpecies } from '@/types'

/**
 * Public URL of a species photo, or null when the species has none.
 * imageKey is either a local key (public/images/species/<key>.jpg) or a full
 * https URL (e.g. Supabase Storage public URL from a dashboard upload).
 */
export function speciesImageUrl(species: Pick<MushroomSpecies, 'imageKey'> | undefined): string | null {
  const key = species?.imageKey
  if (!key) return null
  if (key.startsWith('http://') || key.startsWith('https://')) return key
  return `${import.meta.env.BASE_URL}images/species/${key}.jpg`
}
