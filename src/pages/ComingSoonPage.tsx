import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { allNavItems, ROUTES, type NavKey } from '@/config/navigation'
import { useI18n } from '@/i18n'

/** Professional placeholder for sections planned in later phases. */
export function ComingSoonPage({ page }: { page: Exclude<NavKey, 'dashboard'> }) {
  const { t } = useI18n()
  const item = allNavItems.find((i) => i.key === page)
  const Icon = item?.icon
  const name = t(`nav.${page}`)

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex min-h-[60vh] flex-col items-center justify-center rounded-card border border-border bg-surface px-6 py-16 text-center shadow-card animate-fade-in">
        {Icon && (
          <span className="mb-6 flex size-16 items-center justify-center rounded-3xl bg-surface-sunken text-text">
            <Icon aria-hidden className="size-7" strokeWidth={1.6} />
          </span>
        )}
        <Badge tone="brand">{t('comingSoon.badge')}</Badge>
        <h2 className="mt-4 max-w-xl font-display text-2xl font-semibold uppercase tracking-[0.02em] text-text sm:text-3xl">
          {t('comingSoon.title', { page: name })}
        </h2>
        <p className="mt-3 max-w-md text-sm text-text-secondary">{t(`comingSoon.descriptions.${page}`)}</p>
        <p className="mt-2 max-w-md text-sm text-text-muted">{t('comingSoon.description')}</p>
        <LinkButton to={ROUTES.dashboard} variant="primary" className="mt-8">
          <ArrowLeft aria-hidden className="size-4" />
          {t('comingSoon.back')}
        </LinkButton>
      </section>
    </div>
  )
}
