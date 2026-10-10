-- Defense in depth: private helpers are callable only by their owning security-definer wrappers.
revoke all on function ticketing_private.claim_provider_payment(text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function ticketing_private.set_provider_payment(text, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function ticketing_private.release_provider_payment_claim(text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function ticketing_private.complete_provider_payment(text, text, bigint, text)
  from public, anon, authenticated, service_role;
