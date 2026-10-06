import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { useCommand } from '@/hooks/useCommand'
import { useI18n } from '@/i18n'
import type { Farm } from '@/types'

function timeZones(current: string): string[] {
  const list = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return [...new Set([current, 'UTC', ...list].filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function FarmProfileSection({ farm, canEdit }: { farm: Farm; canEdit: boolean }) {
  const { t } = useI18n()
  const save = useCommand('saveFarm')
  const [form, setForm] = useState({ name: farm.name, location: farm.location, timezone: farm.timezone || 'UTC' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const zones = useMemo(() => timeZones(farm.timezone), [farm.timezone])
  const dirty = form.name !== farm.name || form.location !== farm.location || form.timezone !== farm.timezone

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = t('pages.settings.profile.errors.name')
    if (!form.timezone) next.timezone = t('pages.settings.profile.errors.timezone')
    setErrors(next)
    if (Object.keys(next).length) return
    await save.run([{ name: form.name.trim(), location: form.location.trim(), timezone: form.timezone }], t('pages.settings.profile.saved'))
  }

  return (
    <Card labelledBy="settings-profile">
      <CardHeader id="settings-profile" title={t('pages.settings.profile.title')} subtitle={t('pages.settings.profile.subtitle')} />
      {!canEdit && <p className="tile mb-4 rounded-xl px-3 py-2 text-xs text-text-secondary">{t('pages.settings.profile.ownerOnly')}</p>}
      <form onSubmit={submit} noValidate className="max-w-2xl space-y-4">
        <FormGrid>
          <Field label={t('pages.settings.profile.name')} error={errors.name}>
            {(p) => <TextInput {...p} value={form.name} disabled={!canEdit} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />}
          </Field>
          <Field label={t('pages.settings.profile.location')} hint={t('pages.settings.profile.locationHint')} optional>
            {(p) => <TextInput {...p} value={form.location} disabled={!canEdit} maxLength={160} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />}
          </Field>
          <Field label={t('pages.settings.profile.timezone')} hint={t('pages.settings.profile.timezoneHint')} error={errors.timezone}>
            {(p) => (
              <Select {...p} value={form.timezone} disabled={!canEdit} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </FormGrid>
        {canEdit && (
          <div className="flex justify-end">
            <Button variant="primary" type="submit" disabled={save.pending || !dirty}>
              {save.pending ? t('form.saving') : t('form.save')}
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}
