import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { alertIcons, severityIconClass } from '@/config/alerts'
import { ROUTES } from '@/config/navigation'
import { useSession } from '@/context/session'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { activityService } from '@/services'

export function NotificationsMenu() {
  const { t } = useI18n()
  const fmt = useFormat()
  const navigate = useNavigate()
  const { selectedLocation } = useSession()
  const alerts = useAsync(() => activityService.getAlerts(selectedLocation), [selectedLocation], ['alerts', 'cameras', 'spaces', 'settings'])
  const items = alerts.data ?? []
  const count = items.length

  return (
    <Popover
      label={t('topbar.notifications')}
      // On phones the bell sits mid-header, so pin the panel to the screen edges instead.
      panelClassName="w-[22rem] max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:w-auto"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={count ? `${t('topbar.notifications')} (${t('topbar.notificationsUnread', { count })})` : t('topbar.notifications')}
          className="relative inline-flex size-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
        >
          <Bell aria-hidden className="size-[1.125rem]" strokeWidth={1.9} />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-occupied px-1 text-[0.625rem] font-bold leading-4 text-white ring-2 ring-bg"
            >
              {count}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center justify-between px-3 pb-2 pt-2">
            <p className="text-sm font-semibold text-text">{t('topbar.notifications')}</p>
            {count > 0 && <span className="text-xs text-text-muted">{t('topbar.notificationsUnread', { count })}</span>}
          </div>
          {count === 0 ? (
            <p className="px-3 pb-3 text-sm text-text-muted">{t('topbar.noNotifications')}</p>
          ) : (
            <div className="scrollbar-thin max-h-80 overflow-y-auto">
              {items.map((alert) => {
                const Icon = alertIcons[alert.type]
                const params = { ...alert.params, amount: alert.params.amount !== undefined ? fmt.currency(alert.params.amount) : undefined }
                return (
                  <MenuItem
                    key={alert.id}
                    className="items-start"
                    onSelect={() => {
                      close()
                      navigate(`${ROUTES.dashboard}#attention`)
                    }}
                  >
                    <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl', severityIconClass[alert.severity])}>
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{t(`dashboard.alerts.types.${alert.type}.title`, params)}</span>
                      <span className="block text-xs text-text-muted">{fmt.relative(alert.createdAt)}</span>
                    </span>
                  </MenuItem>
                )
              })}
            </div>
          )}
          <div className="mt-1 border-t border-border pt-1">
            <MenuItem
              className="justify-center text-xs font-semibold text-brand-ink"
              onSelect={() => {
                close()
                navigate(`${ROUTES.dashboard}#attention`)
              }}
            >
              {t('topbar.viewAllAlerts')}
            </MenuItem>
          </div>
        </>
      )}
    </Popover>
  )
}
