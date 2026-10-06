import { AlertTriangle, Copy, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/context/toast'
import { useCommand } from '@/hooks/useCommand'
import { useI18n } from '@/i18n'
import type { FarmData } from '@/services/shared/records'

const MIN_TOKEN = 24

/** 48 hex characters from the browser's CSPRNG. */
function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function RegisterSensorForm({ data, roomId, onClose }: { data: FarmData; roomId?: string; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const register = useCommand('registerSensor')
  const rooms = data.rooms
  const [form, setForm] = useState({ roomId: roomId ?? rooms[0]?.id ?? '', provider: '', externalId: '', token: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState<{ provider: string; externalId: string; token: string } | null>(null)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const provider = form.provider.trim().toLowerCase()
    const externalId = form.externalId.trim()
    const token = form.token.trim()
    const next: Record<string, string> = {}
    if (!form.roomId) next.roomId = t('pages.environment.register.errors.room')
    if (!provider) next.provider = t('pages.environment.register.errors.provider')
    if (!externalId) next.externalId = t('pages.environment.register.errors.externalId')
    else if (data.sensors.some((s) => s.provider === provider && s.externalId === externalId)) next.externalId = t('pages.environment.register.errors.duplicate')
    if (token.length < MIN_TOKEN) next.token = t('pages.environment.register.errors.token')
    setErrors(next)
    if (Object.keys(next).length) return
    const result = await register.run([{ roomId: form.roomId, provider, externalId, token }], t('pages.environment.register.saved'))
    if (result.ok) setDone({ provider, externalId, token })
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.show(t('pages.environment.register.done.copied'))
    } catch {
      toast.show(t('pages.environment.register.done.copyFailed'), 'error')
    }
  }

  if (done) {
    const base = import.meta.env.VITE_SUPABASE_URL ?? 'https://<project>.supabase.co'
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '<anon-key>'
    const endpoint = `${base.replace(/\/$/, '')}/rest/v1/rpc/ingest_reading`
    const body = JSON.stringify({ p_provider: done.provider, p_external_id: done.externalId, p_token: done.token, p_temperature: 64.5, p_humidity: 88, p_co2: 820 }, null, 2)
    const curl = `curl -X POST '${endpoint}' \\\n  -H 'apikey: ${key}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(JSON.parse(body))}'`
    return (
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={t('pages.environment.register.done.title')}
        footer={
          <Button variant="primary" onClick={onClose}>
            {t('common.done')}
          </Button>
        }
      >
        <div className="space-y-5">
          <p role="alert" className="flex gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[0.8125rem] font-medium text-warn-ink">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('pages.environment.register.done.warning')}
          </p>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-text-secondary">{t('pages.environment.register.done.token')}</p>
            <div className="flex items-stretch gap-2">
              <code className="tile min-w-0 flex-1 rounded-xl px-3 py-2 font-mono text-xs break-all text-text select-all">{done.token}</code>
              <Button variant="secondary" size="sm" className="h-auto" onClick={() => void copy(done.token)}>
                <Copy aria-hidden className="size-3.5" />
                {t('pages.environment.register.done.copy')}
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-text-secondary">{t('pages.environment.register.done.endpoint')}</p>
            <p className="mb-2 text-xs text-text-muted">{t('pages.environment.register.done.instructions')}</p>
            <pre className="tile overflow-x-auto rounded-xl px-3 py-2 font-mono text-[0.6875rem] leading-relaxed text-text">
              <code>{`POST ${endpoint}\napikey: ${key}\nContent-Type: application/json\n\n${body}`}</code>
            </pre>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => void copy(curl)}>
              <Copy aria-hidden className="size-3.5" />
              {t('pages.environment.register.done.copy')} curl
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('pages.environment.register.title')}
      description={t('pages.environment.register.description')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="sensor-form" disabled={register.pending}>
            {register.pending ? t('form.saving') : t('pages.environment.register.title')}
          </Button>
        </>
      }
    >
      <form id="sensor-form" onSubmit={submit} noValidate className="space-y-4">
        <FormGrid>
          <Field label={t('pages.environment.register.room')} error={errors.roomId}>
            {(p) => (
              <Select {...p} value={form.roomId} onChange={(e) => set('roomId', e.target.value)}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.environment.register.provider')} hint={t('pages.environment.register.providerHint')} error={errors.provider}>
            {(p) => <TextInput {...p} autoComplete="off" value={form.provider} onChange={(e) => set('provider', e.target.value)} />}
          </Field>
          <Field label={t('pages.environment.register.externalId')} hint={t('pages.environment.register.externalIdHint')} error={errors.externalId} className="sm:col-span-2">
            {(p) => <TextInput {...p} autoComplete="off" value={form.externalId} onChange={(e) => set('externalId', e.target.value)} />}
          </Field>
        </FormGrid>
        <Field label={t('pages.environment.register.token')} hint={t('pages.environment.register.tokenHint')} error={errors.token}>
          {(p) => (
            <div className="flex flex-col gap-2 sm:flex-row">
              <TextInput {...p} autoComplete="off" spellCheck={false} className="font-mono text-xs" value={form.token} onChange={(e) => set('token', e.target.value)} />
              <Button variant="secondary" className="shrink-0" onClick={() => set('token', generateToken())}>
                <KeyRound aria-hidden className="size-4" />
                {t('pages.environment.register.generate')}
              </Button>
            </div>
          )}
        </Field>
      </form>
    </Modal>
  )
}
