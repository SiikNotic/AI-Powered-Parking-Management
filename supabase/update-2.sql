-- Mushroom Farm Manager — actualización 2: seguridad + operaciones de negocio + simulador de sensores demo.
-- Pégalo en Supabase → SQL Editor → Run (una sola vez).

-- ===== supabase/migrations/20261005000200_hardening.sql =====

alter function forbid_change() set search_path = public;
alter function enforce_non_negative_stock() set search_path = public;

revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function write_audit() from public, anon, authenticated;
revoke execute on function forbid_change() from public, anon, authenticated;
revoke execute on function enforce_non_negative_stock() from public, anon, authenticated;

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

drop policy "read own profile and teammates" on profiles;
create policy "read own profile and teammates" on profiles for select using (
  id = (select auth.uid())
  or exists (select 1 from farm_members a join farm_members b on a.farm_id = b.farm_id where a.user_id = (select auth.uid()) and b.user_id = profiles.id)
);
drop policy "update own profile" on profiles;
create policy "update own profile" on profiles for update using (id = (select auth.uid()));
drop policy "own preferences" on user_preferences;
create policy "own preferences" on user_preferences for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "owners manage memberships" on farm_members;
create policy "owners add members" on farm_members for insert with check (private.has_farm_role(farm_id, array['OWNER']::app_role[]));
create policy "owners change members" on farm_members for update using (private.has_farm_role(farm_id, array['OWNER']::app_role[]));
create policy "owners remove members" on farm_members for delete using (private.has_farm_role(farm_id, array['OWNER']::app_role[]));

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
  insert into order_items (farm_id, order_id, product_id, quantity, unit_price, unit_cost)
  select p_farm, new_id, p.id, (i ->> 'quantity')::numeric, coalesce((i ->> 'unit_price')::numeric, p.price), p.cost
  from jsonb_array_elements(p_items) i
  join inventory_products p on p.id = (i ->> 'product_id')::uuid and p.farm_id = p_farm;
  if p_status <> 'CONFIRMED' then perform set_order_status(new_id, p_status); end if;
  return new_code;
end $$;


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


alter table farms add column if not exists demo_loaded_at timestamptz;

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

-- ===== supabase/seed/demo_sensor_simulator.sql =====
create extension if not exists pg_cron;

create or replace function simulate_demo_readings() returns void
  language plpgsql security definer set search_path = public as $$
declare s record;
begin
  for s in
    select se.id as sensor_id, se.room_id, se.farm_id, r.temperature, r.humidity, r.co2
    from sensors se
    join lateral (
      select temperature, humidity, co2 from environmental_readings er
      where er.sensor_id = se.id order by recorded_at desc limit 1
    ) r on true
    where se.provider = 'demo' and se.external_id not like '%SNS-PROCESSING'
  loop
    insert into environmental_readings (farm_id, room_id, sensor_id, recorded_at, temperature, humidity, co2)
    values (
      s.farm_id, s.room_id, s.sensor_id, now(),
      round((s.temperature + (random() - 0.5) * 0.3)::numeric, 1),
      round(least(99, s.humidity + (random() - 0.5) * 0.7)::numeric, 1),
      greatest(350, round(s.co2 + (random() - 0.5) * 24))::int
    );
    update sensors set last_seen_at = now() where id = s.sensor_id;
  end loop;
  delete from environmental_readings er using sensors se
  where er.sensor_id = se.id and se.provider = 'demo' and er.recorded_at < now() - interval '14 days';
end $$;
revoke all on function simulate_demo_readings() from public, anon, authenticated;

select cron.schedule('demo-sensor-simulator', '*/5 * * * *', 'select simulate_demo_readings()');
