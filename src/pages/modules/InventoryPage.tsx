import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { useI18n } from '@/i18n'

export function InventoryPage() {
  const { t } = useI18n()
  return (
    <PageShell>
      <PageHeader title={t('pages.inventory.title')} />
    </PageShell>
  )
}
