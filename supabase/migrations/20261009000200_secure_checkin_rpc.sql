
-- Server-only check-in wrapper. The caller must authenticate an enabled event admin first.
create or replace function public.ticketing_check_in(
  p_qr_token_hash text,
  p_scanned_by uuid,
  p_scanner_device_id text default null,
  p_scan_location text default null,
  p_request_id uuid default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select ticketing_private.check_in_ticket(
    p_qr_token_hash, p_scanned_by, p_scanner_device_id, p_scan_location, p_request_id
  );
$function$;

revoke all on function public.ticketing_check_in(text,uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.ticketing_check_in(text,uuid,text,text,uuid) to service_role;
