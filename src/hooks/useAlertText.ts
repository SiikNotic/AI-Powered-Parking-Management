import { useCallback } from 'react'
import { useI18n } from '@/i18n'
import type { FarmAlert } from '@/types'
import { useFormat } from './useFormat'

/** Translated title/description for an alert, with dates and numbers formatted. */
export function useAlertText() {
  const { t } = useI18n()
  const fmt = useFormat()
  return useCallback(
    (alert: FarmAlert) => {
      const p = alert.params
      const params = {
        ...p,
        expiresAt: typeof p.expiresAt === 'string' ? fmt.dayMonthTime(p.expiresAt) : undefined,
        dueAt: typeof p.dueAt === 'string' ? fmt.dayMonthTime(p.dueAt) : undefined,
        quantity: typeof p.quantity === 'number' ? fmt.decimal(p.quantity) : undefined,
      }
      const expired = alert.type === 'expiring' && typeof p.expiresAt === 'string' && new Date(p.expiresAt).getTime() < Date.now()
      return {
        title: t(`alerts.types.${alert.type}.title`, params),
        description: expired ? t('alerts.types.expiring.expired', params) : t(`alerts.types.${alert.type}.description`, params),
      }
    },
    [t, fmt],
  )
}
