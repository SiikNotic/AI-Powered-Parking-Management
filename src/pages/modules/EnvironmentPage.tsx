import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { useI18n } from '@/i18n'

export function EnvironmentPage() {
  const { t } = useI18n()
  return (
    <PageShell>
      <PageHeader title={t('pages.environment.title')} />
    </PageShell>
  )
}
