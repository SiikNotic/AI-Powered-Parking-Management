import { useSearchParams } from 'react-router-dom'
import { AccountSection, PreferencesSection, SampleDataSection } from '@/components/modules/settings/AccountSections'
import { FarmProfileSection } from '@/components/modules/settings/FarmProfileSection'
import { RoomsSection } from '@/components/modules/settings/RoomsSection'
import { SpeciesSection } from '@/components/modules/settings/SpeciesSection'
import { Select } from '@/components/ui/Form'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import { useFarmData } from '@/hooks/useFarmData'
import { useI18n } from '@/i18n'

const TABS = ['profile', 'species', 'rooms', 'preferences', 'sample', 'account'] as const
type Tab = (typeof TABS)[number]
/** Tabs that need the farm's records; the others render without waiting for data. */
const DATA_TABS: Tab[] = ['profile', 'species', 'rooms', 'sample']

export function SettingsPage() {
  const { t } = useI18n()
  const { user } = useSession()
  const { data, status, retry } = useFarmData()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const tab: Tab = TABS.find((x) => x === requested) ?? 'profile'
  const setTab = (next: Tab) => setParams(next === 'profile' ? {} : { tab: next }, { replace: true })
  const options = TABS.map((x) => ({ value: x, label: t(`pages.settings.tabs.${x}`) }))

  // Writers per table, same as the database policies.
  const isOwner = user.role === 'OWNER'
  const canEditSpecies = ['OWNER', 'FARM_MANAGER', 'GROWER'].includes(user.role)
  const canEditRooms = ['OWNER', 'FARM_MANAGER'].includes(user.role)

  const needsData = DATA_TABS.includes(tab)

  return (
    <PageShell>
      <PageHeader title={t('pages.settings.title')} description={t('pages.settings.subtitle')} />
      <div className="hidden md:block">
        <SegmentedControl label={t('pages.settings.section')} options={options} value={tab} onChange={setTab} />
      </div>
      <div className="md:hidden">
        <Select aria-label={t('pages.settings.section')} value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      {needsData && status === 'error' && !data ? (
        <ErrorState onRetry={retry} />
      ) : needsData && !data ? (
        <Skeleton className="h-80 rounded-card" />
      ) : (
        <>
          {tab === 'profile' && data && <FarmProfileSection key={data.farm.id} farm={data.farm} canEdit={isOwner} />}
          {tab === 'species' && data && <SpeciesSection species={data.species} canEdit={canEditSpecies} />}
          {tab === 'rooms' && data && <RoomsSection rooms={data.rooms} canEdit={canEditRooms} />}
          {tab === 'preferences' && <PreferencesSection />}
          {tab === 'sample' && data && <SampleDataSection isEmpty={!data.batches.length && !data.products.length} canLoad={isOwner} />}
          {tab === 'account' && <AccountSection />}
        </>
      )}
    </PageShell>
  )
}
