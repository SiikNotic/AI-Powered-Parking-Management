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
