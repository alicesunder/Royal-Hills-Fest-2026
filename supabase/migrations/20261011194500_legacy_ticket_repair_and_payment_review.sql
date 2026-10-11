-- Repair tooling for valid legacy tickets and explicit handling of obsolete payment-review holds.
-- No existing order or attendee record is deleted by this migration.

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
  v_legacy_missing integer;
begin
  if not ticketing_private.is_ticket_admin(p_staff_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select
    count(*)::integer,
    count(*) filter (where nullif(pg_catalog.btrim(v.parking_zone), '') is not null)::integer,
    count(*) filter (where v.arrival_verified_at is not null)::integer
  into v_total, v_assigned, v_arrived
  from ticketing_private.vehicle_passes v
  join public.tickets t on t.id = v.ticket_id
  join public.orders o on o.id = v.order_id
  where v.status = 'active'
    and o.status = 'paid'
    and t.status in ('issued', 'checked_in', 'wristband_issued');

  -- Attendance counts come from issued tickets, including legacy tickets that do not
  -- yet have a vehicle pass. VIP inventory is one six-seat table per issued VIP ticket.
  select
    count(*) filter (where tt.code = 'tt-normal')::integer,
    count(*) filter (where tt.code = 'tt-vip')::integer
  into v_normal_people, v_vip_tables
  from public.tickets t
  join public.orders o on o.id = t.order_id
  join public.ticket_types tt on tt.id = t.ticket_type_id
  where o.status = 'paid'
    and t.status in ('issued', 'checked_in', 'wristband_issued');

  select count(*)::integer
    into v_legacy_missing
  from public.tickets t
  join public.orders o on o.id = t.order_id
  where o.status = 'paid'
    and t.status in ('issued', 'checked_in', 'wristband_issued')
    and not exists (
      select 1
      from ticketing_private.vehicle_passes vp
      where vp.ticket_id = t.id
        and vp.status = 'active'
    );

  v_vip_people := v_vip_tables * 6;

  with rows as (
    select
      v.registration_code,
      t.ticket_code,
      o.order_number,
      tt.code as ticket_type,
      v.owner_rank,
      v.owner_name,
      v.owner_phone,
      v.owner_email,
      v.organization,
      v.affiliation,
      v.vehicle_plate,
      v.parking_zone,
      v.parking_slot,
      v.status,
      v.arrival_verified_at,
      v.scan_count,
      v.created_at,
      t.attendee_data,
      true as has_vehicle_pass
    from ticketing_private.vehicle_passes v
    join public.tickets t on t.id = v.ticket_id
    join public.orders o on o.id = v.order_id
    join public.ticket_types tt on tt.id = t.ticket_type_id
    where v.status = 'active'
      and o.status = 'paid'
      and t.status in ('issued', 'checked_in', 'wristband_issued')

    union all

    select
      'LEGACY-' || t.ticket_code as registration_code,
      t.ticket_code,
      o.order_number,
      tt.code as ticket_type,
      coalesce(t.attendee_data->0->>'rank', '') as owner_rank,
      coalesce(nullif(t.attendee_data->0->>'name', ''), nullif(t.attendee_name, ''), o.customer_name) as owner_name,
      coalesce(nullif(t.attendee_data->0->>'phone', ''), o.customer_phone, '') as owner_phone,
      coalesce(nullif(t.attendee_data->0->>'email', ''), o.customer_email, '') as owner_email,
      coalesce(t.attendee_data->0->>'organization', '') as organization,
      coalesce(t.attendee_data->0->>'affiliation', '') as affiliation,
      coalesce(t.attendee_data->0->>'vehiclePlate', '') as vehicle_plate,
      null::text as parking_zone,
      null::text as parking_slot,
      'legacy_missing_vehicle'::text as status,
      null::timestamptz as arrival_verified_at,
      0::integer as scan_count,
      t.created_at,
      t.attendee_data,
      false as has_vehicle_pass
    from public.tickets t
    join public.orders o on o.id = t.order_id
    join public.ticket_types tt on tt.id = t.ticket_type_id
    where o.status = 'paid'
      and t.status in ('issued', 'checked_in', 'wristband_issued')
      and not exists (
        select 1
        from ticketing_private.vehicle_passes vp
        where vp.ticket_id = t.id
          and vp.status = 'active'
      )
  )
  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'registration_code', r.registration_code,
      'ticket_code', r.ticket_code,
      'order_number', r.order_number,
      'ticket_type', r.ticket_type,
      'owner_rank', r.owner_rank,
      'owner_name', r.owner_name,
      'owner_phone', r.owner_phone,
      'owner_email', r.owner_email,
      'organization', r.organization,
      'affiliation', r.affiliation,
      'vehicle_plate', r.vehicle_plate,
      'parking_zone', r.parking_zone,
      'parking_slot', r.parking_slot,
      'status', r.status,
      'arrival_verified_at', r.arrival_verified_at,
      'scan_count', r.scan_count,
      'created_at', r.created_at,
      'has_vehicle_pass', r.has_vehicle_pass,
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
            when pg_catalog.jsonb_typeof(r.attendee_data) = 'array' then r.attendee_data
            else '[]'::jsonb
          end
        ) with ordinality as guest(value, ordinality)
      ), '[]'::jsonb)
    )
    order by r.created_at desc
  ), '[]'::jsonb)
  into v_vehicles
  from (
    select *
    from rows
    order by created_at desc
    limit v_limit
  ) r;

  return pg_catalog.jsonb_build_object(
    'vehicles', v_vehicles,
    'stats', pg_catalog.jsonb_build_object(
      'total', v_total,
      'assigned', v_assigned,
      'arrived', v_arrived,
      'normal_people', v_normal_people,
      'vip_tables', v_vip_tables,
      'vip_people', v_vip_people,
      'total_people', v_normal_people + v_vip_people,
      'legacy_missing_vehicle', v_legacy_missing
    )
  );
end;
$function$;

create or replace function ticketing_private.admin_register_legacy_vehicle_pass(
  p_staff_id uuid,
  p_ticket_code text,
  p_owner_rank text,
  p_owner_name text,
  p_owner_phone text,
  p_owner_email text,
  p_organization text,
  p_affiliation text,
  p_vehicle_plate text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_ticket public.tickets%rowtype;
  v_order public.orders%rowtype;
  v_existing ticketing_private.vehicle_passes%rowtype;
  v_registration_code text;
  v_vehicle_token text;
  v_vehicle_token_hash text;
  v_owner_rank text := pg_catalog.btrim(coalesce(p_owner_rank, ''));
  v_owner_name text := pg_catalog.btrim(coalesce(p_owner_name, ''));
  v_owner_phone text := pg_catalog.btrim(coalesce(p_owner_phone, ''));
  v_owner_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_owner_email, '')));
  v_organization text := pg_catalog.btrim(coalesce(p_organization, ''));
  v_affiliation text := pg_catalog.btrim(coalesce(p_affiliation, ''));
  v_vehicle_plate text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_vehicle_plate, '')));
begin
  if not ticketing_private.is_ticket_admin(p_staff_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_ticket_code is null or p_ticket_code !~ '^RHF26-[A-Z0-9-]{6,32}$' then
    raise exception 'Invalid legacy ticket code' using errcode = '22023';
  end if;
  if pg_catalog.length(v_owner_name) < 2 or pg_catalog.length(v_owner_name) > 150 then
    raise exception 'กรุณากรอกชื่อผู้ถือบัตรให้ถูกต้อง' using errcode = '22023';
  end if;
  if pg_catalog.length(v_owner_phone) < 6 or pg_catalog.length(v_owner_phone) > 40 then
    raise exception 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง' using errcode = '22023';
  end if;
  if pg_catalog.length(v_owner_email) > 254 or v_owner_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'กรุณากรอกอีเมลให้ถูกต้อง' using errcode = '22023';
  end if;
  if v_organization = '' or pg_catalog.length(v_organization) > 200
     or v_affiliation = '' or pg_catalog.length(v_affiliation) > 200 then
    raise exception 'กรุณาระบุหน่วยงานและสังกัด' using errcode = '22023';
  end if;
  if pg_catalog.length(v_vehicle_plate) < 2 or pg_catalog.length(v_vehicle_plate) > 40 then
    raise exception 'กรุณากรอกทะเบียนรถให้ถูกต้อง' using errcode = '22023';
  end if;

  select t.*, o.*
    into v_ticket, v_order
  from public.tickets t
  join public.orders o on o.id = t.order_id
  where t.ticket_code = p_ticket_code
  for update of t, o;

  if v_ticket.id is null then
    raise exception 'ไม่พบบัตรเก่าในระบบ' using errcode = 'P0002';
  end if;
  if v_order.status <> 'paid' or v_ticket.status not in ('issued', 'checked_in', 'wristband_issued') then
    raise exception 'บัตรนี้ไม่มีสถานะที่อนุญาตให้เติมข้อมูลรถ' using errcode = '22023';
  end if;

  select * into v_existing
  from ticketing_private.vehicle_passes
  where ticket_id = v_ticket.id
  for update;

  if found and v_existing.status = 'active' then
    raise exception 'บัตรนี้มีป้ายรถที่ใช้งานอยู่แล้ว' using errcode = '23505';
  end if;

  v_vehicle_token := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') ||
                     pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
  v_vehicle_token_hash := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(v_vehicle_token, 'UTF8')), 'hex'
  );

  if found then
    v_registration_code := v_existing.registration_code;
    update ticketing_private.vehicle_passes
       set qr_token_hash = v_vehicle_token_hash,
           qr_token = v_vehicle_token,
           owner_rank = v_owner_rank,
           owner_name = v_owner_name,
           owner_phone = v_owner_phone,
           owner_email = v_owner_email,
           organization = v_organization,
           affiliation = v_affiliation,
           vehicle_plate = v_vehicle_plate,
           parking_zone = null,
           parking_slot = null,
           status = 'active',
           arrival_verified_at = null,
           arrival_verified_by = null,
           scan_count = 0,
           created_at = pg_catalog.now()
     where ticket_id = v_ticket.id;
  else
    v_registration_code := 'RHF26-PARK-' ||
      pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 10));
    insert into ticketing_private.vehicle_passes(
      ticket_id, order_id, registration_code, qr_token_hash, qr_token,
      owner_rank, owner_name, owner_phone, owner_email,
      organization, affiliation, vehicle_plate
    ) values (
      v_ticket.id, v_order.id, v_registration_code, v_vehicle_token_hash, v_vehicle_token,
      v_owner_rank, v_owner_name, v_owner_phone, v_owner_email,
      v_organization, v_affiliation, v_vehicle_plate
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'registration_code', v_registration_code,
    'ticket_code', v_ticket.ticket_code,
    'vehicle_pass_created', true
  );
end;
$function$;

create or replace function public.ticketing_admin_register_legacy_vehicle_pass(
  p_staff_id uuid,
  p_ticket_code text,
  p_owner_rank text,
  p_owner_name text,
  p_owner_phone text,
  p_owner_email text,
  p_organization text,
  p_affiliation text,
  p_vehicle_plate text
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.admin_register_legacy_vehicle_pass(
    p_staff_id, p_ticket_code, p_owner_rank, p_owner_name, p_owner_phone,
    p_owner_email, p_organization, p_affiliation, p_vehicle_plate
  );
$function$;

revoke all on function ticketing_private.admin_register_legacy_vehicle_pass(uuid,text,text,text,text,text,text,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.ticketing_admin_register_legacy_vehicle_pass(uuid,text,text,text,text,text,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.ticketing_admin_register_legacy_vehicle_pass(uuid,text,text,text,text,text,text,text,text)
  to service_role;

-- A manual-review rejection must release the reserved capacity. The review event retains
-- the proof path/reference for audit; no review with a submitted proof is auto-rejected.
create or replace function public.ticketing_review_order(
  p_order_id uuid,
  p_action text,
  p_reviewer_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
  v_item record;
begin
  if not ticketing_private.is_ticket_admin(p_reviewer_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'Unsupported review action' using errcode = '22023';
  end if;

  v_result := ticketing_private.review_payment(p_order_id, p_action, p_reviewer_id, p_note);

  if p_action = 'reject' then
    for v_item in
      select oi.ticket_type_id, oi.quantity
      from public.order_items oi
      where oi.order_id = p_order_id
      order by oi.ticket_type_id
    loop
      update public.ticket_inventory
         set quantity_reserved = quantity_reserved - v_item.quantity,
             updated_at = pg_catalog.now()
       where ticket_type_id = v_item.ticket_type_id
         and quantity_reserved >= v_item.quantity;
      if not found then
        raise exception 'Reserved inventory mismatch while rejecting order %', p_order_id
          using errcode = '23514';
      end if;
    end loop;

    update public.orders
       set status = 'expired',
           updated_at = pg_catalog.now()
     where id = p_order_id
       and status = 'pending';
    if not found then
      raise exception 'Could not release rejected order reservation' using errcode = '23514';
    end if;

    v_result := v_result || pg_catalog.jsonb_build_object(
      'status', 'expired',
      'inventory_released', true
    );
  end if;

  return v_result;
end;
$function$;

revoke all on function public.ticketing_review_order(uuid,text,uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.ticketing_review_order(uuid,text,uuid,text)
  to service_role;
