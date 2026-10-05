import { MapPinPlus } from 'lucide-react'
import { AlertCard } from '@/components/dashboard/AlertCard'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { OccupancySection } from '@/components/dashboard/OccupancySection'
import { ParkingStatus } from '@/components/dashboard/ParkingStatus'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { ReservationTable } from '@/components/dashboard/ReservationTable'
import { RevenueCard } from '@/components/dashboard/RevenueCard'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { ROUTES } from '@/config/navigation'
import { useSession } from '@/context/session'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useI18n } from '@/i18n'

export function DashboardPage() {
  const { t } = useI18n()
  const { selectedLocation, locations, activeLocation } = useSession()
  const data = useDashboardData(selectedLocation)
  const locationList = locations.data ?? []
  const scoped = activeLocation ? [activeLocation] : locationList

  if (locations.status === 'error') {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <ErrorState onRetry={locations.retry} className="rounded-card border border-border bg-surface" />
      </div>
    )
  }

  if (locations.status === 'success' && locationList.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={MapPinPlus}
          title={t('states.noLocationsTitle')}
          description={t('states.noLocationsDescription')}
          className="rounded-card border border-border bg-surface py-20"
          action={
            <LinkButton to={ROUTES.parkingLocations} variant="signature">
              {t('dashboard.quickActions.addLocation')}
            </LinkButton>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
      <KpiGrid
        stats={data.stats}
        revenue={data.revenue}
        locationCount={scoped.length}
        locationLabel={activeLocation ? `${activeLocation.city}, ${activeLocation.state}` : undefined}
      />

      <QuickActions className="order-last xl:order-none" />

      {/* Main grid: wide column (8) + side column (4) on desktop; single column below. */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-12">
        <OccupancySection location={selectedLocation} className="order-2 min-w-0 xl:order-none xl:col-span-8" />
        <AlertCard alerts={data.alerts} locations={locationList} className="order-1 min-w-0 xl:order-none xl:col-span-4" />

        <ParkingStatus spaces={data.spaces} locations={scoped} className="order-3 min-w-0 xl:order-none xl:col-span-8" />
        <RecentActivity
          activity={data.activity}
          locations={locationList}
          showLocation={!activeLocation}
          className="order-4 min-w-0 xl:order-none xl:col-span-4"
        />

        <ReservationTable reservations={data.reservations} className="order-5 min-w-0 xl:order-none xl:col-span-8" />
        <RevenueCard revenue={data.revenue} className="order-6 min-w-0 xl:order-none xl:col-span-4" />
      </div>
    </div>
  )
}
