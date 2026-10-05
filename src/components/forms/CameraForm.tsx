import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { useI18n } from '@/i18n'
import type { Camera, CameraInput, CameraStatus, ParkingLocation } from '@/types'

const RESOLUTIONS: Camera['resolution'][] = ['720p', '1080p', '4K']
const STATUSES: CameraStatus[] = ['online', 'offline', 'maintenance']

interface CameraFormProps {
  camera?: Camera
  locations: ParkingLocation[]
  defaultLocationId?: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: CameraInput) => void
}

export function CameraForm({ camera, locations, defaultLocationId, pending, onClose, onSubmit }: CameraFormProps) {
  const { t } = useI18n()
  const [values, setValues] = useState<CameraInput>({
    locationId: camera?.locationId ?? defaultLocationId ?? locations[0]?.id ?? '',
    name: camera?.name ?? '',
    coverage: camera?.coverage ?? '',
    resolution: camera?.resolution ?? '1080p',
    status: camera?.status ?? 'online',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CameraInput, string>>>({})
  const set = <K extends keyof CameraInput>(key: K, value: CameraInput[K]) => setValues((v) => ({ ...v, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!values.name.trim()) next.name = t('errors.required')
    if (!values.coverage.trim()) next.coverage = t('errors.required')
    if (!values.locationId) next.locationId = t('errors.required')
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit({ ...values, name: values.name.trim(), coverage: values.coverage.trim() })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={camera ? t('camerasPage.edit') : t('camerasPage.add')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="camera-form" disabled={pending}>
            {pending ? t('common.saving') : camera ? t('common.saveChanges') : t('camerasPage.add')}
          </Button>
        </>
      }
    >
      <form id="camera-form" onSubmit={submit} noValidate className="grid gap-4">
        <Field label={t('common.location')} error={errors.locationId}>
          {(p) => (
            <SelectInput {...p} value={values.locationId} onChange={(e) => set('locationId', e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t('camerasPage.form.name')} error={errors.name}>
          {(p) => <TextInput {...p} value={values.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label={t('camerasPage.form.coverage')} hint={t('camerasPage.form.coverageHint')} error={errors.coverage}>
          {(p) => <TextInput {...p} value={values.coverage} onChange={(e) => set('coverage', e.target.value)} />}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('camerasPage.form.resolution')}>
            {(p) => (
              <SelectInput {...p} value={values.resolution} onChange={(e) => set('resolution', e.target.value as Camera['resolution'])}>
                {RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t('camerasPage.form.status')}>
            {(p) => (
              <SelectInput {...p} value={values.status} onChange={(e) => set('status', e.target.value as CameraStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`camerasPage.status.${s}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>
      </form>
    </Modal>
  )
}
