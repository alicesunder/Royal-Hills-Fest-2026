-- Authenticated staff tools for assigning parking zones and bays.
create unique index if not exists vehicle_passes_parking_slot_unique_idx
  on ticketing_private.vehicle_passes (parking_zone, parking_slot)
  where status = 'active'
    and nullif(pg_catalog.btrim(parking_zone), '') is not null
    and nullif(pg_catalog.btrim(parking_slot), '') is not null;

create or replace function ticketing_private.admin_list_vehicle_passes(
  p_staff_id uuid,
  p_limit integer default 200
)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 200), 1), 500);
  v_vehicles jsonb;
  v_total integer;
  v_assigned integer;
  v_arrived integer;
begin
  if not ticketing_private.is_ticket_admin(p_staff_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select count(*)::integer,
         count(*) filter (where nullif(pg_catalog.btrim(parking_zone), '') is not null)::integer,
         count(*) filter (where arrival_verified_at is not null)::integer
    into v_total, v_assigned, v_arrived
    from ticketing_private.vehicle_passes
   where status = 'active';

  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'registration_code', v.registration_code,
      'ticket_code', t.ticket_code,
      'order_number', o.order_number,
      'ticket_type', tt.code,
      'owner_rank', v.owner_rank,
      'owner_name', v.owner_name,
      'owner_phone', v.owner_phone,
      'owner_email', v.owner_email,
      'organization', v.organization,
      'affiliation', v.affiliation,
      'vehicle_plate', v.vehicle_plate,
      'parking_zone', v.parking_zone,
      'parking_slot', v.parking_slot,
      'status', v.status,
      'arrival_verified_at', v.arrival_verified_at,
      'scan_count', v.scan_count,
      'created_at', v.created_at
    )
    order by v.created_at desc
  ), '[]'::jsonb)
    into v_vehicles
    from (
      select *
        from ticketing_private.vehicle_passes
       where status = 'active'
       order by created_at desc
       limit v_limit
    ) v
    join public.tickets t on t.id = v.ticket_id
    join public.orders o on o.id = v.order_id
    join public.ticket_types tt on tt.id = t.ticket_type_id;

  return pg_catalog.jsonb_build_object(
    'vehicles', v_vehicles,
    'stats', pg_catalog.jsonb_build_object(
      'total', v_total,
      'assigned', v_assigned,
      'arrived', v_arrived
    )
  );
end;
$function$;

create or replace function public.ticketing_admin_vehicle_passes(
  p_staff_id uuid,
  p_limit integer default 200
)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $function$
  select ticketing_private.admin_list_vehicle_passes(p_staff_id, p_limit);
$function$;

create or replace function ticketing_private.assign_vehicle_parking(
  p_staff_id uuid,
  p_registration_code text,
  p_parking_zone text,
  p_parking_slot text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_pass ticketing_private.vehicle_passes%rowtype;
  v_zone text := nullif(pg_catalog.btrim(coalesce(p_parking_zone, '')), '');
  v_slot text := nullif(pg_catalog.btrim(coalesce(p_parking_slot, '')), '');
begin
  if not ticketing_private.is_ticket_admin(p_staff_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_registration_code is null or pg_catalog.length(pg_catalog.btrim(p_registration_code)) < 6
     or pg_catalog.length(pg_catalog.btrim(p_registration_code)) > 64 then
    raise exception 'Invalid parking pass reference' using errcode = '22023';
  end if;
  if v_slot is not null and v_zone is null then
    raise exception 'A parking zone is required when assigning a bay' using errcode = '22023';
  end if;
  if pg_catalog.length(coalesce(v_zone,'')) > 100 or pg_catalog.length(coalesce(v_slot,'')) > 100 then
    raise exception 'Parking zone or bay is too long' using errcode = '22023';
  end if;

  update ticketing_private.vehicle_passes
     set parking_zone = v_zone,
         parking_slot = v_slot
   where registration_code = pg_catalog.btrim(p_registration_code)
     and status = 'active'
  returning * into v_pass;

  if not found then
    raise exception 'Active vehicle pass not found' using errcode = 'P0002';
  end if;

  return pg_catalog.jsonb_build_object(
    'registration_code', v_pass.registration_code,
    'vehicle_plate', v_pass.vehicle_plate,
    'owner_name', v_pass.owner_name,
    'organization', v_pass.organization,
    'affiliation', v_pass.affiliation,
    'parking_zone', v_pass.parking_zone,
    'parking_slot', v_pass.parking_slot
  );
exception
  when unique_violation then
    raise exception 'ช่องจอดนี้ถูกจัดสรรให้รถคันอื่นแล้ว กรุณาเลือกช่องจอดใหม่' using errcode = '23505';
end;
$function$;

create or replace function public.ticketing_assign_vehicle_parking(
  p_staff_id uuid,
  p_registration_code text,
  p_parking_zone text,
  p_parking_slot text
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.assign_vehicle_parking(
    p_staff_id, p_registration_code, p_parking_zone, p_parking_slot
  );
$function$;

revoke all on function ticketing_private.admin_list_vehicle_passes(uuid,integer)
  from public, anon, authenticated, service_role;
revoke all on function public.ticketing_admin_vehicle_passes(uuid,integer)
  from public, anon, authenticated;
grant execute on function public.ticketing_admin_vehicle_passes(uuid,integer)
  to service_role;

revoke all on function ticketing_private.assign_vehicle_parking(uuid,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.ticketing_assign_vehicle_parking(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.ticketing_assign_vehicle_parking(uuid,text,text,text)
  to service_role;
