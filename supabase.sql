create extension if not exists pgcrypto;

create sequence if not exists ticket_number_seq start 104;

create table if not exists pressings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_email text,
  billing_email text,
  plan_name text not null default 'Standard',
  monthly_fee integer not null default 0,
  subscription_status text not null default 'active',
  subscription_started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  ticket_counter integer not null default 103,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pressings add column if not exists billing_email text;
alter table pressings add column if not exists plan_name text not null default 'Standard';
alter table pressings add column if not exists monthly_fee integer not null default 0;
alter table pressings add column if not exists subscription_started_at timestamptz not null default now();
alter table pressings add column if not exists trial_ends_at timestamptz;

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

create or replace view platform_user_accounts as
select
  users.id,
  users.email,
  users.created_at,
  users.last_sign_in_at,
  users.raw_app_meta_data ->> 'role' as role,
  nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid as pressing_id,
  users.raw_app_meta_data ->> 'pressing_name' as pressing_name
from auth.users
where public.is_platform_admin();

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
  set ticket_counter = greatest(
        ticket_counter + 1,
        (
          select coalesce(max((substring(ticket_number from '^#A-(\d+)$'))::integer), 103) + 1
          from public.tickets
          where pressing_id = tenant_id
        )
      ),
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

create table if not exists pressing_invoices (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references pressings(id),
  period_month text not null,
  amount integer not null default 0,
  status text not null default 'pending',
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_fee integer not null default 0,
  ticket_limit integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience text not null default 'all',
  status text not null default 'draft',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_notifications (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid references pressings(id),
  channel text not null,
  recipient text not null,
  subject text,
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists platform_support_tickets (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid references pressings(id),
  subject text not null,
  priority text not null default 'normal',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  pressing_id uuid not null references pressings(id),
  full_name text not null,
  email text not null,
  phone text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table client_profiles add column if not exists status text not null default 'active';

create table if not exists client_service_requests (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references pressings(id),
  client_profile_id uuid not null references client_profiles(id),
  client_user_id uuid not null,
  client_name text not null,
  client_email text not null,
  client_phone text not null,
  service_type text not null,
  delivery_mode text not null default 'pickup_and_delivery',
  collection_address text not null,
  delivery_address text,
  requested_date date,
  items jsonb not null default '[]'::jsonb,
  note text,
  estimated_total integer not null default 0,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
create index if not exists pressing_invoices_pressing_idx on pressing_invoices (pressing_id);
create index if not exists pressing_invoices_status_idx on pressing_invoices (status);
create index if not exists platform_notifications_pressing_idx on platform_notifications (pressing_id);
create index if not exists platform_support_tickets_pressing_idx on platform_support_tickets (pressing_id);
create index if not exists platform_activity_logs_created_idx on platform_activity_logs (created_at desc);
create index if not exists client_profiles_user_idx on client_profiles (user_id);
create index if not exists client_profiles_pressing_idx on client_profiles (pressing_id);
create index if not exists client_service_requests_pressing_idx on client_service_requests (pressing_id, created_at desc);
create index if not exists client_service_requests_client_idx on client_service_requests (client_user_id, created_at desc);

grant select on platform_user_accounts to authenticated;
grant select, insert, update, delete on pressing_invoices to authenticated;
grant select, insert, update, delete on platform_plans to authenticated;
grant select, insert, update, delete on platform_announcements to authenticated;
grant select, insert, update, delete on platform_notifications to authenticated;
grant select, insert, update, delete on platform_support_tickets to authenticated;
grant select, insert, update, delete on platform_activity_logs to authenticated;
grant select, insert, update on client_profiles to authenticated;
grant select, insert, update on client_service_requests to authenticated;

alter table pressings enable row level security;
alter table tickets enable row level security;
alter table article_prices enable row level security;
alter table pressing_invoices enable row level security;
alter table platform_plans enable row level security;
alter table platform_announcements enable row level security;
alter table platform_notifications enable row level security;
alter table platform_support_tickets enable row level security;
alter table platform_activity_logs enable row level security;
alter table client_profiles enable row level security;
alter table client_service_requests enable row level security;

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
drop policy if exists "Client article price read" on article_prices;
drop policy if exists "Tenant pressing read" on pressings;
drop policy if exists "Platform pressing write" on pressings;
drop policy if exists "Platform invoice management" on pressing_invoices;
drop policy if exists "Platform plan management" on platform_plans;
drop policy if exists "Platform announcement read" on platform_announcements;
drop policy if exists "Platform announcement management" on platform_announcements;
drop policy if exists "Platform notification management" on platform_notifications;
drop policy if exists "Tenant support read" on platform_support_tickets;
drop policy if exists "Tenant support insert" on platform_support_tickets;
drop policy if exists "Platform support management" on platform_support_tickets;
drop policy if exists "Platform activity log management" on platform_activity_logs;
drop policy if exists "Client profile read" on client_profiles;
drop policy if exists "Client profile insert" on client_profiles;
drop policy if exists "Client profile update" on client_profiles;
drop policy if exists "Client request read" on client_service_requests;
drop policy if exists "Client request insert" on client_service_requests;
drop policy if exists "Tenant client request update" on client_service_requests;

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

create policy "Client article price read"
on article_prices for select
to authenticated
using (
  exists (
    select 1
    from public.client_profiles
    where client_profiles.user_id = auth.uid()
      and client_profiles.pressing_id = article_prices.pressing_id
  )
);

create policy "Tenant article price write"
on article_prices for all
to authenticated
using (public.can_write_pressing(pressing_id))
with check (public.can_write_pressing(pressing_id));

create policy "Platform invoice management"
on pressing_invoices for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform plan management"
on platform_plans for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform announcement read"
on platform_announcements for select
to authenticated
using (public.is_platform_admin() or status = 'published');

create policy "Platform announcement management"
on platform_announcements for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform notification management"
on platform_notifications for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Tenant support read"
on platform_support_tickets for select
to authenticated
using (public.is_platform_admin() or pressing_id = public.current_pressing_id());

create policy "Tenant support insert"
on platform_support_tickets for insert
to authenticated
with check (pressing_id = public.current_pressing_id());

create policy "Platform support management"
on platform_support_tickets for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform activity log management"
on platform_activity_logs for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Client profile read"
on client_profiles for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_read_pressing(pressing_id)
);

create policy "Client profile insert"
on client_profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy "Client profile update"
on client_profiles for update
to authenticated
using (user_id = auth.uid() or public.can_write_pressing(pressing_id))
with check (user_id = auth.uid() or public.can_write_pressing(pressing_id));

create policy "Client request read"
on client_service_requests for select
to authenticated
using (
  client_user_id = auth.uid()
  or public.can_read_pressing(pressing_id)
);

create policy "Client request insert"
on client_service_requests for insert
to authenticated
with check (client_user_id = auth.uid());

create policy "Tenant client request update"
on client_service_requests for update
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

-- Recuperer les anciennes donnees apres migration multi-pressing:
-- Si les tickets/prix existaient avant l'ajout de pressing_id, ils ont ete rattaches au pressing legacy
-- 00000000-0000-0000-0000-000000000001. Remplacez PRESSING_ID_ACTIF par l'id du vrai pressing.
--
-- update tickets
-- set pressing_id = 'PRESSING_ID_ACTIF'
-- where pressing_id = '00000000-0000-0000-0000-000000000001';
--
-- Si le vrai pressing n'a pas encore de prix personnalises:
--
-- update article_prices
-- set pressing_id = 'PRESSING_ID_ACTIF'
-- where pressing_id = '00000000-0000-0000-0000-000000000001';
--
-- Si le vrai pressing a deja des prix et que l'update ci-dessus signale un conflit, utilisez plutot:
--
-- insert into article_prices (pressing_id, article_id, article_name, price, updated_at)
-- select 'PRESSING_ID_ACTIF', article_id, article_name, price, updated_at
-- from article_prices
-- where pressing_id = '00000000-0000-0000-0000-000000000001'
-- on conflict (pressing_id, article_id) do update
-- set article_name = excluded.article_name,
--     price = excluded.price,
--     updated_at = excluded.updated_at;
