import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { useI18n } from '@/i18n'

export function SettingsPage() {
  const { t } = useI18n()
  return (
    <PageShell>
      <PageHeader title={t('pages.settings.title')} />
    </PageShell>
  )
}
