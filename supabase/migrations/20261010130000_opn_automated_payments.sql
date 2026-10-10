-- Automated Opn/Omise payments: claim/link provider charges and issue tickets only after verified successful payment.
create or replace function ticketing_private.claim_provider_payment(
  p_order_number text,
  p_lookup_token_hash text,
  p_attempt_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_claim_ref text;
  v_started_epoch bigint;
begin
  if p_order_number is null or length(p_order_number) > 40
     or p_lookup_token_hash is null or length(p_lookup_token_hash) <> 64
     or p_attempt_token is null or p_attempt_token !~ '^[a-f0-9-]{36}$' then
    raise exception 'Invalid payment claim input' using errcode = '22023';
  end if;

  select * into v_order
    from public.orders
   where order_number = p_order_number
     and lookup_token_hash = p_lookup_token_hash
   for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status = 'paid' then
    return pg_catalog.jsonb_build_object('state', 'already_paid', 'order_number', v_order.order_number);
  end if;

  if v_order.status <> 'pending' then
    raise exception 'This order is not awaiting payment' using errcode = '22023';
  end if;

  if v_order.expires_at <= pg_catalog.now() then
    raise exception 'This order has expired. Please create a new order.' using errcode = '22023';
  end if;

  if v_order.payment_provider = 'omise'
     and v_order.provider_payment_id ~ '^chrg_(test_)?[A-Za-z0-9]+$' then
    return pg_catalog.jsonb_build_object(
      'state', 'existing',
      'order_number', v_order.order_number,
      'provider_payment_id', v_order.provider_payment_id
    );
  end if;

  if v_order.provider_payment_id like 'creating:%' then
    begin
      v_started_epoch := pg_catalog.split_part(v_order.provider_payment_id, ':', 2)::bigint;
    exception when others then
      v_started_epoch := 0;
    end;
    if v_started_epoch > 0
       and pg_catalog.now() - pg_catalog.to_timestamp(v_started_epoch) < interval '90 seconds' then
      return pg_catalog.jsonb_build_object('state', 'in_progress', 'order_number', v_order.order_number);
    end if;
  end if;

  v_claim_ref := 'creating:' || pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.clock_timestamp()))::bigint::text || ':' || p_attempt_token;
  update public.orders
     set payment_provider = 'omise',
         provider_payment_id = v_claim_ref,
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'state', 'claimed',
    'order_number', v_order.order_number,
    'claim_ref', v_claim_ref,
    'amount_total_thb', v_order.amount_total_thb,
    'expires_at', v_order.expires_at
  );
end;
$function$;

create or replace function public.ticketing_claim_provider_payment(
  p_order_number text,
  p_lookup_token_hash text,
  p_attempt_token text
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.claim_provider_payment(p_order_number, p_lookup_token_hash, p_attempt_token);
$function$;

create or replace function ticketing_private.set_provider_payment(
  p_order_number text,
  p_lookup_token_hash text,
  p_claim_ref text,
  p_provider_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
begin
  if p_provider_payment_id is null or p_provider_payment_id !~ '^chrg_(test_)?[A-Za-z0-9]+$' then
    raise exception 'Invalid provider payment ID' using errcode = '22023';
  end if;

  select * into v_order
    from public.orders
   where order_number = p_order_number
     and lookup_token_hash = p_lookup_token_hash
   for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status = 'paid' and v_order.payment_provider = 'omise'
     and v_order.provider_payment_id = p_provider_payment_id then
    return pg_catalog.jsonb_build_object('state', 'already_paid', 'order_number', v_order.order_number);
  end if;

  if v_order.status <> 'pending' or v_order.payment_provider <> 'omise'
     or v_order.provider_payment_id is distinct from p_claim_ref then
    raise exception 'Payment claim is no longer valid' using errcode = '22023';
  end if;

  update public.orders
     set provider_payment_id = p_provider_payment_id,
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'state', 'linked',
    'order_number', v_order.order_number,
    'provider_payment_id', p_provider_payment_id
  );
end;
$function$;

create or replace function public.ticketing_set_provider_payment(
  p_order_number text,
  p_lookup_token_hash text,
  p_claim_ref text,
  p_provider_payment_id text
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.set_provider_payment(p_order_number, p_lookup_token_hash, p_claim_ref, p_provider_payment_id);
$function$;

create or replace function ticketing_private.release_provider_payment_claim(
  p_order_number text,
  p_lookup_token_hash text,
  p_claim_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order_id uuid;
begin
  update public.orders
     set payment_provider = null,
         provider_payment_id = null,
         updated_at = pg_catalog.now()
   where order_number = p_order_number
     and lookup_token_hash = p_lookup_token_hash
     and status = 'pending'
     and payment_provider = 'omise'
     and provider_payment_id = p_claim_ref
  returning id into v_order_id;

  return pg_catalog.jsonb_build_object('released', v_order_id is not null);
end;
$function$;

create or replace function public.ticketing_release_provider_payment_claim(
  p_order_number text,
  p_lookup_token_hash text,
  p_claim_ref text
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.release_provider_payment_claim(p_order_number, p_lookup_token_hash, p_claim_ref);
$function$;

create or replace function ticketing_private.complete_provider_payment(
  p_order_number text,
  p_provider_payment_id text,
  p_amount_subunits bigint,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_ticket_id uuid;
  v_ticket_code text;
  v_token text;
  v_token_hash text;
  v_attendee_data jsonb;
  v_attendee_name text;
  v_ticket_count integer := 0;
  v_idx integer;
begin
  if p_order_number is null or length(p_order_number) > 40
     or p_provider_payment_id is null or p_provider_payment_id !~ '^chrg_(test_)?[A-Za-z0-9]+$'
     or p_amount_subunits is null or p_amount_subunits < 1
     or upper(coalesce(p_currency, '')) <> 'THB' then
    raise exception 'Invalid provider payment details' using errcode = '22023';
  end if;

  select * into v_order
    from public.orders
   where order_number = p_order_number
   for update;

  if not found then
    raise exception 'Order not found for provider payment' using errcode = 'P0002';
  end if;

  if v_order.status = 'paid'
     and v_order.payment_provider = 'omise'
     and v_order.provider_payment_id = p_provider_payment_id then
    return pg_catalog.jsonb_build_object(
      'state', 'already_paid',
      'order_number', v_order.order_number,
      'tickets_issued', (select pg_catalog.count(*) from public.tickets where order_id = v_order.id)
    );
  end if;

  if v_order.payment_provider is distinct from 'omise'
     or (
       v_order.provider_payment_id is distinct from p_provider_payment_id
       and v_order.provider_payment_id not like 'creating:%'
     ) then
    raise exception 'Provider payment does not match the active order charge' using errcode = '22023';
  end if;

  -- The verified webhook may win a rare race against the charge-link request.
  if v_order.provider_payment_id like 'creating:%' then
    update public.orders
       set provider_payment_id = p_provider_payment_id,
           updated_at = pg_catalog.now()
     where id = v_order.id;
    v_order.provider_payment_id := p_provider_payment_id;
  end if;

  if p_amount_subunits <> pg_catalog.round(v_order.amount_total_thb * 100)::bigint then
    update public.orders
       set status = 'awaiting_review',
           payment_reference = 'OPN:' || p_provider_payment_id,
           payment_submitted_at = coalesce(payment_submitted_at, pg_catalog.now()),
           payment_review_note = 'AUTO_PAYMENT_AMOUNT_MISMATCH: ยอดที่ยืนยันจากผู้ให้บริการไม่ตรงกับยอดคำสั่งซื้อ ต้องตรวจสอบก่อนออกบัตร',
           updated_at = pg_catalog.now()
     where id = v_order.id;
    return pg_catalog.jsonb_build_object('state', 'needs_manual_review', 'order_number', v_order.order_number);
  end if;

  if v_order.status = 'expired' then
    -- Re-reserve stock only if every item is still available. A nested block rolls
    -- back partial reservations if any line no longer has sufficient inventory.
    begin
      for v_item in
        select oi.ticket_type_id, oi.quantity
          from public.order_items oi
         where oi.order_id = v_order.id
         order by oi.ticket_type_id
      loop
        update public.ticket_inventory
           set quantity_reserved = quantity_reserved + v_item.quantity,
               updated_at = pg_catalog.now()
         where ticket_type_id = v_item.ticket_type_id
           and capacity_total >= quantity_sold + quantity_reserved + v_item.quantity;
        if not found then
          raise exception 'Late payment cannot re-reserve inventory' using errcode = 'P0001';
        end if;
      end loop;
    exception when sqlstate 'P0001' then
      update public.orders
         set status = 'awaiting_review',
             payment_reference = 'OPN:' || p_provider_payment_id,
             payment_submitted_at = coalesce(payment_submitted_at, pg_catalog.now()),
             payment_review_note = 'AUTO_PAYMENT_LATE_STOCK: ได้รับการยืนยันชำระเงินหลังคำสั่งซื้อหมดอายุ แต่สต็อกไม่พอสำหรับออกบัตรอัตโนมัติ ต้องตรวจสอบการคืนเงินหรือจัดการโดยผู้จัดงาน',
             updated_at = pg_catalog.now()
       where id = v_order.id;
      return pg_catalog.jsonb_build_object('state', 'needs_manual_review', 'order_number', v_order.order_number);
    end;
  end if;

  if v_order.status not in ('pending', 'awaiting_review', 'expired') then
    raise exception 'Order cannot be completed from its current status' using errcode = '22023';
  end if;

  -- A previous failed/partial automation must never cause the same order to issue twice.
  update public.orders
     set status = 'paid',
         payment_provider = 'omise',
         provider_payment_id = p_provider_payment_id,
         payment_reference = 'OPN:' || p_provider_payment_id,
         paid_at = pg_catalog.now(),
         payment_review_note = null,
         updated_at = pg_catalog.now()
   where id = v_order.id;

  for v_item in
    select oi.id as order_item_id, oi.ticket_type_id, oi.quantity, oi.attendee_data, tt.code
      from public.order_items oi
      join public.ticket_types tt on tt.id = oi.ticket_type_id
     where oi.order_id = v_order.id
     order by oi.ticket_type_id
  loop
    update public.ticket_inventory
       set quantity_reserved = quantity_reserved - v_item.quantity,
           quantity_sold = quantity_sold + v_item.quantity,
           updated_at = pg_catalog.now()
     where ticket_type_id = v_item.ticket_type_id
       and quantity_reserved >= v_item.quantity;

    if not found then
      raise exception 'Reserved inventory does not match provider-paid order %', v_order.order_number
        using errcode = '23514';
    end if;

    for v_idx in 0..(v_item.quantity - 1) loop
      v_attendee_data := coalesce(v_item.attendee_data -> v_idx, '{}'::jsonb);

      if v_item.code = 'tt-normal' then
        v_attendee_name := coalesce(nullif(pg_catalog.btrim(v_attendee_data->>'attendeeName'), ''), v_order.customer_name);
        v_attendee_data := pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'seatNumber', 1,
            'name', v_attendee_name,
            'checkedIn', false,
            'wristbandIssued', false
          )
        );
      else
        v_attendee_name := coalesce(nullif(pg_catalog.btrim(v_attendee_data->'attendeeNames'->>0), ''), v_order.customer_name);
        v_attendee_data := coalesce(v_attendee_data->'attendeeNames', '[]'::jsonb);
      end if;

      v_ticket_code := 'RHF26-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 12));
      v_token := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') ||
                 pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
      v_token_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_token, 'UTF8')), 'hex');

      insert into public.tickets(
        ticket_code, order_id, order_item_id, ticket_type_id,
        qr_token_hash, status, attendee_name, attendee_data
      ) values (
        v_ticket_code, v_order.id, v_item.order_item_id, v_item.ticket_type_id,
        v_token_hash, 'issued', v_attendee_name, v_attendee_data
      )
      returning id into v_ticket_id;

      insert into ticketing_private.ticket_tokens(ticket_id, token_value)
      values (v_ticket_id, v_token);

      v_ticket_count := v_ticket_count + 1;
    end loop;
  end loop;

  insert into ticketing_private.payment_review_events(
    order_id, reviewer_id, action, note, payment_reference, proof_path,
    reviewer_email, order_number, amount_total_thb, tickets_issued
  ) values (
    v_order.id, null, 'approved',
    'Automated approval: verified successful charge from Opn/Omise webhook',
    'OPN:' || p_provider_payment_id, null,
    'Opn/Omise automated payment', v_order.order_number,
    v_order.amount_total_thb, v_ticket_count
  );

  return pg_catalog.jsonb_build_object(
    'state', 'paid',
    'order_number', v_order.order_number,
    'tickets_issued', v_ticket_count,
    'paid_at', pg_catalog.now()
  );
end;
$function$;

create or replace function public.ticketing_complete_provider_payment(
  p_order_number text,
  p_provider_payment_id text,
  p_amount_subunits bigint,
  p_currency text
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.complete_provider_payment(
    p_order_number, p_provider_payment_id, p_amount_subunits, p_currency
  );
$function$;

revoke all on function public.ticketing_claim_provider_payment(text, text, text) from public, anon, authenticated;
revoke all on function public.ticketing_set_provider_payment(text, text, text, text) from public, anon, authenticated;
revoke all on function public.ticketing_release_provider_payment_claim(text, text, text) from public, anon, authenticated;
revoke all on function public.ticketing_complete_provider_payment(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.ticketing_claim_provider_payment(text, text, text) to service_role;
grant execute on function public.ticketing_set_provider_payment(text, text, text, text) to service_role;
grant execute on function public.ticketing_release_provider_payment_claim(text, text, text) to service_role;
grant execute on function public.ticketing_complete_provider_payment(text, text, bigint, text) to service_role;
