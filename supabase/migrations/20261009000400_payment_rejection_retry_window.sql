
-- When an admin rejects a proof, give the buyer a fresh 15-minute retry window.
-- This prevents rejected orders from immediately expiring with reserved stock still held.
create or replace function ticketing_private.reset_payment_retry_window()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.status = 'awaiting_review' and new.status = 'pending' then
    new.expires_at := pg_catalog.now() + interval '15 minutes';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_reset_payment_retry_window on public.orders;
create trigger trg_reset_payment_retry_window
before update of status on public.orders
for each row
execute function ticketing_private.reset_payment_retry_window();

revoke all on function ticketing_private.reset_payment_retry_window() from public, anon, authenticated, service_role;
