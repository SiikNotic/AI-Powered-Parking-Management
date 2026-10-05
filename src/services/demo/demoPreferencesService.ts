/** Dashboard layout per user. Demo: browser storage; Supabase: `user_preferences`. */
import type { PreferencesService, WidgetId, WidgetPreference } from '../contracts'

export const DEFAULT_LAYOUT: WidgetId[] = ['glance', 'overview', 'alerts', 'harvest', 'forecast', 'pipeline', 'inventory', 'finance', 'sales', 'tasks', 'activity']

const key = (userId: string) => `mushroom-farm.dashboard-layout.${userId}`

export const demoPreferencesService: PreferencesService = {
  getDashboardLayout(userId) {
    try {
      const saved = JSON.parse(localStorage.getItem(key(userId)) ?? 'null') as WidgetPreference[] | null
      if (Array.isArray(saved)) {
        const known = saved.filter((w) => DEFAULT_LAYOUT.includes(w.id))
        const missing = DEFAULT_LAYOUT.filter((id) => !known.some((w) => w.id === id)).map((id) => ({ id, visible: true }))
        return [...known, ...missing]
      }
    } catch {
      /* fall through */
    }
    return DEFAULT_LAYOUT.map((id) => ({ id, visible: true }))
  },
  saveDashboardLayout(userId, layout) {
    try {
      localStorage.setItem(key(userId), JSON.stringify(layout))
    } catch {
      /* ignore */
    }
  },
}
