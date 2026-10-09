-- Audit trail for ticket payment decisions and issued-ticket totals.
alter table ticketing_private.payment_review_events
  add column if not exists reviewer_email text,
  add column if not exists order_number text,
  add column if not exists amount_total_thb numeric(12,2),
  add column if not exists tickets_issued integer not null default 0;

-- Backfill the existing review event(s) so past approvals remain visible.
update ticketing_private.payment_review_events e
set reviewer_email = coalesce(e.reviewer_email, (select u.email from auth.users u where u.id = e.reviewer_id)),
    order_number = coalesce(e.order_number, (select o.order_number from public.orders o where o.id = e.order_id)),
    amount_total_thb = coalesce(e.amount_total_thb, (select o.amount_total_thb from public.orders o where o.id = e.order_id)),
    tickets_issued = case
      when e.action = 'approved' then (select count(*)::integer from public.tickets t where t.order_id = e.order_id)
      else 0
    end;

CREATE OR REPLACE FUNCTION ticketing_private.review_payment(p_order_id uuid, p_action text, p_reviewer_id uuid, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  v_event_id uuid;
  v_reviewer_email text;
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

  select u.email into v_reviewer_email
    from auth.users u
   where u.id = p_reviewer_id;

  insert into ticketing_private.payment_review_events(
    order_id, reviewer_id, action, note, payment_reference, proof_path,
    reviewer_email, order_number, amount_total_thb, tickets_issued
  ) values (
    v_order.id, p_reviewer_id,
    case when p_action = 'approve' then 'approved' else 'rejected' end,
    nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
    v_order.payment_reference, v_order.payment_proof_path,
    v_reviewer_email, v_order.order_number, v_order.amount_total_thb, 0
  )
  returning id into v_event_id;

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

  update ticketing_private.payment_review_events
     set tickets_issued = v_ticket_count
   where id = v_event_id;

  return pg_catalog.jsonb_build_object(
    'order_number', v_order.order_number, 'status', 'paid', 'action', 'approved',
    'tickets_issued', v_ticket_count, 'paid_at', pg_catalog.now()
  );
end;
$function$
;

create or replace function ticketing_private.get_payment_review_history(
  p_admin_user_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_events jsonb;
  v_approved_orders bigint;
  v_approved_tickets bigint;
  v_approved_amount numeric(12,2);
  v_review_actions bigint;
begin
  if not ticketing_private.is_ticket_admin(p_admin_user_id) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(pg_catalog.to_jsonb(history_row) order by history_row.created_at desc),
    '[]'::jsonb
  )
  into v_events
  from (
    select
      e.id,
      e.order_id,
      coalesce(e.order_number, o.order_number) as order_number,
      e.action,
      coalesce(e.reviewer_email, u.email) as reviewer_email,
      e.amount_total_thb,
      e.tickets_issued,
      e.note,
      e.payment_reference,
      e.created_at,
      o.customer_name,
      o.customer_email
    from ticketing_private.payment_review_events e
    left join public.orders o on o.id = e.order_id
    left join auth.users u on u.id = e.reviewer_id
    order by e.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500)
  ) as history_row;

  select
    count(distinct e.order_id) filter (where e.action = 'approved'),
    coalesce(sum(e.tickets_issued) filter (where e.action = 'approved'), 0),
    coalesce(sum(e.amount_total_thb) filter (where e.action = 'approved'), 0),
    count(*)
  into v_approved_orders, v_approved_tickets, v_approved_amount, v_review_actions
  from ticketing_private.payment_review_events e;

  return pg_catalog.jsonb_build_object(
    'events', v_events,
    'stats', pg_catalog.jsonb_build_object(
      'approved_orders', v_approved_orders,
      'approved_tickets', v_approved_tickets,
      'approved_amount_thb', v_approved_amount,
      'review_actions', v_review_actions
    )
  );
end;
$function$;

create or replace function public.ticketing_admin_review_history(
  p_admin_user_id uuid,
  p_limit integer default 100
)
returns jsonb
language sql
security definer
set search_path to ''
as $function$
  select ticketing_private.get_payment_review_history(p_admin_user_id, p_limit);
$function$;

revoke all on function ticketing_private.get_payment_review_history(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function public.ticketing_admin_review_history(uuid, integer) from public, anon, authenticated;
grant execute on function public.ticketing_admin_review_history(uuid, integer) to service_role;
