import { useMemo } from 'react'
import { useI18n } from '@/i18n'

/** Locale-aware formatters (numbers, money, dates) bound to the active language. */
export function useFormat() {
  const { intlLocale, t } = useI18n()

  return useMemo(() => {
    const integer = new Intl.NumberFormat(intlLocale)
    const currency = new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    const compactCurrency = new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    })
    const percent = new Intl.NumberFormat(intlLocale, { style: 'percent', maximumFractionDigits: 0 })
    const signedPercent = new Intl.NumberFormat(intlLocale, {
      style: 'percent',
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
      signDisplay: 'exceptZero',
    })
    const time = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric', minute: '2-digit' })
    const hour = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric' })
    const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'short' })
    const dayMonth = new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric' })
    const dayMonthTime = new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

    return {
      number: (value: number) => integer.format(value),
      currency: (value: number) => currency.format(value),
      compactCurrency: (value: number) => compactCurrency.format(value),
      percent: (ratio: number) => percent.format(ratio),
      signedPercent: (ratio: number) => signedPercent.format(ratio),
      time: (iso: string) => time.format(new Date(iso)),
      hour: (iso: string) => hour.format(new Date(iso)),
      weekday: (iso: string) => weekday.format(new Date(iso)),
      dayMonth: (iso: string) => dayMonth.format(new Date(iso)),
      dayMonthTime: (iso: string) => dayMonthTime.format(new Date(iso)),
      relative: (iso: string, now: Date = new Date()) => {
        const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000)
        if (minutes < 1) return t('time.justNow')
        if (minutes < 60) return t('time.minutesAgo', { count: minutes })
        return t('time.hoursAgo', { count: Math.floor(minutes / 60) })
      },
    }
  }, [intlLocale, t])
}

export type Formatters = ReturnType<typeof useFormat>
