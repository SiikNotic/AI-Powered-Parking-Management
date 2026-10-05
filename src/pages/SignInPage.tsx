import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { useSession } from '@/context/session'
import { useI18n } from '@/i18n'
import { authService } from '@/services'

/** Shown after sign-out. Demo mode signs back in as the sample manager. */
export function SignInPage() {
  const { t } = useI18n()
  const { manager } = useSession()
  const [pending, setPending] = useState(false)
  const name = manager ? `${manager.firstName} ${manager.lastName}` : ''

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="glass w-full max-w-sm rounded-[1.75rem] p-7 text-center animate-fade-in" aria-labelledby="sign-in-title">
        <LogoMark className="mx-auto size-12" />
        <p className="mt-5 font-display text-sm font-bold uppercase tracking-[0.06em] text-text">{t('app.name')}</p>
        <h1 id="sign-in-title" className="mt-6 text-xl font-semibold text-text">
          {t('signIn.title')}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{t('signIn.subtitle')}</p>
        <Button
          variant="primary"
          className="mt-6 w-full"
          disabled={pending}
          onClick={async () => {
            setPending(true)
            await authService.signIn()
          }}
        >
          {pending ? t('common.working') : t('signIn.continueAs', { name })}
          <ArrowRight aria-hidden className="size-4" />
        </Button>
        <p className="mt-4 text-xs text-text-muted">{t('signIn.note')}</p>
      </section>
    </main>
  )
}
