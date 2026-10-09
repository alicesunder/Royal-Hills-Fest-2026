-- Include actual issued ticket codes in every approval audit entry.
CREATE OR REPLACE FUNCTION ticketing_private.get_payment_review_history(p_admin_user_id uuid, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      case
        when e.action = 'approved' then coalesce(
          (select pg_catalog.jsonb_agg(t.ticket_code order by t.ticket_code)
             from public.tickets t where t.order_id = e.order_id),
          '[]'::jsonb
        )
        else '[]'::jsonb
      end as ticket_codes,
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
$function$
;
