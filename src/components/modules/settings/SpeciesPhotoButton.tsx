import { Camera, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSession } from '@/context/session'
import { useI18n } from '@/i18n'
import { speciesImageUrl } from '@/lib/speciesImage'
import { commands, dataSource } from '@/services'
import { uploadSpeciesPhoto } from '@/services/supabase/storage'
import type { MushroomSpecies } from '@/types'

/**
 * Species photo: shows the current picture (or a camera button) and uploads a
 * new one straight from the dashboard. Stored in Supabase Storage.
 */
export function SpeciesPhotoButton({ species, canEdit }: { species: MushroomSpecies; canEdit: boolean }) {
  const { t } = useI18n()
  const { farm } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState(() => speciesImageUrl(species))

  const pick = () => {
    setError(null)
    inputRef.current?.click()
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      // Demo mode has no storage backend: preview for this session only.
      const url = dataSource === 'demo' ? URL.createObjectURL(file) : await uploadSpeciesPhoto(farm.id, species.id, file)
      if (dataSource !== 'demo') await commands.saveSpecies(farm.id, { ...species, imageKey: url })
      setPhoto(url)
    } catch {
      setError(t('pages.settings.species.photo.error'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={t('pages.settings.species.photo.upload', { name: species.name })}
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {photo ? (
        <img src={photo} alt="" className="size-10 rounded-lg border border-border object-cover" loading="lazy" onError={() => setPhoto(null)} />
      ) : (
        <span aria-hidden className="grid size-10 place-items-center rounded-lg border border-dashed border-border text-text-muted">
          <Camera className="size-4" />
        </span>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="rounded-lg px-2 py-1 text-xs font-medium text-brand hover:underline disabled:opacity-50"
        >
          {uploading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : t('pages.settings.species.photo.change')}
        </button>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  )
}
