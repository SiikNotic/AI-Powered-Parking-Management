import { linearScale, monotonePath } from '@/lib/chart'

interface SparklineProps {
  values: number[]
  /** Target band drawn behind the line. */
  band?: { min: number; max: number }
  color?: string
  className?: string
  height?: number
}

/** Decorative trend line (the value itself is always shown as text next to it). */
export function Sparkline({ values, band, color = 'var(--text-secondary)', className, height = 28 }: SparklineProps) {
  const width = 100
  if (values.length < 2) return <svg aria-hidden className={className} viewBox={`0 0 ${width} ${height}`} />
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (band) {
    lo = Math.min(lo, band.min)
    hi = Math.max(hi, band.max)
  }
  const pad = (hi - lo) * 0.12 || 1
  const x = linearScale([0, values.length - 1], [1, width - 1])
  const y = linearScale([lo - pad, hi + pad], [height - 1, 1])
  const d = monotonePath(values.map((v, i) => [x(i), y(v)]))
  return (
    <svg aria-hidden className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {band && <rect x={0} width={width} y={y(band.max)} height={Math.max(0, y(band.min) - y(band.max))} fill="var(--ok-soft)" opacity={0.9} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
