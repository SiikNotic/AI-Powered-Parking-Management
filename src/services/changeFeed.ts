/**
 * Tiny push-based change feed. Services publish after data changes; hooks
 * subscribe and reload. With Supabase this is fed by Realtime channels.
 */
export type DataTopic = 'session' | 'dashboard' | 'alerts' | 'sensors'

type Listener = () => void
const listeners = new Map<DataTopic, Set<Listener>>()

export const changeFeed = {
  publish(topic: DataTopic) {
    listeners.get(topic)?.forEach((l) => l())
  },
  subscribe(topics: DataTopic[], listener: Listener): () => void {
    for (const t of topics) {
      if (!listeners.has(t)) listeners.set(t, new Set())
      listeners.get(t)!.add(listener)
    }
    return () => topics.forEach((t) => listeners.get(t)?.delete(listener))
  },
}
