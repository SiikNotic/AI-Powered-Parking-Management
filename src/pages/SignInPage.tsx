import { useState, type FormEvent } from 'react'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { useErrorMessage } from '@/hooks/useMutation'
import { useI18n } from '@/i18n'
import { authService } from '@/services'

const inputClass =
  'h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-text placeholder:text-text-muted transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

/** Email + password sign-in and sign-up (Supabase Auth). */
export function SignInPage() {
  const { t } = useI18n()
  const message = useErrorMessage()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signIn') await authService.signIn(email.trim(), password)
      else if (await authService.signUp(email.trim(), password, name.trim())) setNotice(t('auth.checkEmail'))
    } catch (err) {
      setError(mode === 'signIn' ? t('auth.invalid') : message(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-sm rounded-card p-6 sm:p-7">
        <LogoMark className="size-11" />
        <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.01em] text-text">{mode === 'signIn' ? t('auth.signInTitle') : t('auth.signUpTitle')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('app.name')}</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === 'signUp' && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-text-secondary">{t('auth.name')}</span>
              <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-secondary">{t('auth.email')}</span>
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-secondary">{t('auth.password')}</span>
            <input
              required
              type="password"
              minLength={mode === 'signUp' ? 8 : undefined}
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-crit-soft px-3 py-2 text-xs font-medium text-crit-ink">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg bg-ok-soft px-3 py-2 text-xs font-medium text-ok-ink">
              {notice}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={pending} className="h-11 w-full">
            {pending ? t('states.loading') : mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn')
            setError(null)
            setNotice(null)
          }}
          className="mt-4 w-full rounded-lg py-1 text-center text-xs font-semibold text-brand-ink hover:underline"
        >
          {mode === 'signIn' ? t('auth.toSignUp') : t('auth.toSignIn')}
        </button>
      </div>
    </main>
  )
}
