-- Pickup / cafe orders (Square is only for payment; this table is source of truth for orders)
create table if not exists cafe_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cart jsonb not null,
  customer jsonb not null,
  total_cents integer not null,
  fulfillment_type text not null default 'PICKUP',
  -- Customer-chosen future pickup (optional); when set, status starts as scheduled
  scheduled_for timestamptz,
  -- ASAP-style estimated ready time (always set server-side from cart size)
  estimated_pickup_at timestamptz,
  status text not null,
  is_paid boolean not null default false,
  square_payment_id text,
  notes text
);

create index if not exists cafe_orders_created_at_idx on cafe_orders (created_at desc);
create index if not exists cafe_orders_status_idx on cafe_orders (status);

comment on table cafe_orders is 'All placed orders; Square payment id optional for $0 or failed payment retries';
