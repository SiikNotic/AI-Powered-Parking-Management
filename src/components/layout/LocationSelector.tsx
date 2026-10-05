import { Check, ChevronDown, Layers, type LucideIcon } from 'lucide-react'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { Skeleton } from '@/components/ui/States'
import { categoryIcons } from '@/config/status'
import { useSession } from '@/context/session'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

export function LocationSelector({ className }: { className?: string }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const { locations, selectedLocation, setSelectedLocation, activeLocation } = useSession()

  if (!locations.data) return <Skeleton className={cn('h-10 w-56 rounded-full', className)} />

  const list = locations.data
  const totalSpaces = list.reduce((sum, l) => sum + l.totalSpaces, 0)
  const label = activeLocation?.name ?? t('location.all')
  const TriggerIcon = activeLocation ? categoryIcons[activeLocation.category] : Layers

  return (
    <Popover
      label={t('location.select')}
      align="end"
      className={className}
      panelClassName="w-[min(22rem,calc(100vw-2rem))]"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`${t('location.label')}: ${label}`}
          className="flex h-10 w-full items-center gap-2 glass rounded-full pl-3 pr-2.5 text-sm font-medium text-text shadow-sm transition-colors hover:border-border-strong md:w-auto md:max-w-64"
        >
          <TriggerIcon aria-hidden className="size-4 shrink-0 text-text-muted" />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-text-muted" />
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="eyebrow px-3 pb-1 pt-2">{t('location.label')}</p>
          {[
            {
              id: 'all' as const,
              name: t('location.all'),
              detail: t('location.allDescription', { count: list.length, spaces: fmt.number(totalSpaces) }),
              icon: Layers as LucideIcon,
            },
            ...list.map((l) => ({
              id: l.id,
              name: l.name,
              detail: `${t(`category.${l.category}`)} · ${l.city}, ${l.state} · ${t('location.spaces', { count: l.totalSpaces })}`,
              icon: categoryIcons[l.category],
            })),
          ].map((option) => {
            const checked = option.id === selectedLocation
            const OptionIcon = option.icon
            return (
              <MenuItem
                key={option.id}
                checked={checked}
                onSelect={() => {
                  setSelectedLocation(option.id)
                  close()
                }}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-text-secondary">
                  <OptionIcon aria-hidden className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{option.name}</span>
                  <span className="block truncate text-xs text-text-muted">{option.detail}</span>
                </span>
                <Check aria-hidden className={cn('size-4 shrink-0 text-brand', !checked && 'invisible')} />
              </MenuItem>
            )
          })}
        </>
      )}
    </Popover>
  )
}
