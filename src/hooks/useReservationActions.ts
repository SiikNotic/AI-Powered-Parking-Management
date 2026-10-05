import { useState } from 'react'
import type { ReservationAction } from '@/config/reservations'
import { useI18n } from '@/i18n'
import { reservationService } from '@/services'
import type { Reservation } from '@/types'
import { useMutation } from './useMutation'

/** Runs reservation status changes; cancelling asks for confirmation first. */
export function useReservationActions() {
  const { t } = useI18n()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<Reservation | null>(null)
  const mutation = useMutation((action: ReservationAction, id: string) => reservationService[action](id))

  const execute = async (action: ReservationAction, reservation: Reservation) => {
    setBusyId(reservation.id)
    await mutation.run([action, reservation.id], t(`reservationsPage.done.${action}`))
    setBusyId(null)
  }

  return {
    busyId,
    toCancel,
    cancelPending: mutation.pending,
    onAction: (action: ReservationAction, reservation: Reservation) => (action === 'cancel' ? setToCancel(reservation) : execute(action, reservation)),
    confirmCancel: async () => {
      if (!toCancel) return
      await execute('cancel', toCancel)
      setToCancel(null)
    },
    dismissCancel: () => setToCancel(null),
  }
}
