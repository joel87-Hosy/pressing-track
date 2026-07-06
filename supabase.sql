create sequence if not exists ticket_number_seq start 104;

create or replace function next_ticket_number()
returns text
language sql
security definer
as $$
  select '#A-' || nextval('ticket_number_seq')::text;
$$;

create table if not exists tickets (
  id uuid primary key,
  ticket_number text not null unique,
  status text not null default 'IN_PROCESSING',
  client_phone text not null,
  total integer not null default 0,
  item_count integer not null default 0,
  ready_date text not null,
  whatsapp_url text not null,
  message text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists article_prices (
  article_id text primary key,
  article_name text not null,
  price integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists tickets_created_at_idx on tickets (created_at desc);
create index if not exists tickets_status_idx on tickets (status);

alter table tickets enable row level security;
alter table article_prices enable row level security;

drop policy if exists "MVP public ticket read" on tickets;
drop policy if exists "MVP public ticket insert" on tickets;
drop policy if exists "MVP public ticket update" on tickets;
drop policy if exists "MVP public ticket delete" on tickets;
drop policy if exists "MVP public article price read" on article_prices;
drop policy if exists "MVP public article price upsert" on article_prices;

create policy "MVP public ticket read"
on tickets for select
to anon
using (true);

create policy "MVP public ticket insert"
on tickets for insert
to anon
with check (true);

create policy "MVP public ticket update"
on tickets for update
to anon
using (true)
with check (true);

create policy "MVP public ticket delete"
on tickets for delete
to anon
using (true);

create policy "MVP public article price read"
on article_prices for select
to anon
using (true);

create policy "MVP public article price upsert"
on article_prices for all
to anon
using (true)
with check (true);
