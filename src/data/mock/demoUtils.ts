/**
 * ⚠️ DEMO DATA HELPERS
 * Utilities used only to generate deterministic demo data.
 * Nothing in here is used once a real data source (Supabase) is connected.
 */

/** Small deterministic PRNG so the demo looks identical on every reload. */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Reference "now" for relative demo timestamps (computed once per session). */
export const DEMO_NOW = new Date()

export function minutesAgo(minutes: number): string {
  return new Date(DEMO_NOW.getTime() - minutes * 60_000).toISOString()
}

export function hoursFromNow(hours: number): string {
  const date = new Date(DEMO_NOW.getTime() + hours * 3_600_000)
  date.setMinutes(Math.round(date.getMinutes() / 15) * 15, 0, 0)
  return date.toISOString()
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
