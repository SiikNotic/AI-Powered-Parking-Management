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
