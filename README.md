# Mushroom Farm Manager

Management platform for mushroom farms. It follows the whole cycle:
**Production → Batches → Cultivation → Harvest → Weight → Processing/Packing → Inventory → Sale → Customer → Revenue → Expenses → Profit/Loss**.

**Phase 1: the main farm dashboard.** It runs on generated **demo data** by default and connects to **Supabase** (auth, RLS, Realtime) with `VITE_DATA_SOURCE=supabase`.

## What the dashboard shows

- **KPIs** (each one links to its module): today's harvest, inventory (lb), orders, revenue, expenses, net profit, active batches, low-stock items. Each shows the change from the previous period.
- **Farm at a glance**: what was produced, harvested, available, sold, spent and earned; ready batches; top product and species; what's expiring; environmental issues; and a "Needs attention" list.
- **Farm overview**: 8 areas (Grow Rooms 01–03, Incubation, Fruiting, Cold Storage, Packing, Processing). Each shows live temperature, humidity and CO₂ against its targets, with a status (OK / Warning / Critical / Offline) and a 24 h trend chart.
- **Alerts**: severity, timestamp, location, description and status NEW → ACKNOWLEDGED → RESOLVED. Every change is written to the audit log.
- **Harvest** by species and day, waste %, yield vs expected, cost per lb.
- **Harvest forecast** for this week, next week and this month, by species, plus batches ready in the next 24 h.
- **Production pipeline**, **Inventory** (low stock, expiring lots), **Profit & loss**, **Sales**, **Today's tasks**, **Recent activity**.
- **Customization**: show, hide and reorder widgets (saved per user). Also global search (Ctrl/⌘ K), notifications, multiple farms, role-based views, light/dark mode, EN/ES, and layouts for desktop, tablet and mobile.

The other modules (Production, Batches, Harvest, Inventory, Products, Customers, Orders, Sales/POS, Expenses, P&L, Environment, Suppliers, Employees, Equipment, Reports, Settings) already have reserved routes and are marked **Soon** in the sidebar.

## Architecture

```
src/
  types/          Domain model (mirrors the SQL schema)
  domain/         Pure business rules — inventory (stock = Σ movements, FIFO lots),
                  finance (P&L), production (pipeline, yield, forecast),
                  environment (status vs targets), alerts, permissions (roles)
  services/       Contracts (contracts.ts) + change feed (push, no polling)
    demo/         ⚠️ Demo implementations: auth, dashboard, alerts, search,
                  preferences, DemoSensorProvider (simulated live feed)
  data/demo/      ⚠️ Seeded generator that simulates 60 days of farm operation
  hooks/          useAsync, useLiveEnvironment, useFormat, useAlertText…
  components/     layout/ · dashboard/ · charts/ (hand-written SVG) · ui/
  i18n/           Typed dictionaries (en = source, es)
supabase/migrations/  Schema, RLS, append-only triggers, audit, Realtime
```

- **Every number is computed from records**: orders, expenses, harvests and inventory movements. Revenue, profit, inventory and costs are never hard-coded.
- **Business rules**: stock can't go negative except through an explicit ADJUSTMENT with a reason. Harvests, inventory movements, expenses and the audit log are append-only (enforced by database triggers). Revenue is recognized when an order is completed. Inventory purchases reach the P&L through COGS, so they aren't counted twice.
- **SensorProvider**: a hardware-agnostic interface (`getLatest`, `getHistory`, `subscribe`). The demo provider simulates a live feed; any vendor or gateway can implement it.
- **Roles**: OWNER, FARM_MANAGER, GROWER, PACKING, SALES, ACCOUNTING, EMPLOYEE (see `domain/permissions.ts`). In demo mode the account menu has a "View as role" option to preview each role.
- **Multiple farms**: users only see the farms they belong to (`farm_members` + RLS).

## Demo data

`src/data/demo` generates two farms: **Evergreen Mycology** and a smaller **North Annex**. Each has 5 species, 8 areas, ~60 days of batches and harvests, packing and drying, orders from 18 customers, recurring expenses, and sensor readings. It also seeds realistic current issues: falling humidity in Grow Room 02, rising CO₂ in the Fruiting Room, an offline sensor, an overdue batch, late orders, low stock and expiring lots. The data is deterministic (seeded) and relative to the current date.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run lint
```

`.env.example` lists the variables. `VITE_ROUTER=hash` is used for GitHub Pages (`.github/workflows/deploy-pages.yml` publishes on every push to `main`).

## Connecting Supabase

The Supabase implementation of every service lives in `src/services/supabase/`. It runs only with the **public anon/publishable key and the signed-in user's session**: RLS decides what each user can read and write. **Never put a `service_role` key in the frontend or in `VITE_*` variables.**

1. **Schema**: apply `supabase/migrations/*.sql` in order. They create tables, RLS, append-only triggers, the audit trail, the Realtime publication, profile creation on sign-up, `create_farm()` and `ingest_reading()`.
2. **Environment**: in `.env.local`:
   ```
   VITE_DATA_SOURCE=supabase
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon or publishable key>
   ```
3. **First run**: sign up in the app. With no farm yet, it asks you to create one and makes you its OWNER.
4. **Demo data (optional)**:
   - `npm run seed:sql` writes `supabase/seed/out/*.sql`. Run the files in order to load **Evergreen Mycology (demo)**.
   - Add yourself as owner (`insert into farm_members …`, see the script header).
   - `supabase/seed/demo_sensor_simulator.sql` schedules a pg_cron job that adds demo readings every 5 minutes, so you can see live updates.
5. **Real sensors**:
   - Register the sensor in `sensors`, then call `set_sensor_token(sensor_id, token)` as a manager.
   - The device posts to `POST /rest/v1/rpc/ingest_reading` with the anon key, its `provider`, `external_id`, token and values.
   - Tokens are stored only as bcrypt hashes in a table no client can read.

How it works:
- **Realtime**: one channel per farm. Readings stream into the room cards and charts. Changes to harvests, movements, orders, expenses, batches and alerts refresh the dashboard.
- **Same numbers in demo and live**: both modes build the snapshot and alerts with the same shared functions (`services/shared`).
- **Alert status** is stored in `alerts` by cause key, and every change is audited.
- **Dashboard layout** is stored per user in `user_preferences`.
