import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { LinkButton } from '@/components/ui/Button'
import { PageShell } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/States'
import { useSession } from '@/context/session'
import type { Permission } from '@/domain/permissions'
import { useI18n } from '@/i18n'

/** Shows a page only to roles allowed to see it (the database enforces the same with RLS). */
export function RequirePermission({ permission, children }: { permission?: Permission; children: ReactNode }) {
  const { t } = useI18n()
  const { can, user } = useSession()
  if (!permission || can(permission)) return children
  return (
    <PageShell>
      <EmptyState
        icon={Lock}
        title={t('access.title')}
        description={t('access.description', { role: t(`roles.${user.role}`) })}
        action={
          <LinkButton to="/" variant="primary">
            {t('notFound.back')}
          </LinkButton>
        }
        className="panel rounded-card py-16"
      />
    </PageShell>
  )
}
