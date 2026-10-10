-- LOCAL ONLY: these fixture ticket types are created in the local database.
-- Do not copy this file to a cloud project or use it as a production seed.
insert into public.ticket_types (
  code, name, description, price_thb, max_per_order, is_active, sort_order
) values
  ('tt-normal', 'บัตรปกติ (LOCAL TEST)', 'ตั๋วทดสอบในเครื่องเท่านั้น', 555, 5, true, 1),
  ('tt-vip', 'VIP (LOCAL TEST)', 'VIP ปิดไว้สำหรับการทดสอบในเครื่อง', 5555, 6, false, 2)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_thb = excluded.price_thb,
  max_per_order = excluded.max_per_order,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.ticket_inventory (
  ticket_type_id, capacity_total, quantity_sold, quantity_reserved
)
select id, 50, 0, 0
from public.ticket_types
where code = 'tt-normal'
on conflict (ticket_type_id) do update set
  capacity_total = excluded.capacity_total,
  quantity_sold = 0,
  quantity_reserved = 0,
  updated_at = now();

insert into public.ticket_inventory (
  ticket_type_id, capacity_total, quantity_sold, quantity_reserved
)
select id, 6, 0, 0
from public.ticket_types
where code = 'tt-vip'
on conflict (ticket_type_id) do update set
  capacity_total = excluded.capacity_total,
  quantity_sold = 0,
  quantity_reserved = 0,
  updated_at = now();
