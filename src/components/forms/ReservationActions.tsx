import { Check, LogIn, LogOut, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n'
import { actionsFor, type ReservationAction } from '@/config/reservations'
import type { Reservation } from '@/types'

const icons = { confirm: Check, checkIn: LogIn, checkOut: LogOut, cancel: X }

interface ReservationActionsProps {
  reservation: Reservation
  busy: boolean
  onAction: (action: ReservationAction, reservation: Reservation) => void
}

export function ReservationActions({ reservation, busy, onAction }: ReservationActionsProps) {
  const { t } = useI18n()
  const actions = actionsFor(reservation.status)
  if (!actions.length) return null
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {actions.map((action) => {
        const Icon = icons[action]
        const label = t(`reservationsPage.actions.${action}`)
        return action === 'cancel' ? (
          <button
            key={action}
            type="button"
            disabled={busy}
            onClick={() => onAction(action, reservation)}
            aria-label={`${label} #${reservation.code}`}
            title={label}
            className="inline-flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-occupied-soft hover:text-occupied-ink disabled:opacity-50"
          >
            <Icon aria-hidden className="size-4" />
          </button>
        ) : (
          <Button
            key={action}
            size="sm"
            variant={action === 'checkOut' || action === 'checkIn' ? 'primary' : 'secondary'}
            disabled={busy}
            onClick={() => onAction(action, reservation)}
            aria-label={`${label} #${reservation.code}`}
          >
            <Icon aria-hidden className="size-3.5" />
            {label}
          </Button>
        )
      })}
    </div>
  )
}
