/**
 * Simulates a short network round-trip so loading states are realistic.
 * Runs once per request — there is no polling.
 */
const MOCK_LATENCY_MS = 220

export function withLatency<T>(value: T | (() => T)): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        const result = typeof value === 'function' ? (value as () => T)() : value
        resolve(structuredClone(result))
      } catch (error) {
        reject(error)
      }
    }, MOCK_LATENCY_MS),
  )
}

export function matchesLocation(locationId: string, filter: string): boolean {
  return filter === 'all' || filter === locationId
}
