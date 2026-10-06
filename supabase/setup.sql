-- Mushroom Farm Manager — esquema completo para un proyecto nuevo. SQL Editor → Run (una sola vez).

-- ===== supabase/migrations/20261005000000_initial_schema.sql =====
-- =====================================================================
-- Mushroom Farm Manager — initial schema
--
-- * Every business table belongs to a farm (farm_id) and uses UUID keys.
-- * Row Level Security: users only see farms they are members of
--   (farm_members); writes are limited by role.
-- * History is append-only: harvests, inventory movements, expenses and
--   the audit log can't be updated or deleted. Corrections are new rows.
-- * Stock is never stored: it is the sum of inventory_movements.
-- * The frontend uses the anon key + the user's JWT only. Never ship a
--   service_role key to the browser.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type app_role as enum ('OWNER', 'FARM_MANAGER', 'GROWER', 'PACKING', 'SALES', 'ACCOUNTING', 'EMPLOYEE');
create type room_type as enum ('grow', 'incubation', 'fruiting', 'cold_storage', 'packing', 'processing');
create type batch_status as enum ('PLANNED', 'INOCULATED', 'COLONIZING', 'FRUITING', 'READY_TO_HARVEST', 'HARVESTED', 'COMPLETED', 'FAILED', 'DISCARDED');
create type harvest_grade as enum ('A', 'B', 'C');
create type product_category as enum ('fresh', 'dried', 'powder', 'kit', 'spawn', 'substrate', 'packaging', 'supplies');
create type inventory_unit as enum ('lb', 'oz', 'unit');
create type location_kind as enum ('grow_room', 'cold_storage', 'warehouse', 'packing', 'retail', 'vehicle');
create type movement_type as enum ('RECEIVED', 'PRODUCED', 'HARVESTED', 'PACKED', 'SOLD', 'DAMAGED', 'WASTED', 'ADJUSTMENT', 'TRANSFERRED');
create type customer_type as enum ('wholesale', 'restaurant', 'retail', 'individual', 'distributor');
create type payment_terms as enum ('due_on_receipt', 'net_15', 'net_30');
create type order_status as enum ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');
create type sale_channel as enum ('in_person', 'online', 'wholesale', 'delivery', 'pickup');
create type payment_method as enum ('card', 'cash', 'transfer', 'invoice');
create type expense_category as enum ('substrate', 'spawn', 'electricity', 'water', 'rent', 'labor', 'packaging', 'transportation', 'equipment', 'maintenance', 'marketing', 'insurance', 'other');
create type task_status as enum ('TODO', 'IN_PROGRESS', 'COMPLETED');
create type task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
create type equipment_status as enum ('operational', 'maintenance_due', 'offline');
create type alert_severity as enum ('critical', 'warning', 'info');
create type alert_status as enum ('NEW', 'ACKNOWLEDGED', 'RESOLVED');

-- ---------- Organization ----------
create table farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table farm_members (
  farm_id uuid not null references farms (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role app_role not null default 'EMPLOYEE',
  created_at timestamptz not null default now(),
  primary key (farm_id, user_id)
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  user_id uuid references profiles (id),
  name text not null,
  role text not null,
  phone text,
  email text,
  active boolean not null default true
);

create table user_preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  dashboard_layout jsonb not null default '[]'::jsonb,
  locale text,
  theme text,
  updated_at timestamptz not null default now()
);

-- ---------- Growing ----------
create table mushroom_species (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  name text not null,
  scientific_name text,
  incubation_temp_min numeric(5, 1),
  incubation_temp_max numeric(5, 1),
  fruiting_temp_min numeric(5, 1),
  fruiting_temp_max numeric(5, 1),
  humidity_min numeric(5, 1),
  humidity_max numeric(5, 1),
  co2_min int,
  co2_max int,
  average_yield numeric(5, 3) not null check (average_yield >= 0),
  average_grow_days int not null check (average_grow_days > 0),
  shelf_life_days int not null check (shelf_life_days > 0),
  color_index int not null default 0
);

create table grow_rooms (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  name text not null,
  type room_type not null,
  target_temp_min numeric(5, 1) not null,
  target_temp_max numeric(5, 1) not null,
  target_humidity_min numeric(5, 1) not null,
  target_humidity_max numeric(5, 1) not null,
  target_co2_min int not null,
  target_co2_max int not null,
  check (target_temp_min <= target_temp_max and target_humidity_min <= target_humidity_max and target_co2_min <= target_co2_max)
);

-- Hardware-agnostic: any vendor or gateway can register a sensor.
create table sensors (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  room_id uuid not null references grow_rooms (id) on delete cascade,
  provider text not null,
  external_id text not null,
  last_seen_at timestamptz,
  unique (provider, external_id)
);

create table environmental_readings (
  id bigint generated always as identity primary key,
  farm_id uuid not null references farms (id) on delete cascade,
  room_id uuid not null references grow_rooms (id) on delete cascade,
  sensor_id uuid not null references sensors (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  temperature numeric(5, 2),
  humidity numeric(5, 2),
  co2 int
);
create index environmental_readings_room_time on environmental_readings (room_id, recorded_at desc);

create table production_batches (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  code text not null,
  species_id uuid not null references mushroom_species (id),
  room_id uuid not null references grow_rooms (id),
  substrate text not null,
  substrate_weight numeric(10, 2) not null check (substrate_weight > 0),
  spawn_weight numeric(10, 2) not null check (spawn_weight >= 0),
  bags int not null check (bags >= 0),
  spawn_date timestamptz not null,
  inoculation_date timestamptz,
  colonization_date timestamptz,
  fruiting_date timestamptz,
  expected_harvest_date timestamptz not null,
  status batch_status not null default 'PLANNED',
  cost numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (farm_id, code)
);

create table harvests (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  batch_id uuid not null references production_batches (id),
  room_id uuid not null references grow_rooms (id),
  harvested_at timestamptz not null default now(),
  wet_weight numeric(10, 2) not null check (wet_weight > 0),
  waste_weight numeric(10, 2) not null default 0 check (waste_weight >= 0 and waste_weight <= wet_weight),
  grade harvest_grade not null,
  employee_id uuid references employees (id),
  created_by uuid references profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- Inventory ----------
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  name text not null,
  email text,
  phone text
);

create table inventory_locations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  name text not null,
  kind location_kind not null
);

create table inventory_products (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  sku text not null,
  name text not null,
  species_id uuid references mushroom_species (id),
  category product_category not null,
  unit inventory_unit not null,
  unit_weight numeric(10, 3),
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  price numeric(12, 2) not null default 0 check (price >= 0),
  reorder_point numeric(10, 2) not null default 0,
  location_id uuid references inventory_locations (id),
  perishable boolean not null default false,
  unique (farm_id, sku)
);

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  product_id uuid not null references inventory_products (id),
  type movement_type not null,
  quantity numeric(12, 2) not null check (quantity <> 0),
  batch_id uuid references production_batches (id),
  expires_at timestamptz,
  from_location_id uuid references inventory_locations (id),
  to_location_id uuid references inventory_locations (id),
  reference text,
  user_id uuid references profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index inventory_movements_product on inventory_movements (product_id, created_at);

-- Stock on hand, always derived.
create view inventory_stock with (security_invoker = true) as
  select p.farm_id, p.id as product_id, coalesce(sum(m.quantity), 0) as quantity
  from inventory_products p
  left join inventory_movements m on m.product_id = p.id
  group by p.farm_id, p.id;

-- No negative stock unless it is an explicit, documented ADJUSTMENT.
create function enforce_non_negative_stock() returns trigger language plpgsql as $$
declare current_qty numeric;
begin
  select coalesce(sum(quantity), 0) into current_qty from inventory_movements where product_id = new.product_id;
  if current_qty + new.quantity < 0 and not (new.type = 'ADJUSTMENT' and coalesce(trim(new.reference), '') <> '') then
    raise exception 'Insufficient stock for product % (on hand %, change %)', new.product_id, current_qty, new.quantity;
  end if;
  return new;
end $$;
create trigger inventory_movements_stock before insert on inventory_movements
  for each row execute function enforce_non_negative_stock();

-- ---------- Sales ----------
create table customers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  name text not null,
  company text,
  type customer_type not null,
  email text,
  phone text,
  payment_terms payment_terms not null default 'due_on_receipt'
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  code text not null,
  customer_id uuid references customers (id),
  channel sale_channel not null,
  status order_status not null default 'PENDING',
  discount numeric(5, 4) not null default 0 check (discount between 0 and 1),
  tax_rate numeric(5, 4) not null default 0 check (tax_rate between 0 and 1),
  payment_method payment_method not null,
  paid boolean not null default false,
  fulfillment text not null check (fulfillment in ('pickup', 'delivery')),
  due_at timestamptz,
  processed_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (farm_id, code)
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid not null references inventory_products (id),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  -- Cost captured at sale time so COGS never changes retroactively.
  unit_cost numeric(12, 2) not null check (unit_cost >= 0)
);

-- ---------- Finance ----------
create table expenses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  spent_at timestamptz not null,
  category expense_category not null,
  description text not null,
  amount numeric(12, 2) not null,
  vendor text,
  supplier_id uuid references suppliers (id),
  payment_method payment_method not null,
  -- A correction references the expense it reverses.
  corrects_id uuid references expenses (id),
  created_by uuid references profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- Operations ----------
create table equipment (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  room_id uuid references grow_rooms (id),
  name text not null,
  kind text not null,
  serial text,
  status equipment_status not null default 'operational',
  next_maintenance timestamptz
);

create table farm_tasks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  title text not null,
  status task_status not null default 'TODO',
  priority task_priority not null default 'MEDIUM',
  assignee_id uuid references employees (id),
  due_at timestamptz,
  related_batch_id uuid references production_batches (id)
);

-- Alerts: `key` identifies the cause (e.g. humidity_low:<room>) so status survives re-evaluation.
create table alerts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  key text not null,
  type text not null,
  severity alert_severity not null,
  status alert_status not null default 'NEW',
  location text,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_by uuid references profiles (id),
  acknowledged_at timestamptz,
  resolved_by uuid references profiles (id),
  resolved_at timestamptz
);
create unique index alerts_open_key on alerts (farm_id, key) where status <> 'RESOLVED';

create table audit_log (
  id bigint generated always as identity primary key,
  farm_id uuid not null references farms (id) on delete cascade,
  user_id uuid references profiles (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_farm_time on audit_log (farm_id, created_at desc);

-- ---------- Append-only history ----------
create function forbid_change() returns trigger language plpgsql as $$
begin
  raise exception '% is append-only: insert a correcting record instead', tg_table_name;
end $$;

create trigger harvests_append_only before update or delete on harvests for each row execute function forbid_change();
create trigger inventory_movements_append_only before update or delete on inventory_movements for each row execute function forbid_change();
create trigger expenses_append_only before update or delete on expenses for each row execute function forbid_change();
create trigger audit_log_append_only before update or delete on audit_log for each row execute function forbid_change();

-- ---------- Audit trail ----------
create function write_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (farm_id, user_id, action, entity, entity_id, old_value, new_value)
  values (
    coalesce(new.farm_id, old.farm_id),
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_batches after insert or update or delete on production_batches for each row execute function write_audit();
create trigger audit_harvests after insert on harvests for each row execute function write_audit();
create trigger audit_movements after insert on inventory_movements for each row execute function write_audit();
create trigger audit_products after insert or update or delete on inventory_products for each row execute function write_audit();
create trigger audit_orders after insert or update or delete on orders for each row execute function write_audit();
create trigger audit_expenses after insert on expenses for each row execute function write_audit();
create trigger audit_alerts after update on alerts for each row execute function write_audit();

-- ---------- Row Level Security ----------
create function is_farm_member(target_farm uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from farm_members where farm_id = target_farm and user_id = auth.uid());
$$;

create function has_farm_role(target_farm uuid, roles app_role[]) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from farm_members where farm_id = target_farm and user_id = auth.uid() and role = any (roles));
$$;

alter table farms enable row level security;
alter table profiles enable row level security;
alter table farm_members enable row level security;
alter table user_preferences enable row level security;

create policy "members read their farms" on farms for select using (is_farm_member(id));
create policy "owners update their farms" on farms for update using (has_farm_role(id, array['OWNER']::app_role[]));
create policy "read own profile and teammates" on profiles for select using (
  id = auth.uid() or exists (select 1 from farm_members a join farm_members b on a.farm_id = b.farm_id where a.user_id = auth.uid() and b.user_id = profiles.id)
);
create policy "update own profile" on profiles for update using (id = auth.uid());
create policy "members read memberships" on farm_members for select using (is_farm_member(farm_id));
create policy "owners manage memberships" on farm_members for all using (has_farm_role(farm_id, array['OWNER']::app_role[])) with check (has_farm_role(farm_id, array['OWNER']::app_role[]));
create policy "own preferences" on user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Farm-scoped tables: members read; writers depend on the area.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('employees',              array['OWNER','FARM_MANAGER']),
      ('mushroom_species',       array['OWNER','FARM_MANAGER','GROWER']),
      ('grow_rooms',             array['OWNER','FARM_MANAGER']),
      ('sensors',                array['OWNER','FARM_MANAGER']),
      ('environmental_readings', array['OWNER','FARM_MANAGER']),
      ('production_batches',     array['OWNER','FARM_MANAGER','GROWER']),
      ('harvests',               array['OWNER','FARM_MANAGER','GROWER','EMPLOYEE']),
      ('suppliers',              array['OWNER','FARM_MANAGER','ACCOUNTING']),
      ('inventory_locations',    array['OWNER','FARM_MANAGER']),
      ('inventory_products',     array['OWNER','FARM_MANAGER','SALES']),
      ('inventory_movements',    array['OWNER','FARM_MANAGER','GROWER','PACKING','SALES']),
      ('customers',              array['OWNER','FARM_MANAGER','SALES']),
      ('orders',                 array['OWNER','FARM_MANAGER','SALES']),
      ('order_items',            array['OWNER','FARM_MANAGER','SALES']),
      ('expenses',               array['OWNER','FARM_MANAGER','ACCOUNTING']),
      ('equipment',              array['OWNER','FARM_MANAGER']),
      ('farm_tasks',             array['OWNER','FARM_MANAGER','GROWER','PACKING']),
      ('alerts',                 array['OWNER','FARM_MANAGER','GROWER'])
    ) as t(tbl, writers)
  loop
    execute format('alter table %I enable row level security', spec.tbl);
    execute format('create policy "members read" on %I for select using (is_farm_member(farm_id))', spec.tbl);
    execute format('create policy "writers insert" on %I for insert with check (has_farm_role(farm_id, %L::app_role[]))', spec.tbl, spec.writers);
    execute format('create policy "writers update" on %I for update using (has_farm_role(farm_id, %L::app_role[]))', spec.tbl, spec.writers);
  end loop;
end $$;

-- Financial data is restricted to roles that may see it.
drop policy "members read" on expenses;
create policy "finance roles read" on expenses for select using (has_farm_role(farm_id, array['OWNER','FARM_MANAGER','ACCOUNTING']::app_role[]));

alter table audit_log enable row level security;
create policy "managers read audit" on audit_log for select using (has_farm_role(farm_id, array['OWNER','FARM_MANAGER','ACCOUNTING']::app_role[]));

-- Live dashboard updates (Supabase Realtime).
alter publication supabase_realtime add table environmental_readings, alerts, harvests, inventory_movements, orders;

-- ===== supabase/migrations/20261005000100_auth_onboarding_ingestion.sql =====
-- =====================================================================
-- Profiles on sign-up, farm creation, and sensor ingestion.
-- =====================================================================

-- Every new auth user gets a profile.
create function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- A signed-in user creates a farm and becomes its OWNER.
create function create_farm(p_name text, p_location text default null, p_timezone text default 'UTC') returns uuid
  language plpgsql security definer set search_path = public as $$
declare new_farm uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into farms (name, location, timezone) values (p_name, p_location, p_timezone) returning id into new_farm;
  insert into farm_members (farm_id, user_id, role) values (new_farm, auth.uid(), 'OWNER');
  return new_farm;
end $$;
revoke all on function create_farm(text, text, text) from public, anon;
grant execute on function create_farm(text, text, text) to authenticated;

-- Device tokens live in their own table: RLS on, no policies, so no client
-- role can ever read them. Only the functions below touch it.
create table sensor_secrets (
  sensor_id uuid primary key references sensors (id) on delete cascade,
  token_hash text not null
);
alter table sensor_secrets enable row level security;

-- Hardware-agnostic ingestion: a device (or gateway) posts readings with its
-- own token. No user session and no service_role key are needed.
--   POST /rest/v1/rpc/ingest_reading  { provider, external_id, token, temperature, humidity, co2 }
create function ingest_reading(
  p_provider text, p_external_id text, p_token text,
  p_temperature numeric, p_humidity numeric, p_co2 int, p_recorded_at timestamptz default now()
) returns void
  language plpgsql security definer set search_path = public, extensions as $$
declare
  s sensors;
  h text;
begin
  select * into s from sensors where provider = p_provider and external_id = p_external_id;
  select token_hash into h from sensor_secrets where sensor_id = s.id;
  if s.id is null or h is null or crypt(p_token, h) <> h then
    raise exception 'Unknown sensor or invalid token';
  end if;
  if p_recorded_at > now() + interval '5 minutes' then raise exception 'Reading is in the future'; end if;
  insert into environmental_readings (farm_id, room_id, sensor_id, recorded_at, temperature, humidity, co2)
  values (s.farm_id, s.room_id, s.id, p_recorded_at, p_temperature, p_humidity, p_co2);
  update sensors set last_seen_at = greatest(coalesce(last_seen_at, p_recorded_at), p_recorded_at) where id = s.id;
end $$;
revoke all on function ingest_reading(text, text, text, numeric, numeric, int, timestamptz) from public;
grant execute on function ingest_reading(text, text, text, numeric, numeric, int, timestamptz) to anon, authenticated;

-- Managers register a sensor token (stored only as a hash).
create function set_sensor_token(p_sensor uuid, p_token text) returns void
  language plpgsql security definer set search_path = public, extensions as $$
declare f uuid;
begin
  select farm_id into f from sensors where id = p_sensor;
  if f is null or not has_farm_role(f, array['OWNER','FARM_MANAGER']::app_role[]) then raise exception 'Not allowed'; end if;
  if length(p_token) < 24 then raise exception 'Token must be at least 24 characters'; end if;
  insert into sensor_secrets (sensor_id, token_hash) values (p_sensor, crypt(p_token, gen_salt('bf')))
  on conflict (sensor_id) do update set token_hash = excluded.token_hash;
end $$;
revoke all on function set_sensor_token(uuid, text) from public, anon;
grant execute on function set_sensor_token(uuid, text) to authenticated;

-- ===== supabase/migrations/20261005000200_hardening.sql =====
-- =====================================================================
-- Hardening after the Supabase security & performance advisors.
-- =====================================================================

-- Fixed search_path on trigger helpers.
alter function forbid_change() set search_path = public;
alter function enforce_non_negative_stock() set search_path = public;

-- Trigger functions are not meant to be called through the API.
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function write_audit() from public, anon, authenticated;
revoke execute on function forbid_change() from public, anon, authenticated;
revoke execute on function enforce_non_negative_stock() from public, anon, authenticated;

-- RLS helpers move to a schema the Data API does not expose. Policies keep
-- working (they reference the functions, not their names).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
alter function is_farm_member(uuid) set schema private;
alter function has_farm_role(uuid, app_role[]) set schema private;
alter function private.is_farm_member(uuid) set search_path = public;
alter function private.has_farm_role(uuid, app_role[]) set search_path = public;
revoke all on function private.is_farm_member(uuid) from public;
revoke all on function private.has_farm_role(uuid, app_role[]) from public;
grant execute on function private.is_farm_member(uuid) to anon, authenticated;
grant execute on function private.has_farm_role(uuid, app_role[]) to anon, authenticated;

create or replace function set_sensor_token(p_sensor uuid, p_token text) returns void
  language plpgsql security definer set search_path = public, extensions as $$
declare f uuid;
begin
  select farm_id into f from sensors where id = p_sensor;
  if f is null or not private.has_farm_role(f, array['OWNER','FARM_MANAGER']::app_role[]) then raise exception 'Not allowed'; end if;
  if length(p_token) < 24 then raise exception 'Token must be at least 24 characters'; end if;
  insert into sensor_secrets (sensor_id, token_hash) values (p_sensor, crypt(p_token, gen_salt('bf')))
  on conflict (sensor_id) do update set token_hash = excluded.token_hash;
end $$;

-- Evaluate auth.uid() once per query, not per row.
drop policy "read own profile and teammates" on profiles;
create policy "read own profile and teammates" on profiles for select using (
  id = (select auth.uid())
  or exists (select 1 from farm_members a join farm_members b on a.farm_id = b.farm_id where a.user_id = (select auth.uid()) and b.user_id = profiles.id)
);
drop policy "update own profile" on profiles;
create policy "update own profile" on profiles for update using (id = (select auth.uid()));
drop policy "own preferences" on user_preferences;
create policy "own preferences" on user_preferences for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- One permissive policy per action on farm_members.
drop policy "owners manage memberships" on farm_members;
create policy "owners add members" on farm_members for insert with check (private.has_farm_role(farm_id, array['OWNER']::app_role[]));
create policy "owners change members" on farm_members for update using (private.has_farm_role(farm_id, array['OWNER']::app_role[]));
create policy "owners remove members" on farm_members for delete using (private.has_farm_role(farm_id, array['OWNER']::app_role[]));

-- Indexes for farm-scoped queries and foreign keys.
create index on farm_members (user_id);
create index on employees (farm_id);
create index on mushroom_species (farm_id);
create index on grow_rooms (farm_id);
create index on sensors (farm_id);
create index on sensors (room_id);
create index on environmental_readings (farm_id, recorded_at desc);
create index on environmental_readings (sensor_id, recorded_at desc);
create index on production_batches (farm_id, spawn_date);
create index on production_batches (species_id);
create index on production_batches (room_id);
create index on harvests (farm_id, harvested_at);
create index on harvests (batch_id);
create index on suppliers (farm_id);
create index on inventory_locations (farm_id);
create index on inventory_products (farm_id);
create index on inventory_products (species_id);
create index on inventory_movements (farm_id, created_at);
create index on inventory_movements (batch_id);
create index on customers (farm_id);
create index on orders (farm_id, created_at);
create index on orders (customer_id);
create index on order_items (order_id);
create index on order_items (product_id);
create index on order_items (farm_id);
create index on expenses (farm_id, spent_at);
create index on equipment (farm_id);
create index on farm_tasks (farm_id);
create index on farm_tasks (assignee_id);

-- ===== supabase/migrations/20261005000300_business_operations.sql =====
-- =====================================================================
-- Atomic business operations (called from the app with the user's session;
-- SECURITY INVOKER, so RLS and role rules still apply).
-- =====================================================================

-- ---------- Orders ----------

-- Stock leaves when an order ships or completes; cancelling a shipped order
-- returns it with a compensating movement (movements are never edited).
create or replace function set_order_status(p_order uuid, p_status order_status) returns void
  language plpgsql security invoker set search_path = public as $$
declare
  o orders;
  shipped boolean;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if o.status in ('COMPLETED', 'CANCELLED') then raise exception 'Order is closed' using errcode = 'P0001'; end if;
  select exists (select 1 from inventory_movements where farm_id = o.farm_id and type = 'SOLD' and reference = o.code) into shipped;
  if p_status in ('OUT_FOR_DELIVERY', 'COMPLETED') and not shipped then
    insert into inventory_movements (farm_id, product_id, type, quantity, reference, from_location_id)
    select o.farm_id, i.product_id, 'SOLD', -i.quantity, o.code, p.location_id
    from order_items i join inventory_products p on p.id = i.product_id
    where i.order_id = o.id;
  elsif p_status = 'CANCELLED' and shipped then
    insert into inventory_movements (farm_id, product_id, type, quantity, reference, to_location_id)
    select o.farm_id, i.product_id, 'ADJUSTMENT', i.quantity, o.code || ' cancelled — returned to stock', p.location_id
    from order_items i join inventory_products p on p.id = i.product_id
    where i.order_id = o.id;
  end if;
  update orders
     set status = p_status,
         paid = case when p_status = 'COMPLETED' and payment_method <> 'invoice' then true else paid end
   where id = o.id;
end $$;

-- p_items: [{ "product_id": uuid, "quantity": number, "unit_price": number }]
create or replace function create_order(
  p_farm uuid, p_customer uuid, p_channel sale_channel, p_payment payment_method, p_fulfillment text,
  p_discount numeric, p_tax numeric, p_due timestamptz, p_items jsonb, p_status order_status default 'CONFIRMED'
) returns text
  language plpgsql security invoker set search_path = public as $$
declare
  new_id uuid;
  new_code text;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then raise exception 'An order needs at least one item'; end if;
  select 'ORD-' || (coalesce(max(substring(code from 5)::int), 1000) + 1) into new_code
    from orders where farm_id = p_farm and code ~ '^ORD-[0-9]+$';
  insert into orders (farm_id, code, customer_id, channel, status, discount, tax_rate, payment_method, fulfillment, due_at, processed_by)
  values (p_farm, new_code, p_customer, p_channel, 'CONFIRMED', p_discount, p_tax, p_payment, p_fulfillment, p_due, auth.uid())
  returning id into new_id;
  -- Unit cost is captured at sale time so COGS never changes later.
  insert into order_items (farm_id, order_id, product_id, quantity, unit_price, unit_cost)
  select p_farm, new_id, p.id, (i ->> 'quantity')::numeric, coalesce((i ->> 'unit_price')::numeric, p.price), p.cost
  from jsonb_array_elements(p_items) i
  join inventory_products p on p.id = (i ->> 'product_id')::uuid and p.farm_id = p_farm;
  if p_status <> 'CONFIRMED' then perform set_order_status(new_id, p_status); end if;
  return new_code;
end $$;

-- ---------- Harvest & packing ----------

create or replace function record_harvest(
  p_batch uuid, p_wet numeric, p_waste numeric, p_grade harvest_grade, p_employee uuid, p_harvested_at timestamptz default now()
) returns uuid
  language plpgsql security invoker set search_path = public as $$
declare
  b production_batches;
  prod inventory_products;
  shelf int;
  new_id uuid;
  net numeric := p_wet - p_waste;
begin
  select * into b from production_batches where id = p_batch;
  if b.id is null then raise exception 'Batch not found' using errcode = 'P0002'; end if;
  if b.status not in ('FRUITING', 'READY_TO_HARVEST', 'HARVESTED') then raise exception 'Only fruiting batches can be harvested'; end if;
  select * into prod from inventory_products
   where farm_id = b.farm_id and species_id = b.species_id and unit = 'lb' and category in ('fresh', 'dried')
   order by (category = 'fresh') desc limit 1;
  if prod.id is null then raise exception 'No bulk product exists for this species'; end if;
  select shelf_life_days into shelf from mushroom_species where id = b.species_id;
  insert into harvests (farm_id, batch_id, room_id, harvested_at, wet_weight, waste_weight, grade, employee_id)
  values (b.farm_id, b.id, b.room_id, p_harvested_at, p_wet, p_waste, p_grade, p_employee)
  returning id into new_id;
  insert into inventory_movements (farm_id, product_id, type, quantity, batch_id, expires_at, to_location_id, reference, created_at)
  values (
    b.farm_id, prod.id, 'HARVESTED',
    round(case when prod.category = 'dried' then net * 0.35 else net end, 2),
    b.id,
    case when prod.perishable then p_harvested_at + make_interval(days => coalesce(shelf, 7)) end,
    prod.location_id, 'Harvest ' || b.code, p_harvested_at
  );
  if b.status in ('FRUITING', 'READY_TO_HARVEST') then update production_batches set status = 'HARVESTED' where id = b.id; end if;
  return new_id;
end $$;

create or replace function pack_product(p_source uuid, p_target uuid, p_units int) returns void
  language plpgsql security invoker set search_path = public as $$
declare
  s inventory_products;
  t inventory_products;
  shelf int;
  lb numeric;
begin
  select * into s from inventory_products where id = p_source;
  select * into t from inventory_products where id = p_target;
  if s.id is null or t.id is null or s.farm_id <> t.farm_id then raise exception 'Product not found' using errcode = 'P0002'; end if;
  if p_units <= 0 or t.unit_weight is null or s.unit <> 'lb' then raise exception 'Invalid packing'; end if;
  lb := round(p_units * t.unit_weight, 2);
  select shelf_life_days into shelf from mushroom_species where id = t.species_id;
  insert into inventory_movements (farm_id, product_id, type, quantity, from_location_id, reference)
  values (s.farm_id, s.id, 'PACKED', -lb, s.location_id, 'Packed into ' || t.sku);
  insert into inventory_movements (farm_id, product_id, type, quantity, to_location_id, expires_at, reference)
  values (t.farm_id, t.id, 'PACKED', p_units, t.location_id, case when t.perishable then now() + make_interval(days => coalesce(shelf, 7)) end, 'From ' || s.sku);
end $$;

-- ---------- Demo data loading ----------

alter table farms add column if not exists demo_loaded_at timestamptz;

-- While a farm owner loads the sample data set, audit and stock triggers stand
-- aside (the generated history is already consistent and back-dated).
create or replace function write_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('app.seeding', true) = 'on' then return coalesce(new, old); end if;
  insert into audit_log (farm_id, user_id, action, entity, entity_id, old_value, new_value)
  values (
    coalesce(new.farm_id, old.farm_id), auth.uid(), lower(tg_op), tg_table_name, coalesce(new.id, old.id),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create or replace function enforce_non_negative_stock() returns trigger language plpgsql set search_path = public as $$
declare current_qty numeric;
begin
  if current_setting('app.seeding', true) = 'on' then return new; end if;
  select coalesce(sum(quantity), 0) into current_qty from inventory_movements where product_id = new.product_id;
  if current_qty + new.quantity < 0 and not (new.type = 'ADJUSTMENT' and coalesce(trim(new.reference), '') <> '') then
    raise exception 'Insufficient stock for product % (on hand %, change %)', new.product_id, current_qty, new.quantity using errcode = 'P0003';
  end if;
  return new;
end $$;

-- One table at a time; only the farm's OWNER, only on a new farm that has
-- not loaded demo data yet. finish_demo_load() closes the window.
create or replace function load_demo_rows(p_farm uuid, p_table text, p_rows jsonb) returns void
  language plpgsql security invoker set search_path = public as $$
declare cols text;
begin
  if not private.has_farm_role(p_farm, array['OWNER']::app_role[]) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if exists (select 1 from farms where id = p_farm and (demo_loaded_at is not null or created_at < now() - interval '1 day')) then
    raise exception 'Demo data can only be loaded into a new, empty farm';
  end if;
  if p_table not in ('employees', 'mushroom_species', 'grow_rooms', 'sensors', 'inventory_locations', 'inventory_products', 'suppliers', 'customers',
                     'production_batches', 'harvests', 'inventory_movements', 'orders', 'order_items', 'expenses', 'equipment', 'farm_tasks', 'environmental_readings') then
    raise exception 'Table not allowed';
  end if;
  if jsonb_array_length(coalesce(p_rows, '[]'::jsonb)) = 0 then return; end if;
  -- Only columns present in the payload are inserted; the rest keep their defaults.
  select string_agg(quote_ident(k), ', ') into cols
    from (select jsonb_object_keys(r) k from jsonb_array_elements(p_rows) r union select 'farm_id') keys;
  perform set_config('app.seeding', 'on', true);
  execute format(
    'insert into %1$I (%2$s) select %2$s from jsonb_populate_recordset(null::%1$I, (select jsonb_agg(r || jsonb_build_object(''farm_id'', %3$L)) from jsonb_array_elements($1) r))',
    p_table, cols, p_farm
  ) using p_rows;
  perform set_config('app.seeding', 'off', true);
end $$;

create or replace function finish_demo_load(p_farm uuid) returns void
  language plpgsql security invoker set search_path = public as $$
begin
  if not private.has_farm_role(p_farm, array['OWNER']::app_role[]) then raise exception 'Not allowed' using errcode = '42501'; end if;
  update farms set demo_loaded_at = now() where id = p_farm;
end $$;

revoke all on function set_order_status(uuid, order_status) from public, anon;
revoke all on function create_order(uuid, uuid, sale_channel, payment_method, text, numeric, numeric, timestamptz, jsonb, order_status) from public, anon;
revoke all on function record_harvest(uuid, numeric, numeric, harvest_grade, uuid, timestamptz) from public, anon;
revoke all on function pack_product(uuid, uuid, int) from public, anon;
revoke all on function load_demo_rows(uuid, text, jsonb) from public, anon;
revoke all on function finish_demo_load(uuid) from public, anon;
grant execute on function set_order_status(uuid, order_status) to authenticated;
grant execute on function create_order(uuid, uuid, sale_channel, payment_method, text, numeric, numeric, timestamptz, jsonb, order_status) to authenticated;
grant execute on function record_harvest(uuid, numeric, numeric, harvest_grade, uuid, timestamptz) to authenticated;
grant execute on function pack_product(uuid, uuid, int) to authenticated;
grant execute on function load_demo_rows(uuid, text, jsonb) to authenticated;
grant execute on function finish_demo_load(uuid) to authenticated;
revoke execute on function write_audit() from public, anon, authenticated;
revoke execute on function enforce_non_negative_stock() from public, anon, authenticated;
