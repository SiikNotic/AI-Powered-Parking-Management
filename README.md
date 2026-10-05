# Sky Parking — Parking Management Dashboard

Web dashboard for parking lot owners and managers (project: **AI-Powered-Parking-Management**).
Supports truck, RV and car parking locations (`ParkingLocation.category`), with per-space
vehicle types, space types (oversized, compact, EV charging…) and price units (night/day/hour).
The customer mobile app lives in a separate repository (`Sky-parking-app`).

> **Phase 1:** only `/dashboard` is fully built. Every other route shows a "Coming soon" page.
> All data is **DEMO data** — Supabase is not connected yet.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check (tsc -b) + production build
npm run lint       # oxlint
npm run preview    # serve the production build
```

Requires Node 20+.

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · React Router · lucide-react icons.
Charts are hand-written SVG (no chart library) to keep the bundle small.

## Structure

```
src/
  types/            Domain types (ParkingLocation, ParkingSpace, Reservation, Customer,
                    ParkingStats, RevenueStats, ActivityEvent, Alert, …)
  data/mock/        ⚠️ DEMO DATA ONLY — 4 locations (2 truck, 1 RV, 1 car), 198 spaces,
                    reservations, revenue,
                    activity, alerts. Only imported by services/mock.
  services/
    contracts.ts    Service interfaces the UI depends on
    mock/           Demo implementations of those interfaces
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
4. `parkingService.subscribeToSpaces` is where Supabase Realtime plugs in; the live
   parking map already consumes it through `useLiveSpaces`.

No component needs to change.

## Design notes

- Light/dark themes share one design via CSS variables (`src/index.css`).
- Parking status colours (available green, occupied red, reserved blue, maintenance amber,
  disabled gray) are always paired with an icon, a label and a tooltip.
- Responsive: full sidebar on desktop (collapsible), icon rail on tablet, drawer on mobile.
  No horizontal page scroll.
