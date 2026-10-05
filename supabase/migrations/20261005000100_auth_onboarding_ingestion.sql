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
