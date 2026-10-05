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
  incubation_temp numrange,
  fruiting_temp numrange,
  humidity numrange,
  co2 numrange,
  average_yield numeric(5, 3) not null check (average_yield >= 0),
  average_grow_days int not null check (average_grow_days > 0),
  shelf_life_days int not null check (shelf_life_days > 0)
);

create table grow_rooms (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms (id) on delete cascade,
  name text not null,
  type room_type not null,
  target_temperature numrange not null,
  target_humidity numrange not null,
  target_co2 numrange not null
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
