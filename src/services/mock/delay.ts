/**
 * Simulates a single network round-trip so loading states are visible in the
 * demo. Runs once per request — there is no polling.
 */
const MOCK_LATENCY_MS = 350

export function withLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), MOCK_LATENCY_MS))
}

export function matchesLocation(locationId: string, filter: string): boolean {
  return filter === 'all' || filter === locationId
}
