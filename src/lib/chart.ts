/** Minimal chart math — avoids pulling a charting library into the bundle. */

export type Point = [number, number]

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0)
}

/** Rounds a max value up to a "nice" number for axis ticks. */
export function niceMax(value: number, steps = 4): number {
  if (value <= 0) return steps
  const raw = value / steps
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const nice = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10
  return nice * magnitude * steps
}

/** Monotone cubic interpolation (Fritsch–Carlson): smooth without overshooting. */
export function monotonePath(points: Point[]): string {
  const n = points.length
  if (n === 0) return ''
  if (n === 1) return `M${points[0][0]},${points[0][1]}`
  if (n === 2) return `M${points[0][0]},${points[0][1]}L${points[1][0]},${points[1][1]}`

  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0]
    slope[i] = (points[i + 1][1] - points[i][1]) / (dx[i] || 1)
  }
  const tangent: number[] = [slope[0]]
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) /
      ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i])
  }
  tangent[n - 1] = slope[n - 2]

  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const h = dx[i] / 3
    d += `C${x0 + h},${y0 + tangent[i] * h},${x1 - h},${y1 - tangent[i + 1] * h},${x1},${y1}`
  }
  return d
}
