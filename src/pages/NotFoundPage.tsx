import { LinkButton } from '@/components/ui/Button'
import { useI18n } from '@/i18n'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[1600px] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-5xl font-semibold text-text">404</p>
      <h1 className="mt-3 text-lg font-semibold text-text">{t('notFound.title')}</h1>
      <p className="mt-1 text-sm text-text-muted">{t('notFound.description')}</p>
      <LinkButton to="/" variant="primary" className="mt-6">
        {t('notFound.back')}
      </LinkButton>
    </div>
  )
}
