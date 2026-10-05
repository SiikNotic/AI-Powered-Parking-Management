/** Supabase implementations of the service contracts (anon key + user session + RLS). */
import type { AlertStatus, FarmAlert, Role } from '@/types'
import { changeFeed } from '../changeFeed'
import type { AlertService, AuthService, DashboardService, PreferencesService, SearchResult, SearchService, SensorProvider, WidgetPreference } from '../contracts'
import { DEFAULT_LAYOUT } from '../demo/demoPreferencesService'
import { ServiceError } from '../errors'
import { buildAlertDrafts } from '../shared/alerts'
import { buildSnapshot } from '../shared/snapshot'
import { fetchAll, supabase } from './client'
import { closeAllChannels, farmChannel } from './realtime'
import { getRecords, invalidateRecords } from './records'
import { toFarm, toReading, type FarmRow, type ReadingRow } from './rows'

const fail = (error: { message: string; code?: string } | null) => {
  if (!error) return
  if (error.code === '42501' || /permission|not allowed|row-level security/i.test(error.message)) throw new ServiceError('forbidden', error.message)
  throw new ServiceError('network', error.message)
}

// ---------- Auth ----------

// Session changes (sign-in, sign-out, token refresh in another tab) reload the app session.
let authListening = false
function listenAuth() {
  if (authListening) return
  authListening = true
  supabase().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') changeFeed.publish('session')
    if (event === 'SIGNED_OUT') closeAllChannels()
  })
}

const profileNames = new Map<string, string>()

export const supabaseAuthService: AuthService = {
  async getSession() {
    listenAuth()
    const db = supabase()
    const { data } = await db.auth.getSession()
    const authUser = data.session?.user
    if (!authUser) return null
    const [{ data: profile, error: pErr }, { data: members, error: mErr }] = await Promise.all([
      db.from('profiles').select('id, full_name, email').eq('id', authUser.id).maybeSingle(),
      db.from('farm_members').select('role, farms(id, name, location, timezone)').eq('user_id', authUser.id),
    ])
    fail(pErr)
    fail(mErr)
    const rows = (members ?? []) as unknown as { role: Role; farms: FarmRow | null }[]
    const memberships = rows.filter((m) => m.farms).map((m) => ({ farmId: m.farms!.id, role: m.role }))
    const farms = rows.filter((m) => m.farms).map((m) => toFarm(m.farms!)).sort((a, b) => a.name.localeCompare(b.name))
    const name = profile?.full_name ?? authUser.email ?? ''
    profileNames.set(authUser.id, name)
    return {
      user: { id: authUser.id, name, email: profile?.email ?? authUser.email ?? '', role: memberships[0]?.role ?? 'EMPLOYEE', farmIds: farms.map((f) => f.id) },
      farms,
      memberships,
    }
  },
  async signIn(email, password) {
    const { error } = await supabase().auth.signInWithPassword({ email, password })
    if (error) throw new ServiceError(error.status === 400 ? 'invalid' : 'network', error.message)
  },
  async signUp(email, password, fullName) {
    const { data, error } = await supabase().auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    if (error) throw new ServiceError('invalid', error.message)
    return !data.session
  },
  async signOut() {
    await supabase().auth.signOut()
  },
  async createFarm(name, location) {
    const { error } = await supabase().rpc('create_farm', { p_name: name, p_location: location, p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    fail(error)
    changeFeed.publish('session')
  },
}

/** Names of farm members (profiles), for the activity feed. */
async function loadProfileNames(farmId: string) {
  const { data } = await supabase().from('farm_members').select('user_id, profiles(full_name)').eq('farm_id', farmId)
  for (const row of (data ?? []) as unknown as { user_id: string; profiles: { full_name: string } | null }[]) {
    if (row.profiles) profileNames.set(row.user_id, row.profiles.full_name)
  }
}

// ---------- Dashboard ----------

export const supabaseDashboardService: DashboardService = {
  async getSnapshot(farmId, period) {
    farmChannel(farmId)
    const [records] = await Promise.all([getRecords(farmId), loadProfileNames(farmId)])
    return buildSnapshot(records, period, new Date(), (id) => profileNames.get(id))
  },
}

// ---------- Sensors ----------

const readingColumns = 'room_id, sensor_id, recorded_at, temperature, humidity, co2'

export const supabaseSensorProvider: SensorProvider = {
  async getLatest(farmId) {
    const since = new Date(Date.now() - 6 * 3_600_000).toISOString()
    const { data, error } = await supabase().from('environmental_readings').select(readingColumns).eq('farm_id', farmId).gte('recorded_at', since).order('recorded_at', { ascending: false }).limit(1000)
    fail(error)
    const latest = new Map<string, ReadingRow>()
    for (const r of (data ?? []) as ReadingRow[]) if (!latest.has(r.room_id)) latest.set(r.room_id, r)
    return [...latest.values()].map(toReading)
  },
  async getHistory(farmId, roomId, hours) {
    const since = new Date(Date.now() - hours * 3_600_000).toISOString()
    const rows = await fetchAll<ReadingRow>((a, b) =>
      supabase().from('environmental_readings').select(readingColumns).eq('farm_id', farmId).eq('room_id', roomId).gte('recorded_at', since).order('recorded_at').range(a, b),
    )
    return rows.map(toReading)
  },
  subscribe(farmId, listener) {
    const { readingListeners } = farmChannel(farmId)
    readingListeners.add(listener)
    return () => readingListeners.delete(listener)
  },
}

// ---------- Alerts ----------

interface AlertRow { id: string; key: string; status: AlertStatus; type: FarmAlert['type']; severity: FarmAlert['severity']; location: string | null; params: FarmAlert['params']; created_at: string; resolved_at: string | null }

async function readingHistory(farmId: string, roomIds: string[]) {
  const since = new Date(Date.now() - 6 * 3_600_000).toISOString()
  const rows = await fetchAll<ReadingRow>((a, b) => supabase().from('environmental_readings').select(readingColumns).eq('farm_id', farmId).gte('recorded_at', since).order('recorded_at').range(a, b))
  const history = new Map(roomIds.map((id) => [id, [] as ReturnType<typeof toReading>[]]))
  for (const r of rows) history.get(r.room_id)?.push(toReading(r))
  return history
}

async function currentAlerts(farmId: string) {
  const records = await getRecords(farmId)
  const drafts = buildAlertDrafts(records, await readingHistory(farmId, records.rooms.map((r) => r.id)), new Date())
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { data, error } = await supabase().from('alerts').select('*').eq('farm_id', farmId).or(`status.neq.RESOLVED,resolved_at.gte.${weekAgo}`).order('created_at', { ascending: false })
  fail(error)
  return { drafts, rows: (data ?? []) as AlertRow[] }
}

async function setAlertStatus(farmId: string, key: string, status: Exclude<AlertStatus, 'NEW'>) {
  const { drafts, rows } = await currentAlerts(farmId)
  const draft = drafts.find((d) => d.id === key)
  const open = rows.find((r) => r.key === key && r.status !== 'RESOLVED')
  const { data: auth } = await supabase().auth.getUser()
  const uid = auth.user?.id ?? null
  const stamp = status === 'ACKNOWLEDGED' ? { acknowledged_by: uid, acknowledged_at: new Date().toISOString() } : { resolved_by: uid, resolved_at: new Date().toISOString() }
  if (open) {
    const { error } = await supabase().from('alerts').update({ status, ...stamp }).eq('id', open.id)
    fail(error)
  } else if (draft) {
    const { error } = await supabase()
      .from('alerts')
      .insert({ farm_id: farmId, key, type: draft.type, severity: draft.severity, status, location: draft.location, params: draft.params, created_at: draft.createdAt, ...stamp })
    fail(error)
  } else throw new ServiceError('not_found')
  changeFeed.publish('alerts')
  invalidateRecords(farmId)
  changeFeed.publish('dashboard')
}

export const supabaseAlertService: AlertService = {
  async list(farmId) {
    farmChannel(farmId)
    const { drafts, rows } = await currentAlerts(farmId)
    const activeKeys = new Set(drafts.map((d) => d.id))
    // A stored status applies while its condition lasts.
    const openByKey = new Map(rows.filter((r) => r.status !== 'RESOLVED').map((r) => [r.key, r]))
    const resolvedByKey = new Map(rows.filter((r) => r.status === 'RESOLVED').map((r) => [r.key, r]))
    const active: FarmAlert[] = drafts.map((d) => ({ ...d, status: openByKey.get(d.id)?.status ?? (resolvedByKey.has(d.id) ? 'RESOLVED' : 'NEW') }))
    const history: FarmAlert[] = rows
      .filter((r) => !activeKeys.has(r.key) && (r.status === 'RESOLVED' || !resolvedByKey.has(r.key)))
      .map((r) => ({ id: r.key, type: r.type, severity: r.severity, status: 'RESOLVED', createdAt: new Date(r.created_at).toISOString(), location: r.location ?? '', params: r.params }))
    const seen = new Set<string>()
    return [...active, ...history].filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
  },
  acknowledge: (farmId, key) => setAlertStatus(farmId, key, 'ACKNOWLEDGED'),
  resolve: (farmId, key) => setAlertStatus(farmId, key, 'RESOLVED'),
}

// ---------- Search ----------

const LIMIT = 4

export const supabaseSearchService: SearchService = {
  async search(farmId, query) {
    const q = query.trim()
    if (q.length < 2) return []
    // Escape characters with meaning inside PostgREST filters.
    const term = `%${q.replace(/[%_,()\\]/g, (c) => `\\${c}`)}%`
    const db = supabase()
    const [batches, products, customers, orders, rooms, species] = await Promise.all([
      db.from('production_batches').select('id, code, status, mushroom_species(name)').eq('farm_id', farmId).ilike('code', term).order('spawn_date', { ascending: false }).limit(LIMIT),
      db.from('inventory_products').select('id, name, sku').eq('farm_id', farmId).or(`name.ilike.${term},sku.ilike.${term}`).limit(LIMIT),
      db.from('customers').select('id, name, company').eq('farm_id', farmId).or(`name.ilike.${term},company.ilike.${term},email.ilike.${term}`).limit(LIMIT),
      db.from('orders').select('id, code, status').eq('farm_id', farmId).ilike('code', term).order('created_at', { ascending: false }).limit(LIMIT),
      db.from('grow_rooms').select('id, name').eq('farm_id', farmId).ilike('name', term).limit(LIMIT),
      db.from('mushroom_species').select('id, name, scientific_name').eq('farm_id', farmId).or(`name.ilike.${term},scientific_name.ilike.${term}`).limit(LIMIT),
    ])
    const results: SearchResult[] = [
      ...((batches.data ?? []) as unknown as { id: string; code: string; status: string; mushroom_species: { name: string } | null }[]).map((b) => ({ kind: 'batch' as const, id: b.id, title: `#${b.code}`, subtitle: `${b.mushroom_species?.name ?? ''} · ${b.status}`, link: '/batches' })),
      ...(products.data ?? []).map((p) => ({ kind: 'product' as const, id: p.id as string, title: p.name as string, subtitle: p.sku as string, link: '/products' })),
      ...(customers.data ?? []).map((c) => ({ kind: 'customer' as const, id: c.id as string, title: (c.company as string | null) ?? (c.name as string), subtitle: c.name as string, link: '/customers' })),
      ...(orders.data ?? []).map((o) => ({ kind: 'order' as const, id: o.id as string, title: o.code as string, subtitle: o.status as string, link: '/orders' })),
      ...(rooms.data ?? []).map((r) => ({ kind: 'room' as const, id: r.id as string, title: r.name as string, subtitle: '', link: '/environment' })),
      ...(species.data ?? []).map((s) => ({ kind: 'species' as const, id: s.id as string, title: s.name as string, subtitle: (s.scientific_name as string | null) ?? '', link: '/production' })),
    ]
    return results
  },
}

// ---------- Preferences ----------

const layoutKey = (userId: string) => `mushroom-farm.dashboard-layout.${userId}`

function normalize(saved: WidgetPreference[] | null): WidgetPreference[] {
  if (!Array.isArray(saved) || !saved.length) return DEFAULT_LAYOUT.map((id) => ({ id, visible: true }))
  const known = saved.filter((w) => DEFAULT_LAYOUT.includes(w.id))
  return [...known, ...DEFAULT_LAYOUT.filter((id) => !known.some((w) => w.id === id)).map((id) => ({ id, visible: true }))]
}

export const supabasePreferencesService: PreferencesService = {
  getDashboardLayout(userId) {
    try {
      return normalize(JSON.parse(localStorage.getItem(layoutKey(userId)) ?? 'null') as WidgetPreference[] | null)
    } catch {
      return normalize(null)
    }
  },
  saveDashboardLayout(userId, layout) {
    try {
      localStorage.setItem(layoutKey(userId), JSON.stringify(layout))
    } catch {
      /* ignore */
    }
    void supabase().from('user_preferences').upsert({ user_id: userId, dashboard_layout: layout, updated_at: new Date().toISOString() })
  },
  async hydrate(userId) {
    const { data } = await supabase().from('user_preferences').select('dashboard_layout').eq('user_id', userId).maybeSingle()
    if (data?.dashboard_layout && Array.isArray(data.dashboard_layout) && data.dashboard_layout.length) {
      try {
        localStorage.setItem(layoutKey(userId), JSON.stringify(data.dashboard_layout))
      } catch {
        /* ignore */
      }
    }
  },
}
