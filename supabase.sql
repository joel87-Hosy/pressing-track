create sequence if not exists ticket_number_seq start 104;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create or replace function next_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  return '#A-' || nextval('ticket_number_seq')::text;
end;
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
drop policy if exists "Admin ticket read" on tickets;
drop policy if exists "Admin ticket insert" on tickets;
drop policy if exists "Admin ticket update" on tickets;
drop policy if exists "Admin ticket delete" on tickets;
drop policy if exists "Admin article price read" on article_prices;
drop policy if exists "Admin article price write" on article_prices;

revoke all on function next_ticket_number() from public;
revoke all on function next_ticket_number() from anon;
revoke all on function next_ticket_number() from authenticated;
grant execute on function next_ticket_number() to authenticated;

create policy "Admin ticket read"
on tickets for select
to authenticated
using (public.is_admin());

create policy "Admin ticket insert"
on tickets for insert
to authenticated
with check (public.is_admin());

create policy "Admin ticket update"
on tickets for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admin ticket delete"
on tickets for delete
to authenticated
using (public.is_admin());

create policy "Admin article price read"
on article_prices for select
to authenticated
using (public.is_admin());

create policy "Admin article price write"
on article_prices for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Creation du compte admin:
-- 1. Dans Supabase Dashboard > Authentication > Users, creez l'utilisateur admin avec son email et son mot de passe.
-- 2. Remplacez l'email ci-dessous, puis executez la requete pour donner le role admin au compte.
--
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where email = 'admin@pressingtrack.com';
