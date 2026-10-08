import { fail, supabase } from './client'

const BUCKET = 'farm-photos'
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Uploads a species photo to Supabase Storage and returns its public URL.
 * Files are namespaced per farm: farm-photos/{farmId}/species/{speciesId}.jpg
 */
export async function uploadSpeciesPhoto(farmId: string, speciesId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not_image')
  if (file.size > MAX_BYTES) throw new Error('too_large')
  const path = `${farmId}/species/${speciesId}.jpg`
  const { error } = await supabase().storage.from(BUCKET).upload(path, file, { upsert: true, contentType: 'image/jpeg' })
  fail(error)
  const { data } = supabase().storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
