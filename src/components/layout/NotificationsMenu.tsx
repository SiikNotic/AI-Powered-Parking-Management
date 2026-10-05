import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { alertIcons, severityIconClass } from '@/config/alerts'
import { useSession } from '@/context/session'
import { useAlertText } from '@/hooks/useAlertText'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { alertService } from '@/services'

/** New alerts for the selected farm; updates when alerts change (pushed). */
export function NotificationsMenu() {
  const { t } = useI18n()
  const fmt = useFormat()
  const text = useAlertText()
  const navigate = useNavigate()
  const { farm } = useSession()
  const alerts = useAsync(() => alertService.list(farm.id), [farm.id], ['alerts'])
  const items = (alerts.data ?? []).filter((a) => a.status === 'NEW')
  const count = items.length

  const openAlerts = (close: () => void) => {
    close()
    navigate('/#alerts')
  }

  return (
    <Popover
      label={t('topbar.notifications')}
      // On phones the bell sits mid-header, so pin the panel to the screen edges instead.
      panelClassName="w-[23rem] max-sm:fixed max-sm:inset-x-3 max-sm:top-16 max-sm:w-auto"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={count ? `${t('topbar.notifications')} (${t('topbar.unread', { count })})` : t('topbar.notifications')}
          className="relative inline-flex size-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
        >
          <Bell aria-hidden className="size-[1.125rem]" strokeWidth={1.9} />
          {count > 0 && (
            <span aria-hidden className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-crit px-1 text-[0.625rem] font-bold leading-4 text-white ring-2 ring-bg">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center justify-between px-3 pb-2 pt-2">
            <p className="text-sm font-semibold text-text">{t('topbar.notifications')}</p>
            {count > 0 && <span className="text-xs text-text-muted">{t('topbar.unread', { count })}</span>}
          </div>
          {count === 0 ? (
            <p className="px-3 pb-3 text-sm text-text-muted">{t('topbar.noNotifications')}</p>
          ) : (
            <div className="scrollbar-thin max-h-80 overflow-y-auto">
              {items.slice(0, 20).map((alert) => {
                const Icon = alertIcons[alert.type]
                return (
                  <MenuItem key={alert.id} className="items-start" onSelect={() => openAlerts(close)}>
                    <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', severityIconClass[alert.severity])}>
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">{text(alert).title}</span>
                      <span className="block truncate text-xs text-text-muted">
                        {alert.location} · {fmt.relative(alert.createdAt)}
                      </span>
                    </span>
                  </MenuItem>
                )
              })}
            </div>
          )}
          <div className="mt-1 border-t border-border pt-1">
            <MenuItem className="justify-center text-xs font-semibold text-brand-ink" onSelect={() => openAlerts(close)}>
              {t('topbar.viewAllAlerts')}
            </MenuItem>
          </div>
        </>
      )}
    </Popover>
  )
}
