import { ArrowLeft, Construction } from 'lucide-react'
import { LinkButton } from '@/components/ui/Button'
import { MODULES, type ModuleId } from '@/config/navigation'
import { useI18n } from '@/i18n'

/** Placeholder for modules planned after the dashboard. Routes already exist so KPIs and search can link to them. */
export function ComingSoonPage({ module }: { module: ModuleId }) {
  const { t } = useI18n()
  const def = MODULES[module]
  const Icon = def.icon
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
        <Icon aria-hidden className="size-6" strokeWidth={1.8} />
      </span>
      <p className="eyebrow mt-5 flex items-center gap-1.5">
        <Construction aria-hidden className="size-3.5" />
        {t('comingSoon.phase', { phase: def.phase ?? 0 })}
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-text">{t(`modules.${module}.name`)}</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t(`modules.${module}.description`)}</p>
      <p className="mt-3 text-xs text-text-muted">{t('comingSoon.note')}</p>
      <LinkButton to="/" variant="primary" className="mt-6">
        <ArrowLeft aria-hidden className="size-4" />
        {t('comingSoon.back')}
      </LinkButton>
    </div>
  )
}
