import type { MetricStatus } from '@/domain/environment'
import type { Metric } from '@/types'

/** Stable chart colour for a species. */
export const speciesColor = (colorIndex: number) => `var(--sp-${colorIndex % 5})`

export const METRIC_UNIT: Record<Metric, string> = { temperature: '°F', humidity: '%', co2: 'ppm' }

export function formatMetric(metric: Metric, value: number) {
  return metric === 'co2' ? `${Math.round(value)} ppm` : `${value.toFixed(1)}${METRIC_UNIT[metric]}`
}

export const metricTextClass: Record<MetricStatus, string> = {
  ok: 'text-text',
  warning: 'text-warn-ink',
  critical: 'text-crit-ink',
}
