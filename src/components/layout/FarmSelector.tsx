import { Check, ChevronsUpDown, Warehouse } from 'lucide-react'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { useSession } from '@/context/session'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

/** Switches between the farms the user is a member of. */
export function FarmSelector({ className }: { className?: string }) {
  const { t } = useI18n()
  const { farm, farms, setFarmId } = useSession()

  return (
    <Popover
      label={t('topbar.farm')}
      align="start"
      className={className}
      panelClassName="w-72"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`${t('topbar.farm')}: ${farm.name}`}
          className="flex h-10 w-full min-w-0 items-center gap-2.5 tile rounded-xl px-2.5 text-left transition-colors hover:border-border-strong"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
            <Warehouse aria-hidden className="size-4" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[0.8125rem] font-semibold text-text">{farm.name}</span>
            <span className="block truncate text-[0.6875rem] text-text-muted">{farm.location}</span>
          </span>
          <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-text-muted" />
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="eyebrow px-3 pb-1 pt-1.5">{t('topbar.yourFarms', { count: farms.length })}</p>
          {farms.map((f) => (
            <MenuItem
              key={f.id}
              checked={f.id === farm.id}
              onSelect={() => {
                setFarmId(f.id)
                close()
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{f.name}</span>
                <span className="block truncate text-xs text-text-muted">{f.location}</span>
              </span>
              <Check aria-hidden className={cn('size-4 text-brand', f.id !== farm.id && 'invisible')} />
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  )
}
