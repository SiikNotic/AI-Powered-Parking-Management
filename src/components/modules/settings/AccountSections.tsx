import { Database, LogOut, RotateCcw, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useSession } from '@/context/session'
import { useTheme, type Theme } from '@/context/theme'
import { useToast } from '@/context/toast'
import { useCommand } from '@/hooks/useCommand'
import { locales, useI18n, type Locale } from '@/i18n'
import { dataSource, DEFAULT_LAYOUT, isDemoData, preferencesService } from '@/services'

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{label}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function PreferencesSection() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const { user } = useSession()
  const toast = useToast()

  const resetLayout = () => {
    preferencesService.saveDashboardLayout(
      user.id,
      DEFAULT_LAYOUT.map((id) => ({ id, visible: true })),
    )
    toast.show(t('pages.settings.preferences.resetDone'))
  }

  return (
    <Card labelledBy="settings-preferences">
      <CardHeader id="settings-preferences" title={t('pages.settings.preferences.title')} subtitle={t('pages.settings.preferences.subtitle')} />
      <div className="max-w-2xl">
        <Row label={t('pages.settings.preferences.theme')}>
          <SegmentedControl<Theme>
            label={t('pages.settings.preferences.theme')}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: t('topbar.theme.light') },
              { value: 'dark', label: t('topbar.theme.dark') },
            ]}
          />
        </Row>
        <Row label={t('pages.settings.preferences.language')}>
          <SegmentedControl<Locale>
            label={t('pages.settings.preferences.language')}
            value={locale}
            onChange={setLocale}
            options={(Object.keys(locales) as Locale[]).map((l) => ({ value: l, label: locales[l].label }))}
          />
        </Row>
        <Row label={t('pages.settings.preferences.dashboard')} hint={t('pages.settings.preferences.dashboardHint')}>
          <Button size="sm" onClick={resetLayout}>
            <RotateCcw aria-hidden className="size-3.5" />
            {t('pages.settings.preferences.resetDashboard')}
          </Button>
        </Row>
      </div>
    </Card>
  )
}

export function SampleDataSection({ isEmpty, canLoad }: { isEmpty: boolean; canLoad: boolean }) {
  const { t } = useI18n()
  const load = useCommand('loadDemoData')
  const [confirming, setConfirming] = useState(false)

  const confirm = async () => {
    const result = await load.run([], t('pages.settings.sample.loaded'))
    if (result.ok) setConfirming(false)
  }

  return (
    <Card labelledBy="settings-sample">
      <CardHeader id="settings-sample" title={t('pages.settings.sample.title')} subtitle={t('pages.settings.sample.subtitle')} icon={<Sparkles aria-hidden className="size-4" />} />
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-text-secondary">{t('pages.settings.sample.description')}</p>
        {!isEmpty ? (
          <p className="tile rounded-xl px-3 py-2 text-xs text-text-secondary">{t('pages.settings.sample.notEmpty')}</p>
        ) : !canLoad ? (
          <p className="tile rounded-xl px-3 py-2 text-xs text-text-secondary">{t('pages.settings.sample.ownerOnly')}</p>
        ) : (
          <Button variant="primary" onClick={() => setConfirming(true)}>
            <Sparkles aria-hidden className="size-4" />
            {t('pages.settings.sample.load')}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title={t('pages.settings.sample.confirmTitle')}
        description={t('pages.settings.sample.confirmDescription')}
        confirmLabel={load.pending ? t('form.saving') : t('pages.settings.sample.load')}
        pending={load.pending}
        onConfirm={confirm}
        onClose={() => setConfirming(false)}
      />
    </Card>
  )
}

export function AccountSection() {
  const { t } = useI18n()
  const { user, signOut } = useSession()
  const items: [string, ReactNode][] = [
    [t('pages.settings.account.name'), user.name],
    [t('pages.settings.account.email'), user.email],
    [t('pages.settings.account.role'), <Badge key="role" tone="brand">{t(`roles.${user.role}`)}</Badge>],
    [
      t('pages.settings.account.dataSource'),
      <span key="source" className="inline-flex items-center gap-1.5">
        <Database aria-hidden className="size-3.5 text-text-muted" />
        {t(`pages.settings.account.sources.${dataSource}`)}
      </span>,
    ],
  ]
  return (
    <Card labelledBy="settings-account">
      <CardHeader id="settings-account" title={t('pages.settings.account.title')} subtitle={t('pages.settings.account.subtitle')} />
      <dl className="max-w-2xl">
        {items.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-xs font-semibold text-text-secondary">{label}</dt>
            <dd className="min-w-0 break-words text-sm text-text">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        {isDemoData ? (
          <p className="text-xs text-text-muted">{t('pages.settings.account.demoSignOut')}</p>
        ) : (
          <Button onClick={signOut}>
            <LogOut aria-hidden className="size-4" />
            {t('pages.settings.account.signOut')}
          </Button>
        )}
      </div>
    </Card>
  )
}
