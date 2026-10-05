# Mushroom Farm Manager

Management platform for mushroom farms. It follows the whole cycle:
**Production → Batches → Cultivation → Harvest → Weight → Processing/Packing → Inventory → Sale → Customer → Revenue → Expenses → Profit/Loss**.

**Phase 1 (this release): the main farm dashboard.** It runs on generated **demo data**, and the architecture is ready to switch to real data in Supabase.

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

## Connecting Supabase (next step)

1. Create the project and apply `supabase/migrations/*.sql`.
2. Implement the interfaces in `src/services/contracts.ts` with `@supabase/supabase-js`, using **only the anon key and the user's session**. RLS restricts every query to the user's farms and role. **Never put a `service_role` key in the frontend.**
3. Feed `changeFeed` from Supabase Realtime (`environmental_readings`, `alerts`, `harvests`, `inventory_movements`, `orders`).
4. Set `VITE_DATA_SOURCE=supabase` and register the new services in `src/services/index.ts`.
