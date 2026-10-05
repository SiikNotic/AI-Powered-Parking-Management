import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { MenuItem, Popover } from './Popover'

export interface RowAction {
  label: string
  icon: LucideIcon
  onSelect: () => void
  danger?: boolean
}

/** "⋯" button with a short list of actions for one row or card. */
export function RowMenu({ name, actions }: { name: string; actions: RowAction[] }) {
  const { t } = useI18n()
  return (
    <Popover
      label={t('common.moreActions', { name })}
      panelClassName="min-w-48"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={t('common.moreActions', { name })}
          className="inline-flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </button>
      )}
    >
      {(close) =>
        actions.map(({ label, icon: Icon, onSelect, danger }) => (
          <MenuItem
            key={label}
            className={cn(danger && 'text-occupied-ink')}
            onSelect={() => {
              close()
              onSelect()
            }}
          >
            <Icon aria-hidden className={cn('size-4', danger ? 'text-occupied-ink' : 'text-text-muted')} />
            {label}
          </MenuItem>
        ))
      }
    </Popover>
  )
}
