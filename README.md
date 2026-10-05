# Sky Parking — Parking Management Dashboard

Web dashboard for parking lot owners and managers (project: **AI-Powered-Parking-Management**).
Supports truck, RV and car parking locations (`ParkingLocation.category`), with per-space
vehicle types, space types (oversized, compact, EV charging…) and price units (night/day/hour).
The customer mobile app lives in a separate repository (`Sky-parking-app`).

> All 8 sections work end to end with **demo data** kept in the browser (localStorage).
> Supabase is not connected yet; the service layer is ready for it.

## What works

| Section | What you can do |
| --- | --- |
| Dashboard | KPIs, occupancy chart, live parking map (click a space), alerts, activity, upcoming reservations, revenue |
| Parking Locations | Create (with auto-generated spaces), edit, delete; live occupancy per lot |
| Parking Spaces | Map and list views, filters, create/edit/delete, change status from the space panel |
| Reservations | Upcoming / in progress / past views, search, create (with a new or existing customer), confirm, check in, check out, cancel |
| Customers | Search, create/edit/delete, history and total spent per customer, book from the customer panel |
| Analytics | Occupancy, revenue by day and by location, reservations by vehicle and status |
| Cameras | Status per camera, mark online/offline/maintenance, create/edit/delete (video streaming comes later) |
| Settings | Profile and organization, language and theme, alert threshold and notifications, reset demo data |

Changes ripple through the app: checking in occupies the space, checking out frees it and logs
the payment, an offline camera or a space in maintenance raises an alert, and a location above
the occupancy threshold is flagged. Log out shows a sign-in screen (demo account).

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check (tsc -b) + production build
npm run lint       # oxlint
npm run preview    # serve the production build
```

Requires Node 20+.

## Deploy (GitHub Pages)

`.github/workflows/deploy-pages.yml` builds the app on every push to `main` and publishes
`dist/` to the `gh-pages` branch.
One-time setup: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
`gh-pages` / (root)**.
The Pages build uses hash routing (`VITE_ROUTER=hash`), so URLs look like `…/#/dashboard`.

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · React Router · lucide-react icons.
Charts are hand-written SVG (no chart library) to keep the bundle small.

## Structure

```
src/
  types/            Domain types (ParkingLocation, ParkingSpace, Reservation, Customer,
                    ParkingStats, RevenueStats, ActivityEvent, Alert, …)
  data/mock/        ⚠️ DEMO SEED DATA — 4 locations (2 truck, 1 RV, 1 car), 198 spaces,
                    cameras, customers, reservations, revenue generators,
                    activity, alerts. Only imported by services/mock.
  services/
    contracts.ts    Service interfaces the UI depends on
    mock/           Demo implementations + in-browser database (db.ts, change feed)
    index.ts        Registry — the single place that picks the data source
  hooks/            useAsync, useDashboardData, useLiveSpaces, useFormat, …
  i18n/             Typed EN/ES dictionaries + provider (no hard-coded UI text)
  context/          Theme, session (manager + selected location)
  config/           Navigation, status colours/icons, alert & activity visuals
  components/
    layout/         DashboardLayout, Sidebar, Topbar, LocationSelector, menus
    dashboard/      StatCard, KpiGrid, OccupancyChart, ParkingStatus, ParkingSpace,
                    RecentActivity, ReservationTable, RevenueCard, AlertCard, QuickActions
    ui/             Card, Badge, Button, Tooltip, Popover, SegmentedControl,
                    Loading / Empty / Error states
  pages/            DashboardPage, ComingSoonPage, NotFoundPage
```

## Connecting Supabase (next phase)

1. `npm install @supabase/supabase-js`
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   (public anon key only — **never** a `service_role` key in the browser).
3. Implement the interfaces from `src/services/contracts.ts` in `src/services/supabase/`
   and return them from `src/services/index.ts`.
4. `changeFeed` (and `parkingService.subscribeToSpaces`) is where Supabase Realtime plugs in;
   every screen already refreshes from it, with no polling.

No component needs to change.

## Design notes

- Glassmorphism: translucent, blurred surfaces (`.glass`, `.glass-strong`) over a soft
  colour backdrop. Light/dark themes share one design via CSS variables (`src/index.css`).
- Parking status colours (available green, occupied red, reserved blue, maintenance amber,
  disabled gray) are always paired with an icon, a label and a tooltip.
- Responsive: full sidebar on desktop (collapsible), icon rail on tablet, drawer on mobile.
  No horizontal page scroll.
