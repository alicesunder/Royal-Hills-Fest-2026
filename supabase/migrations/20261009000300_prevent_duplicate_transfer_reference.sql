
-- Refuse reuse of the same transfer reference for multiple active/paid orders.
create unique index if not exists orders_unique_payment_reference_active
  on public.orders (pg_catalog.lower(payment_reference))
  where payment_reference is not null
    and status in ('awaiting_review','paid');
