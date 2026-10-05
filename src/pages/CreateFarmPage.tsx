import { Warehouse } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { useErrorMessage } from '@/hooks/useMutation'
import { useI18n } from '@/i18n'
import { authService } from '@/services'

const inputClass =
  'h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text placeholder:text-text-muted transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

/** First run: the signed-in user has no farm yet, so they create one and become its owner. */
export function CreateFarmPage({ name }: { name: string }) {
  const { t } = useI18n()
  const message = useErrorMessage()
  const [farm, setFarm] = useState('')
  const [location, setLocation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await authService.createFarm(farm.trim(), location.trim())
    } catch (err) {
      setError(message(err))
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md rounded-card p-6 sm:p-7">
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
          <Warehouse aria-hidden className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.01em] text-text">{t('onboarding.title', { name: name.split(' ')[0] })}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t('onboarding.description')}</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-secondary">{t('onboarding.farmName')}</span>
            <input required value={farm} onChange={(e) => setFarm(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-secondary">{t('onboarding.location')}</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-crit-soft px-3 py-2 text-xs font-medium text-crit-ink">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={pending} className="h-11 w-full">
            {pending ? t('states.loading') : t('onboarding.create')}
          </Button>
        </form>
        <button type="button" onClick={() => void authService.signOut()} className="mt-4 w-full text-center text-xs font-semibold text-text-muted hover:text-text">
          {t('auth.signOut')}
        </button>
      </div>
    </main>
  )
}
