-- Link internal rows to Square Orders API
alter table cafe_orders add column if not exists square_order_id text;

create index if not exists cafe_orders_square_order_id_idx on cafe_orders (square_order_id)
  where square_order_id is not null;
