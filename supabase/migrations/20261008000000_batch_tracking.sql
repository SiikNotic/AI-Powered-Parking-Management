-- Batch traceability: precise in-room locations, QR-ready identity, event history, species photos.
--
-- 1. location_code on production_batches, e.g. 'A-1A' (room A, rack 1, position A).
--    Printed on the batch QR label; scanning the QR opens the batch so the
--    location can be set/confirmed when the bags are placed.
alter table production_batches
  add column if not exists location_code text;

-- 2. Photo per mushroom species: key into public/images/species/<image_key>.jpg.
alter table mushroom_species
  add column if not exists image_key text;

-- 3. Append-only event history per batch: created, status changes, moves, harvests, notes.
create table if not exists batch_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  batch_id uuid not null references production_batches (id) on delete cascade,
  type text not null check (type in ('CREATED', 'STATUS_CHANGED', 'LOCATION_CHANGED', 'HARVESTED', 'NOTE_ADDED')),
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists batch_events_batch_idx on batch_events (batch_id, created_at desc);

alter table batch_events enable row level security;
create policy "members read" on batch_events for select
  using (is_farm_member(farm_id));
create policy "writers insert" on batch_events for insert
  with check (has_farm_role(farm_id, array['OWNER', 'FARM_MANAGER', 'GROWER']::app_role[]));

-- 4. Backfill a CREATED event for batches that predate this table.
insert into batch_events (farm_id, batch_id, type, message, created_at)
select farm_id, id, 'CREATED', 'Batch ' || code || ' created', created_at
from production_batches b
where not exists (select 1 from batch_events e where e.batch_id = b.id);
