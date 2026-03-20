-- Admin settings table (single row, keyed by id)
create table if not exists admin_settings (
  id text primary key default 'default',
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Insert default row if not exists
insert into admin_settings (id, data, updated_at)
values ('default', '{}', now())
on conflict (id) do nothing;
