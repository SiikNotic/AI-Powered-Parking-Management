import type { BadgeTone } from '@/components/ui/Badge'
import type { ReservationStatus } from '@/types'

export const reservationTone: Record<ReservationStatus, BadgeTone> = {
  confirmed: 'success',
  pending: 'warning',
  checked_in: 'info',
  completed: 'neutral',
  cancelled: 'neutral',
}

export type ReservationAction = 'confirm' | 'checkIn' | 'checkOut' | 'cancel'

/** The next steps that make sense for a reservation's current status. */
export function actionsFor(status: ReservationStatus): ReservationAction[] {
  if (status === 'pending') return ['confirm', 'cancel']
  if (status === 'confirmed') return ['checkIn', 'cancel']
  if (status === 'checked_in') return ['checkOut']
  return []
}
