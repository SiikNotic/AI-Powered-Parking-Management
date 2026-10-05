import { RotateCcw } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, SelectInput, TextInput, Toggle } from '@/components/ui/Form'
import { PageContainer, PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import { useTheme, type Theme } from '@/context/theme'
import { useToast } from '@/context/toast'
import { useAsync } from '@/hooks/useAsync'
import { useMutation } from '@/hooks/useMutation'
import { locales, useI18n, type Locale } from '@/i18n'
import { authService, settingsService } from '@/services'
import type { AppSettings, Manager, ManagerInput } from '@/types'

function Section({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <Card labelledBy={id} className="grid gap-5 lg:grid-cols-[16rem_1fr]">
      <div>
        <h2 id={id} className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-text">
          {title}
        </h2>
        <p className="mt-1 text-[0.8125rem] text-text-muted">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  )
}

function ProfileForm({ manager }: { manager: Manager }) {
  const { t } = useI18n()
  const [profile, setProfile] = useState<ManagerInput>({
    firstName: manager.firstName,
    lastName: manager.lastName,
    email: manager.email,
    organizationName: manager.organization.name,
  })
  const [profileError, setProfileError] = useState<string | null>(null)
  const saveProfile = useMutation((input: ManagerInput) => authService.updateManager(input))

  const submitProfile = (e: FormEvent) => {
    e.preventDefault()
    if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.organizationName.trim()) return setProfileError(t('errors.required'))
    if (!/^\S+@\S+\.\S+$/.test(profile.email)) return setProfileError(t('errors.invalidEmail'))
    setProfileError(null)
    void saveProfile.run([profile], t('toasts.saved'))
  }

  return (
    <form onSubmit={submitProfile} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label={t('settingsPage.firstName')}>
        {(p) => <TextInput {...p} value={profile.firstName} autoComplete="given-name" onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />}
      </Field>
      <Field label={t('settingsPage.lastName')}>
        {(p) => <TextInput {...p} value={profile.lastName} autoComplete="family-name" onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />}
      </Field>
      <Field label={t('settingsPage.email')}>
        {(p) => <TextInput {...p} type="email" value={profile.email} autoComplete="email" onChange={(e) => setProfile({ ...profile, email: e.target.value })} />}
      </Field>
      <Field label={t('settingsPage.organization')}>
        {(p) => <TextInput {...p} value={profile.organizationName} autoComplete="organization" onChange={(e) => setProfile({ ...profile, organizationName: e.target.value })} />}
      </Field>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <p className="text-xs font-medium text-occupied-ink">{profileError}</p>
        <Button variant="primary" type="submit" disabled={saveProfile.pending}>
          {saveProfile.pending ? t('common.saving') : t('common.saveChanges')}
        </Button>
      </div>
    </form>
  )
}

function AlertsForm({ settings }: { settings: AppSettings }) {
  const { t } = useI18n()
  const [prefs, setPrefs] = useState<AppSettings>(settings)
  const savePrefs = useMutation((patch: AppSettings) => settingsService.update(patch))
  return (
    <div className="grid gap-5">
      <Field label={t('settingsPage.threshold')} hint={t('settingsPage.thresholdHint')}>
        {(p) => (
          <div className="flex items-center gap-3">
            <input
              {...p}
              type="range"
              min={50}
              max={100}
              step={5}
              value={prefs.occupancyAlertThreshold}
              onChange={(e) => setPrefs({ ...prefs, occupancyAlertThreshold: Number(e.target.value) })}
              className="h-2 flex-1 cursor-pointer accent-[var(--brand)]"
            />
            <span className="tabular w-12 text-right font-display text-sm font-semibold text-text">{prefs.occupancyAlertThreshold}%</span>
          </div>
        )}
      </Field>
      <Toggle checked={prefs.emailAlerts} onChange={(v) => setPrefs({ ...prefs, emailAlerts: v })} label={t('settingsPage.emailAlerts')} />
      <Toggle checked={prefs.dailySummary} onChange={(v) => setPrefs({ ...prefs, dailySummary: v })} label={t('settingsPage.dailySummary')} />
      <div className="flex justify-end">
        <Button variant="primary" disabled={savePrefs.pending} onClick={() => savePrefs.run([prefs], t('toasts.saved'))}>
          {savePrefs.pending ? t('common.saving') : t('common.saveChanges')}
        </Button>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const { manager } = useSession()
  const settings = useAsync(() => settingsService.get(), [], ['settings'])

  const [confirmReset, setConfirmReset] = useState(false)

  const reset = useMutation(() => settingsService.resetDemoData())

  return (
    <PageContainer>
      <PageHeader description={t('settingsPage.description')} />

      <Section id="profile-title" title={t('settingsPage.profile')} hint={t('settingsPage.profileHint')}>
        {!manager ? <Skeleton className="h-40 w-full" /> : <ProfileForm key={JSON.stringify(manager)} manager={manager} />}
      </Section>

      <Section id="preferences-title" title={t('settingsPage.preferences')} hint={t('settingsPage.preferencesHint')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('topbar.language')}>
            {(p) => (
              <SelectInput {...p} value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
                {(Object.keys(locales) as Locale[]).map((code) => (
                  <option key={code} value={code} lang={code}>
                    {locales[code].label}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">{t('topbar.theme.label')}</span>
            <SegmentedControl<Theme>
              label={t('topbar.theme.label')}
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', label: t('topbar.theme.light') },
                { value: 'dark', label: t('topbar.theme.dark') },
              ]}
              className="self-start"
            />
          </div>
        </div>
      </Section>

      <Section id="alerts-title" title={t('settingsPage.alerts')} hint={t('settingsPage.alertsHint')}>
        {!settings.data ? <Skeleton className="h-32 w-full" /> : <AlertsForm key={JSON.stringify(settings.data)} settings={settings.data} />}
      </Section>

      <Section id="demo-title" title={t('settingsPage.demo')} hint={t('settingsPage.demoHint')}>
        <Button variant="secondary" onClick={() => setConfirmReset(true)}>
          <RotateCcw aria-hidden className="size-4" />
          {t('settingsPage.reset')}
        </Button>
      </Section>

      <ConfirmDialog
        open={confirmReset}
        title={t('settingsPage.resetTitle')}
        message={t('settingsPage.resetMessage')}
        confirmLabel={t('settingsPage.reset')}
        pending={reset.pending}
        onClose={() => setConfirmReset(false)}
        onConfirm={async () => {
          await reset.run([])
          setConfirmReset(false)
          toast.show(t('settingsPage.resetDone'))
        }}
      />
    </PageContainer>
  )
}
