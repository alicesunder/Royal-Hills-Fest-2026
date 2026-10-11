-- Vehicle registration, separate parking QR, and staff verification for Royal Hills Fest 2026.
-- Do not apply to production until the matching frontend and Edge Function are ready.

create table if not exists ticketing_private.vehicle_passes (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  registration_code text not null unique,
  qr_token_hash text not null unique,
  qr_token text not null unique,
  owner_rank text not null default '',
  owner_name text not null,
  owner_phone text not null,
  owner_email text not null,
  organization text not null,
  affiliation text not null,
  vehicle_plate text not null,
  parking_zone text,
  parking_slot text,
  status text not null default 'active' check (status in ('active','cancelled')),
  arrival_verified_at timestamptz,
  arrival_verified_by uuid references auth.users(id) on delete set null,
  scan_count integer not null default 0 check (scan_count >= 0),
  created_at timestamptz not null default now()
);
alter table ticketing_private.vehicle_passes enable row level security;
revoke all on table ticketing_private.vehicle_passes from public, anon, authenticated, service_role;

create index if not exists vehicle_passes_plate_idx
  on ticketing_private.vehicle_passes (upper(vehicle_plate));
create index if not exists vehicle_passes_owner_name_idx
  on ticketing_private.vehicle_passes (owner_name);
create index if not exists vehicle_passes_parking_idx
  on ticketing_private.vehicle_passes (parking_zone, parking_slot)
  where status = 'active';

create table if not exists ticketing_private.vehicle_pass_scans (
  id uuid primary key default gen_random_uuid(),
  vehicle_pass_ticket_id uuid references ticketing_private.vehicle_passes(ticket_id) on delete set null,
  scanned_by uuid references auth.users(id) on delete set null,
  outcome text not null check (outcome in ('accepted','duplicate','invalid','cancelled')),
  scanner_device_id text,
  scan_location text,
  request_id uuid not null unique,
  scanned_at timestamptz not null default now()
);
alter table ticketing_private.vehicle_pass_scans enable row level security;
revoke all on table ticketing_private.vehicle_pass_scans from public, anon, authenticated, service_role;

-- Replace the free ticket-issuance function to create a separate vehicle QR for each ticket/table.
create or replace function ticketing_private.register_free_order(
  p_order_number text,
  p_lookup_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_ticket_id uuid;
  v_ticket_code text;
  v_ticket_token text;
  v_ticket_token_hash text;
  v_vehicle_token text;
  v_vehicle_token_hash text;
  v_vehicle_code text;
  v_registration_data jsonb;
  v_attendee_data jsonb;
  v_attendee_name text;
  v_ticket_count integer := 0;
  v_idx integer;
begin
  if p_order_number is null
     or pg_catalog.length(p_order_number) < 6
     or pg_catalog.length(p_order_number) > 40
     or p_lookup_token_hash is null
     or p_lookup_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid free registration lookup' using errcode = '22023';
  end if;

  select * into v_order
    from public.orders
   where order_number = p_order_number
     and lookup_token_hash = p_lookup_token_hash
   for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  -- Idempotent retry: return the already-issued order and do not duplicate tickets or parking passes.
  if v_order.status = 'paid' and v_order.payment_provider = 'free-registration' then
    select count(*)::integer into v_ticket_count
      from public.tickets
     where order_id = v_order.id;

    if exists (
      select 1
        from public.tickets t
       where t.order_id = v_order.id
         and not exists (
           select 1 from ticketing_private.vehicle_passes vp where vp.ticket_id = t.id
         )
    ) then
      raise exception 'Vehicle pass data is missing; contact the event administrator' using errcode = '23514';
    end if;

    return pg_catalog.jsonb_build_object(
      'order_number', v_order.order_number,
      'order_id', v_order.id,
      'status', v_order.status,
      'amount_total_thb', v_order.amount_total_thb,
      'tickets_issued', v_ticket_count,
      'idempotent_replay', true
    );
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Order is not available for free registration' using errcode = '22023';
  end if;
  if v_order.amount_total_thb <> 0 then
    raise exception 'Only zero-value orders can use free registration' using errcode = '22023';
  end if;
  if v_order.expires_at is null or v_order.expires_at <= pg_catalog.now() then
    raise exception 'Registration reservation has expired; please create a new registration' using errcode = '22023';
  end if;

  for v_item in
    select oi.id as order_item_id, oi.ticket_type_id, oi.quantity, oi.attendee_data, tt.code
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
     where oi.order_id = v_order.id
     order by oi.ticket_type_id
  loop
    if v_item.quantity is null or v_item.quantity < 1 then
      raise exception 'Invalid registration quantity' using errcode = '22023';
    end if;

    update public.ticket_inventory
       set quantity_reserved = quantity_reserved - v_item.quantity,
           quantity_sold = quantity_sold + v_item.quantity,
           updated_at = pg_catalog.now()
     where ticket_type_id = v_item.ticket_type_id
       and quantity_reserved >= v_item.quantity;
    if not found then
      raise exception 'Reserved inventory does not match order %', v_order.order_number using errcode = '23514';
    end if;

    for v_idx in 0..(v_item.quantity - 1) loop
      v_registration_data := coalesce(v_item.attendee_data -> v_idx, '{}'::jsonb);
      v_attendee_name := coalesce(
        nullif(pg_catalog.btrim(v_registration_data->>'attendeeName'), ''),
        nullif(pg_catalog.btrim(v_registration_data->'attendeeNames'->>0), ''),
        v_order.customer_name
      );

      if pg_catalog.length(v_attendee_name) < 2
         or pg_catalog.length(pg_catalog.btrim(coalesce(v_registration_data->>'attendeePhone',''))) < 6
         or coalesce(v_registration_data->>'attendeeEmail','') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
         or pg_catalog.btrim(coalesce(v_registration_data->>'organization','')) = ''
         or pg_catalog.btrim(coalesce(v_registration_data->>'affiliation','')) = ''
         or pg_catalog.btrim(coalesce(v_registration_data->>'vehiclePlate','')) = '' then
        raise exception 'Registration profile or vehicle plate is incomplete' using errcode = '22023';
      end if;

      if v_item.code = 'tt-normal' then
        v_attendee_data := pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'seatNumber', 1,
            'name', v_attendee_name,
            'rank', coalesce(v_registration_data->>'rank',''),
            'phone', pg_catalog.btrim(v_registration_data->>'attendeePhone'),
            'email', pg_catalog.lower(pg_catalog.btrim(v_registration_data->>'attendeeEmail')),
            'organization', pg_catalog.btrim(v_registration_data->>'organization'),
            'affiliation', pg_catalog.btrim(v_registration_data->>'affiliation'),
            'vehiclePlate', pg_catalog.upper(pg_catalog.btrim(v_registration_data->>'vehiclePlate')),
            'checkedIn', false,
            'wristbandIssued', false
          )
        );
      else
        v_attendee_data := coalesce(v_registration_data->'attendeeNames', '[]'::jsonb);
      end if;

      v_ticket_code := 'RHF26-' ||
        pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 12));
      v_ticket_token := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') ||
                        pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
      v_ticket_token_hash := pg_catalog.encode(
        pg_catalog.sha256(pg_catalog.convert_to(v_ticket_token, 'UTF8')), 'hex'
      );

      insert into public.tickets(
        ticket_code, order_id, order_item_id, ticket_type_id,
        qr_token_hash, status, attendee_name, attendee_data
      ) values (
        v_ticket_code, v_order.id, v_item.order_item_id, v_item.ticket_type_id,
        v_ticket_token_hash, 'issued', v_attendee_name, v_attendee_data
      )
      returning id into v_ticket_id;

      insert into ticketing_private.ticket_tokens(ticket_id, token_value)
      values (v_ticket_id, v_ticket_token);

      v_vehicle_token := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') ||
                         pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
      v_vehicle_token_hash := pg_catalog.encode(
        pg_catalog.sha256(pg_catalog.convert_to(v_vehicle_token, 'UTF8')), 'hex'
      );
      v_vehicle_code := 'RHF26-PARK-' ||
        pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 10));

      insert into ticketing_private.vehicle_passes(
        ticket_id, order_id, registration_code, qr_token_hash, qr_token,
        owner_rank, owner_name, owner_phone, owner_email,
        organization, affiliation, vehicle_plate
      ) values (
        v_ticket_id, v_order.id, v_vehicle_code, v_vehicle_token_hash, v_vehicle_token,
        coalesce(nullif(pg_catalog.btrim(v_registration_data->>'rank'),''),''),
        v_attendee_name,
        pg_catalog.btrim(v_registration_data->>'attendeePhone'),
        pg_catalog.lower(pg_catalog.btrim(v_registration_data->>'attendeeEmail')),
        pg_catalog.btrim(v_registration_data->>'organization'),
        pg_catalog.btrim(v_registration_data->>'affiliation'),
        pg_catalog.upper(pg_catalog.btrim(v_registration_data->>'vehiclePlate'))
      );

      v_ticket_count := v_ticket_count + 1;
    end loop;
  end loop;

  if v_ticket_count < 1 then
    raise exception 'The registration does not contain any tickets' using errcode = '22023';
  end if;

  update public.orders
     set status = 'paid',
         payment_provider = 'free-registration',
         provider_payment_id = 'FREE-' || v_order.id::text,
         paid_at = pg_catalog.now(),
         payment_review_note = null,
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'order_number', v_order.order_number,
    'order_id', v_order.id,
    'status', 'paid',
    'amount_total_thb', 0,
    'tickets_issued', v_ticket_count,
    'idempotent_replay', false
  );
end;
$function$;

-- The registration key authorizes ticket lookup; only this endpoint returns the extra parking QR.
create or replace function ticketing_private.get_customer_order_with_parking(
  p_order_number text,
  p_lookup_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $function$
declare
  v_result jsonb;
  v_tickets jsonb;
begin
  v_result := ticketing_private.get_customer_order(p_order_number, p_lookup_token_hash);

  select coalesce(pg_catalog.jsonb_agg(
    case
      when vp.ticket_id is null then x.ticket
      else x.ticket || pg_catalog.jsonb_build_object(
        'parking_pass', pg_catalog.jsonb_build_object(
          'registration_code', vp.registration_code,
          'qr_token', vp.qr_token,
          'vehicle_plate', vp.vehicle_plate,
          'owner_rank', vp.owner_rank,
          'owner_name', vp.owner_name,
          'owner_phone', vp.owner_phone,
          'owner_email', vp.owner_email,
          'organization', vp.organization,
          'affiliation', vp.affiliation,
          'parking_zone', vp.parking_zone,
          'parking_slot', vp.parking_slot,
          'status', vp.status,
          'arrival_verified_at', vp.arrival_verified_at
        )
      )
    end
    order by x.ticket->>'issued_at', x.ticket->>'ticket_code'
  ), '[]'::jsonb)
    into v_tickets
    from pg_catalog.jsonb_array_elements(coalesce(v_result->'tickets', '[]'::jsonb)) as x(ticket)
    left join public.tickets t on t.ticket_code = x.ticket->>'ticket_code'
    left join ticketing_private.vehicle_passes vp on vp.ticket_id = t.id;

  return pg_catalog.jsonb_set(v_result, '{tickets}', v_tickets, true);
end;
$function$;

create or replace function public.ticketing_get_customer_order(
  p_order_number text,
  p_lookup_token_hash text
)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $function$
  select ticketing_private.get_customer_order_with_parking(p_order_number, p_lookup_token_hash);
$function$;

create or replace function ticketing_private.check_vehicle_pass(
  p_token_hash text,
  p_staff_id uuid,
  p_scanner_device_id text,
  p_scan_location text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_pass ticketing_private.vehicle_passes%rowtype;
  v_outcome text;
begin
  if not ticketing_private.is_ticket_admin(p_staff_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_request_id is null then
    raise exception 'Invalid vehicle QR request' using errcode = '22023';
  end if;

  select * into v_pass
    from ticketing_private.vehicle_passes
   where qr_token_hash = p_token_hash
   for update;

  if not found then
    insert into ticketing_private.vehicle_pass_scans(
      vehicle_pass_ticket_id, scanned_by, outcome, scanner_device_id, scan_location, request_id
    ) values (null, p_staff_id, 'invalid', nullif(p_scanner_device_id,''), nullif(p_scan_location,''), p_request_id)
    on conflict (request_id) do nothing;

    return pg_catalog.jsonb_build_object(
      'outcome', 'invalid',
      'message', 'ไม่พบข้อมูล QR ป้ายรถในระบบ'
    );
  end if;

  if v_pass.status <> 'active' then
    v_outcome := 'cancelled';
  elsif v_pass.arrival_verified_at is null then
    v_outcome := 'accepted';
    update ticketing_private.vehicle_passes
       set arrival_verified_at = pg_catalog.now(),
           arrival_verified_by = p_staff_id,
           scan_count = scan_count + 1
     where ticket_id = v_pass.ticket_id;
  else
    v_outcome := 'duplicate';
    update ticketing_private.vehicle_passes
       set scan_count = scan_count + 1
     where ticket_id = v_pass.ticket_id;
  end if;

  insert into ticketing_private.vehicle_pass_scans(
    vehicle_pass_ticket_id, scanned_by, outcome, scanner_device_id, scan_location, request_id
  ) values (
    v_pass.ticket_id, p_staff_id, v_outcome,
    nullif(p_scanner_device_id,''), nullif(p_scan_location,''), p_request_id
  ) on conflict (request_id) do nothing;

  return pg_catalog.jsonb_build_object(
    'outcome', v_outcome,
    'registration_code', v_pass.registration_code,
    'vehicle_plate', v_pass.vehicle_plate,
    'owner_rank', v_pass.owner_rank,
    'owner_name', v_pass.owner_name,
    'owner_phone', v_pass.owner_phone,
    'owner_email', v_pass.owner_email,
    'organization', v_pass.organization,
    'affiliation', v_pass.affiliation,
    'parking_zone', v_pass.parking_zone,
    'parking_slot', v_pass.parking_slot,
    'status', v_pass.status,
    'arrival_verified_at', coalesce(v_pass.arrival_verified_at, pg_catalog.now()),
    'scan_count', v_pass.scan_count + case when v_outcome in ('accepted','duplicate') then 1 else 0 end
  );
end;
$function$;

create or replace function public.ticketing_check_vehicle_pass(
  p_token_hash text,
  p_staff_id uuid,
  p_scanner_device_id text,
  p_scan_location text,
  p_request_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.check_vehicle_pass(
    p_token_hash, p_staff_id, p_scanner_device_id, p_scan_location, p_request_id
  );
$function$;

revoke all on function ticketing_private.check_vehicle_pass(text,uuid,text,text,uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.ticketing_check_vehicle_pass(text,uuid,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.ticketing_check_vehicle_pass(text,uuid,text,text,uuid)
  to service_role;

revoke all on function ticketing_private.get_customer_order_with_parking(text,text)
  from public, anon, authenticated, service_role;
