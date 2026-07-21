create extension if not exists pgcrypto;

create sequence if not exists ticket_number_seq start 104;

create table if not exists pressings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_email text,
  subscription_status text not null default 'active',
  ticket_counter integer not null default 103,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into pressings (id, name, owner_email)
values ('00000000-0000-0000-0000-000000000001', 'Pressing legacy', 'admin@pressingtrack.com')
on conflict (id) do nothing;

create or replace function current_pressing_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'pressing_id', '')::uuid;
$$;

create or replace function current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function is_platform_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'platform_admin';
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'admin' and public.current_pressing_id() is not null;
$$;

create or replace function can_read_reports()
returns boolean
language sql
stable
as $$
  select public.is_platform_admin()
    or (public.current_app_role() in ('admin', 'supervisor') and public.current_pressing_id() is not null);
$$;

create or replace function can_read_pressing(target_pressing_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_platform_admin()
    or (public.can_read_reports() and target_pressing_id = public.current_pressing_id());
$$;

create or replace function can_write_pressing(target_pressing_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_platform_admin()
    or (public.is_admin() and target_pressing_id = public.current_pressing_id());
$$;

create or replace function next_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
  tenant_id uuid;
begin
  tenant_id := public.current_pressing_id();

  if not public.is_admin() or tenant_id is null then
    raise exception 'admin role and pressing_id required' using errcode = '42501';
  end if;

  update public.pressings
  set ticket_counter = ticket_counter + 1,
      updated_at = now()
  where id = tenant_id
    and subscription_status = 'active'
  returning ticket_counter into next_number;

  if next_number is null then
    raise exception 'active pressing not found' using errcode = '42501';
  end if;

  return '#A-' || next_number::text;
end;
$$;

create table if not exists tickets (
  id uuid primary key,
  pressing_id uuid references pressings(id),
  ticket_number text not null,
  status text not null default 'IN_PROCESSING',
  client_phone text not null,
  total integer not null default 0,
  item_count integer not null default 0,
  ready_date text not null,
  picked_up_at timestamptz,
  whatsapp_url text not null,
  message text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table tickets add column if not exists pressing_id uuid references pressings(id);
alter table tickets add column if not exists picked_up_at timestamptz;
update tickets set pressing_id = '00000000-0000-0000-0000-000000000001' where pressing_id is null;
alter table tickets alter column pressing_id set not null;

create table if not exists article_prices (
  pressing_id uuid references pressings(id),
  article_id text not null,
  article_name text not null,
  price integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table article_prices add column if not exists pressing_id uuid references pressings(id);
update article_prices
set pressing_id = '00000000-0000-0000-0000-000000000001'
where pressing_id is null;
alter table article_prices alter column pressing_id set not null;

alter table tickets drop constraint if exists tickets_ticket_number_key;
alter table tickets drop constraint if exists tickets_pressing_ticket_number_key;
alter table tickets add constraint tickets_pressing_ticket_number_key unique (pressing_id, ticket_number);

alter table article_prices drop constraint if exists article_prices_pkey;
alter table article_prices add constraint article_prices_pkey primary key (pressing_id, article_id);

create index if not exists tickets_pressing_created_at_idx on tickets (pressing_id, created_at desc);
create index if not exists tickets_pressing_status_idx on tickets (pressing_id, status);
create index if not exists tickets_created_at_idx on tickets (created_at desc);
create index if not exists tickets_status_idx on tickets (status);
create index if not exists article_prices_pressing_idx on article_prices (pressing_id);

alter table pressings enable row level security;
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
drop policy if exists "Tenant ticket read" on tickets;
drop policy if exists "Tenant ticket insert" on tickets;
drop policy if exists "Tenant ticket update" on tickets;
drop policy if exists "Tenant ticket delete" on tickets;
drop policy if exists "Tenant article price read" on article_prices;
drop policy if exists "Tenant article price write" on article_prices;
drop policy if exists "Tenant pressing read" on pressings;
drop policy if exists "Platform pressing write" on pressings;

revoke all on function next_ticket_number() from public;
revoke all on function next_ticket_number() from anon;
revoke all on function next_ticket_number() from authenticated;
grant execute on function next_ticket_number() to authenticated;

create policy "Tenant pressing read"
on pressings for select
to authenticated
using (public.can_read_pressing(id));

create policy "Platform pressing write"
on pressings for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Tenant ticket read"
on tickets for select
to authenticated
using (public.can_read_pressing(pressing_id));

create policy "Tenant ticket insert"
on tickets for insert
to authenticated
with check (public.can_write_pressing(pressing_id));

create policy "Tenant ticket update"
on tickets for update
to authenticated
using (public.can_write_pressing(pressing_id))
with check (public.can_write_pressing(pressing_id));

create policy "Tenant ticket delete"
on tickets for delete
to authenticated
using (public.can_write_pressing(pressing_id));

create policy "Tenant article price read"
on article_prices for select
to authenticated
using (public.can_read_pressing(pressing_id));

create policy "Tenant article price write"
on article_prices for all
to authenticated
using (public.can_write_pressing(pressing_id))
with check (public.can_write_pressing(pressing_id));

-- Creation d'un nouveau pressing client:
-- 1. Executez cette requete en changeant le nom et l'email proprietaire.
--
-- insert into pressings (name, owner_email)
-- values ('Pressing Cocody', 'admin@pressing-cocody.com')
-- returning id;
--
-- 2. Dans Supabase Dashboard > Authentication > Users, creez l'utilisateur admin avec son email et son mot de passe.
-- 3. Remplacez PRESSING_ID par l'id retourne plus haut, puis donnez au compte admin son pressing.
--
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--   || '{"role":"admin","pressing_id":"PRESSING_ID","pressing_name":"Pressing Cocody"}'::jsonb
-- where email = 'admin@pressing-cocody.com';
--
-- Creation d'un compte superviseur du meme pressing:
--
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--   || '{"role":"supervisor","pressing_id":"PRESSING_ID","pressing_name":"Pressing Cocody"}'::jsonb
-- where email = 'superviseur@pressing-cocody.com';
--
-- Compte plateforme pour vous, capable de gerer tous les pressings via SQL ou un futur back-office:
--
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"platform_admin"}'::jsonb
-- where email = 'votre-email@domaine.com';
