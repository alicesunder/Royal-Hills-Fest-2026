
-- Royal Hills Fest 2026 manual PromptPay review workflow.
-- Ticket sales remain inactive until the genuine QR asset and admin account are configured.

create schema if not exists ticketing_private;
revoke all on schema ticketing_private from public, anon, authenticated;
grant usage on schema ticketing_private to service_role;

alter table public.orders
  add column if not exists payment_reference text,
  add column if not exists payment_proof_path text,
  add column if not exists payment_submitted_at timestamptz,
  add column if not exists payment_reviewed_at timestamptz,
  add column if not exists payment_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists payment_review_note text;
alter table public.orders alter column expires_at set default (now() + interval '30 minutes');
alter table public.order_items add column if not exists attendee_data jsonb not null default '[]'::jsonb;
alter table public.tickets add column if not exists attendee_data jsonb not null default '[]'::jsonb;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status = any (array['pending','awaiting_review','paid','expired','cancelled','refunded']));

create index if not exists orders_payment_review_idx
  on public.orders(status, payment_submitted_at desc)
  where status = 'awaiting_review';

create table if not exists ticketing_private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table ticketing_private.admin_users enable row level security;
revoke all on table ticketing_private.admin_users from public, anon, authenticated, service_role;

create table if not exists ticketing_private.ticket_tokens (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  token_value text not null unique,
  created_at timestamptz not null default now()
);
alter table ticketing_private.ticket_tokens enable row level security;
revoke all on table ticketing_private.ticket_tokens from public, anon, authenticated, service_role;

create table if not exists ticketing_private.payment_review_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  reviewer_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('approved','rejected')),
  note text,
  payment_reference text,
  proof_path text,
  created_at timestamptz not null default now()
);
alter table ticketing_private.payment_review_events enable row level security;
revoke all on table ticketing_private.payment_review_events from public, anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

insert into public.ticket_types (code, name, description, price_thb, max_per_order, is_active, sort_order)
values
  ('tt-normal', 'บัตรปกติ', 'บัตรเข้าร่วมงานทั่วไป 1 ท่าน', 555, 10, false, 1),
  ('tt-vip', 'บัตร VIP', 'VIP 1 โต๊ะ สำหรับผู้เข้าร่วมสูงสุด 6 คน', 5555, 6, false, 2)
on conflict (code) do nothing;

insert into public.ticket_inventory (ticket_type_id, capacity_total, quantity_sold, quantity_reserved)
select id, case code when 'tt-normal' then 500 when 'tt-vip' then 20 end, 0, 0
from public.ticket_types
where code in ('tt-normal','tt-vip')
on conflict (ticket_type_id) do nothing;

-- Attach attendee data inside the same transaction as the existing inventory reservation.
create or replace function ticketing_private.reserve_order_with_attendees(
  p_order_number text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_idempotency_key text,
  p_lookup_token_hash text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_result jsonb;
  v_order_id uuid;
  v_item record;
begin
  v_result := ticketing_private.reserve_order(
    p_order_number, p_customer_name, p_customer_email, p_customer_phone,
    p_idempotency_key, p_lookup_token_hash, p_items
  );
  if coalesce(v_result->>'idempotent_replay','false') = 'true' then
    return v_result;
  end if;
  v_order_id := (v_result->>'order_id')::uuid;

  for v_item in
    select x.ticket_type_id, x.attendee_data
      from pg_catalog.jsonb_to_recordset(p_items)
      as x(ticket_type_id uuid, quantity integer, attendee_data jsonb)
  loop
    if pg_catalog.jsonb_typeof(v_item.attendee_data) <> 'array' then
      raise exception 'Attendee data must be an array' using errcode = '22023';
    end if;
    update public.order_items
       set attendee_data = v_item.attendee_data
     where order_id = v_order_id and ticket_type_id = v_item.ticket_type_id;
  end loop;

  return v_result;
end;
$function$;

create or replace function ticketing_private.submit_payment_proof(
  p_order_number text,
  p_lookup_token_hash text,
  p_payment_reference text,
  p_proof_path text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
begin
  perform ticketing_private.expire_pending_orders();

  select * into v_order
    from public.orders
   where order_number = p_order_number
     and lookup_token_hash = p_lookup_token_hash
   for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'This order is not accepting payment proofs' using errcode = '22023';
  end if;
  if v_order.expires_at <= pg_catalog.now() then
    raise exception 'This order has expired. Please contact the event team before transferring.'
      using errcode = '22023';
  end if;
  if pg_catalog.length(pg_catalog.btrim(coalesce(p_payment_reference, ''))) < 4
     or pg_catalog.length(pg_catalog.btrim(coalesce(p_payment_reference, ''))) > 100 then
    raise exception 'Please enter a valid transfer reference' using errcode = '22023';
  end if;
  if p_proof_path is null or pg_catalog.strpos(p_proof_path, '/') < 1 then
    raise exception 'Payment proof file is required' using errcode = '22023';
  end if;

  update public.orders
     set status = 'awaiting_review',
         payment_reference = pg_catalog.btrim(p_payment_reference),
         payment_proof_path = p_proof_path,
         payment_submitted_at = pg_catalog.now(),
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'order_number', v_order.order_number,
    'status', 'awaiting_review',
    'amount_total_thb', v_order.amount_total_thb,
    'payment_submitted_at', pg_catalog.now()
  );
end;
$function$;

create or replace function ticketing_private.is_ticket_admin(p_user_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $function$
  select exists (
    select 1 from ticketing_private.admin_users a
     where a.user_id = p_user_id and a.enabled = true
  );
$function$;

create or replace function ticketing_private.review_payment(
  p_order_id uuid,
  p_action text,
  p_reviewer_id uuid,
  p_note text
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
  v_token text;
  v_token_hash text;
  v_attendee_data jsonb;
  v_attendee_name text;
  v_ticket_count integer := 0;
  v_idx integer;
begin
  if p_action not in ('approve','reject') then
    raise exception 'Unsupported review action' using errcode = '22023';
  end if;
  if not ticketing_private.is_ticket_admin(p_reviewer_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.status <> 'awaiting_review' then
    raise exception 'Order is not waiting for payment review' using errcode = '22023';
  end if;

  insert into ticketing_private.payment_review_events(
    order_id, reviewer_id, action, note, payment_reference, proof_path
  ) values (
    v_order.id, p_reviewer_id,
    case when p_action = 'approve' then 'approved' else 'rejected' end,
    nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
    v_order.payment_reference, v_order.payment_proof_path
  );

  if p_action = 'reject' then
    update public.orders
       set status = 'pending',
           payment_reviewed_at = pg_catalog.now(),
           payment_reviewed_by = p_reviewer_id,
           payment_review_note = nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
           payment_proof_path = null,
           payment_reference = null,
           payment_submitted_at = null,
           updated_at = pg_catalog.now()
     where id = v_order.id;
    return pg_catalog.jsonb_build_object('order_number', v_order.order_number, 'status', 'pending', 'action', 'rejected');
  end if;

  update public.orders
     set status = 'paid',
         payment_provider = 'promptpay-manual',
         provider_payment_id = 'MANUAL-' || v_order.id::text,
         paid_at = pg_catalog.now(),
         payment_reviewed_at = pg_catalog.now(),
         payment_reviewed_by = p_reviewer_id,
         payment_review_note = nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
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
      raise exception 'Reserved inventory does not match order %', v_order.order_number using errcode = '23514';
    end if;

    for v_idx in 0..(v_item.quantity - 1) loop
      v_attendee_data := coalesce(v_item.attendee_data -> v_idx, '{}'::jsonb);
      if v_item.code = 'tt-normal' then
        v_attendee_name := coalesce(nullif(pg_catalog.btrim(v_attendee_data->>'attendeeName'), ''), v_order.customer_name);
        v_attendee_data := pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object('seatNumber', 1, 'name', v_attendee_name, 'checkedIn', false, 'wristbandIssued', false)
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

  return pg_catalog.jsonb_build_object(
    'order_number', v_order.order_number, 'status', 'paid', 'action', 'approved',
    'tickets_issued', v_ticket_count, 'paid_at', pg_catalog.now()
  );
end;
$function$;

create or replace function ticketing_private.get_customer_order(
  p_order_number text,
  p_lookup_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
stable
as $function$
declare
  v_order public.orders%rowtype;
  v_result jsonb;
begin
  select * into v_order
    from public.orders
   where order_number = p_order_number
     and lookup_token_hash = p_lookup_token_hash;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  select pg_catalog.jsonb_build_object(
    'order', pg_catalog.jsonb_build_object(
      'id', v_order.id,
      'order_number', v_order.order_number,
      'status', v_order.status,
      'customer_name', v_order.customer_name,
      'customer_email', v_order.customer_email,
      'customer_phone', v_order.customer_phone,
      'amount_total_thb', v_order.amount_total_thb,
      'created_at', v_order.created_at,
      'expires_at', v_order.expires_at,
      'paid_at', v_order.paid_at,
      'payment_reference', v_order.payment_reference,
      'payment_submitted_at', v_order.payment_submitted_at,
      'payment_review_note', v_order.payment_review_note
    ),
    'items', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'ticket_type_id', oi.ticket_type_id, 'code', tt.code, 'name', tt.name,
        'quantity', oi.quantity, 'unit_price_thb', oi.unit_price_thb,
        'line_total_thb', oi.line_total_thb, 'attendee_data', oi.attendee_data
      ) order by tt.sort_order)
        from public.order_items oi join public.ticket_types tt on tt.id = oi.ticket_type_id
       where oi.order_id = v_order.id
    ), '[]'::jsonb),
    'tickets', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', t.id, 'ticket_code', t.ticket_code, 'ticket_type_id', t.ticket_type_id,
        'attendee_name', t.attendee_name, 'attendee_data', t.attendee_data,
        'status', t.status, 'issued_at', t.issued_at, 'checked_in_at', t.checked_in_at,
        'qr_token', tk.token_value
      ) order by t.issued_at, t.ticket_code)
        from public.tickets t
        join ticketing_private.ticket_tokens tk on tk.ticket_id = t.id
       where t.order_id = v_order.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

create or replace function public.ticketing_reserve_order(
  p_order_number text, p_customer_name text, p_customer_email text, p_customer_phone text,
  p_idempotency_key text, p_lookup_token_hash text, p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
  v_order_id uuid;
  v_item record;
begin
  v_result := ticketing_private.reserve_order_with_attendees(
    p_order_number, p_customer_name, p_customer_email, p_customer_phone,
    p_idempotency_key, p_lookup_token_hash, p_items
  );
  if coalesce(v_result->>'idempotent_replay','false') = 'true' then
    return v_result;
  end if;
  v_order_id := (v_result->>'order_id')::uuid;
  for v_item in
    select x.ticket_type_id, x.attendee_data
      from pg_catalog.jsonb_to_recordset(p_items)
      as x(ticket_type_id uuid, quantity integer, attendee_data jsonb)
  loop
    update public.order_items
       set attendee_data = v_item.attendee_data
     where order_id = v_order_id and ticket_type_id = v_item.ticket_type_id;
  end loop;
  return v_result;
end;
$function$;

create or replace function public.ticketing_submit_payment_proof(
  p_order_number text, p_lookup_token_hash text, p_payment_reference text, p_proof_path text
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.submit_payment_proof(
    p_order_number, p_lookup_token_hash, p_payment_reference, p_proof_path
  );
$function$;

create or replace function public.ticketing_is_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.is_ticket_admin(p_user_id);
$function$;

create or replace function public.ticketing_review_order(
  p_order_id uuid, p_action text, p_reviewer_id uuid, p_note text default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.review_payment(p_order_id, p_action, p_reviewer_id, p_note);
$function$;

create or replace function public.ticketing_get_customer_order(
  p_order_number text, p_lookup_token_hash text
)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $function$
  select ticketing_private.get_customer_order(p_order_number, p_lookup_token_hash);
$function$;

create or replace function public.ticketing_expire_orders()
returns integer
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.expire_pending_orders();
$function$;

revoke all on function ticketing_private.reserve_order_with_attendees(text,text,text,text,text,text,jsonb) from public, anon, authenticated, service_role;
revoke all on function ticketing_private.submit_payment_proof(text,text,text,text) from public, anon, authenticated, service_role;
revoke all on function ticketing_private.is_ticket_admin(uuid) from public, anon, authenticated, service_role;
revoke all on function ticketing_private.review_payment(uuid,text,uuid,text) from public, anon, authenticated, service_role;
revoke all on function ticketing_private.get_customer_order(text,text) from public, anon, authenticated, service_role;

revoke all on function public.ticketing_reserve_order(text,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.ticketing_submit_payment_proof(text,text,text,text) from public, anon, authenticated;
revoke all on function public.ticketing_is_admin(uuid) from public, anon, authenticated;
revoke all on function public.ticketing_review_order(uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.ticketing_get_customer_order(text,text) from public, anon, authenticated;
revoke all on function public.ticketing_expire_orders() from public, anon, authenticated;

grant execute on function public.ticketing_reserve_order(text,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.ticketing_submit_payment_proof(text,text,text,text) to service_role;
grant execute on function public.ticketing_is_admin(uuid) to service_role;
grant execute on function public.ticketing_review_order(uuid,text,uuid,text) to service_role;
grant execute on function public.ticketing_get_customer_order(text,text) to service_role;
grant execute on function public.ticketing_expire_orders() to service_role;
