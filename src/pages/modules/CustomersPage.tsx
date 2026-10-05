import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { useI18n } from '@/i18n'

export function CustomersPage() {
  const { t } = useI18n()
  return (
    <PageShell>
      <PageHeader title={t('pages.customers.title')} />
    </PageShell>
  )
}
