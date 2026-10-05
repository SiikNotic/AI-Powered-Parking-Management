-- =====================================================================
-- DEMO ONLY: keeps the demo farm's sensors "alive" so Realtime updates can
-- be seen on the dashboard. Every 5 minutes it adds one reading per demo
-- sensor (provider = 'demo'), drifting slightly from the previous one. The
-- Processing Area sensor is left silent on purpose (offline alert).
-- Remove with:  select cron.unschedule('demo-sensor-simulator');
-- Real sensors post through ingest_reading() instead.
-- =====================================================================
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
  -- Keep two weeks of demo readings.
  delete from environmental_readings er using sensors se
  where er.sensor_id = se.id and se.provider = 'demo' and er.recorded_at < now() - interval '14 days';
end $$;
revoke all on function simulate_demo_readings() from public, anon, authenticated;

select cron.schedule('demo-sensor-simulator', '*/5 * * * *', 'select simulate_demo_readings()');
