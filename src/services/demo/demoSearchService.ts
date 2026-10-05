/** ⚠️ DEMO global search across the farm's records. */
import { getFarmDataset } from '@/data/demo'
import type { SearchResult, SearchService } from '../contracts'
import { delay } from './delay'

const LIMIT_PER_KIND = 4

export const demoSearchService: SearchService = {
  search(farmId, query) {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return delay([], 60)
    const data = getFarmDataset(farmId)
    const match = (...fields: (string | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q))
    const speciesName = new Map(data.species.map((s) => [s.id, s.name]))
    const customerName = new Map(data.customers.map((c) => [c.id, c.company ?? c.name]))
    const take = (list: SearchResult[]) => list.slice(0, LIMIT_PER_KIND)

    const results: SearchResult[] = [
      ...take(
        data.batches
          .filter((b) => match(b.code, speciesName.get(b.speciesId)))
          .reverse()
          .map((b) => ({ kind: 'batch' as const, id: b.id, title: `#${b.code}`, subtitle: `${speciesName.get(b.speciesId)} · ${b.status}`, link: '/batches' })),
      ),
      ...take(data.products.filter((p) => match(p.name, p.sku)).map((p) => ({ kind: 'product' as const, id: p.id, title: p.name, subtitle: p.sku, link: '/products' }))),
      ...take(data.customers.filter((c) => match(c.name, c.company, c.email)).map((c) => ({ kind: 'customer' as const, id: c.id, title: c.company ?? c.name, subtitle: c.name, link: '/customers' }))),
      ...take(
        data.orders
          .filter((o) => match(o.code, customerName.get(o.customerId)))
          .reverse()
          .map((o) => ({ kind: 'order' as const, id: o.id, title: o.code, subtitle: `${customerName.get(o.customerId)} · ${o.status}`, link: '/orders' })),
      ),
      ...take(data.rooms.filter((r) => match(r.name)).map((r) => ({ kind: 'room' as const, id: r.id, title: r.name, subtitle: r.sensorId, link: '/environment' }))),
      ...take(data.species.filter((s) => match(s.name, s.scientificName)).map((s) => ({ kind: 'species' as const, id: s.id, title: s.name, subtitle: s.scientificName, link: '/production' }))),
    ]
    return delay(results, 90)
  },
}
