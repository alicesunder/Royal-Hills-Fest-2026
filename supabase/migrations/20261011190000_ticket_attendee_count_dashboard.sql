-- Extend the protected staff parking dashboard with ticket counts and attendee names.
-- General tickets count as one person; each VIP ticket represents one six-seat table.
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
  v_normal_people integer;
  v_vip_tables integer;
  v_vip_people integer;
begin
  if not ticketing_private.is_ticket_admin(p_staff_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where nullif(pg_catalog.btrim(v.parking_zone), '') is not null
    )::integer,
    count(*) filter (where v.arrival_verified_at is not null)::integer,
    count(*) filter (where tt.code = 'tt-normal')::integer,
    count(*) filter (where tt.code = 'tt-vip')::integer
  into v_total, v_assigned, v_arrived, v_normal_people, v_vip_tables
  from ticketing_private.vehicle_passes v
  join public.tickets t on t.id = v.ticket_id
  join public.ticket_types tt on tt.id = t.ticket_type_id
  where v.status = 'active';

  -- The official VIP ticket is a table pass for six seats, so report seat entitlement
  -- separately from the number of guest names the table owner has supplied.
  v_vip_people := v_vip_tables * 6;

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
      'attendee_names', coalesce((
        select pg_catalog.jsonb_agg(
          case
            when pg_catalog.jsonb_typeof(guest.value) = 'string' then guest.value
            else pg_catalog.to_jsonb(coalesce(guest.value->>'name', ''))
          end
          order by guest.ordinality
        )
        from pg_catalog.jsonb_array_elements(
          case
            when pg_catalog.jsonb_typeof(t.attendee_data) = 'array' then t.attendee_data
            else '[]'::jsonb
          end
        ) with ordinality as guest(value, ordinality)
      ), '[]'::jsonb),
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
      'arrived', v_arrived,
      'normal_people', v_normal_people,
      'vip_tables', v_vip_tables,
      'vip_people', v_vip_people,
      'total_people', v_normal_people + v_vip_people
    )
  );
end;
$function$;
