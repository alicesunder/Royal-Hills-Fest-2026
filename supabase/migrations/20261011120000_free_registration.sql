-- Royal Hills Fest 2026: free registration and ticket issuance.
-- Existing orders keep their original amounts/statuses. Only future catalogue prices are set to zero.
-- Keep this migration on the review branch until the free-registration flow is tested end to end.

update public.ticket_types
   set price_thb = 0
 where code in ('tt-normal', 'tt-vip')
   and price_thb <> 0;

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
  v_token text;
  v_token_hash text;
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

  -- Safe retry after a client/network error: do not reserve stock or issue duplicate tickets.
  if v_order.status = 'paid' and v_order.payment_provider = 'free-registration' then
    select count(*)::integer into v_ticket_count
      from public.tickets
     where order_id = v_order.id;

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
      v_attendee_data := coalesce(v_item.attendee_data -> v_idx, '{}'::jsonb);

      if v_item.code = 'tt-normal' then
        v_attendee_name := coalesce(
          nullif(pg_catalog.btrim(v_attendee_data->>'attendeeName'), ''),
          v_order.customer_name
        );
        v_attendee_data := pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'seatNumber', 1,
            'name', v_attendee_name,
            'checkedIn', false,
            'wristbandIssued', false
          )
        );
      else
        v_attendee_name := coalesce(
          nullif(pg_catalog.btrim(v_attendee_data->'attendeeNames'->>0), ''),
          v_order.customer_name
        );
        v_attendee_data := coalesce(v_attendee_data->'attendeeNames', '[]'::jsonb);
      end if;

      v_ticket_code := 'RHF26-' ||
        pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 12));
      v_token := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') ||
                 pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
      v_token_hash := pg_catalog.encode(
        pg_catalog.sha256(pg_catalog.convert_to(v_token, 'UTF8')),
        'hex'
      );

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

-- Expose the registration action only to the trusted Edge Function service role.
create or replace function public.ticketing_register_free_order(
  p_order_number text,
  p_lookup_token_hash text
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.register_free_order(p_order_number, p_lookup_token_hash);
$function$;

revoke all on function ticketing_private.register_free_order(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.ticketing_register_free_order(text, text)
  from public, anon, authenticated;
grant execute on function public.ticketing_register_free_order(text, text)
  to service_role;
