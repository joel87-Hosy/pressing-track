create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

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

create or replace function current_account_status()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'account_status', 'active');
$$;

create or replace function is_account_active()
returns boolean
language sql
stable
as $$
  select public.current_account_status() <> 'suspended';
$$;

create or replace function is_platform_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'platform_admin' and public.is_account_active();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'admin'
    and public.current_pressing_id() is not null
    and public.is_account_active();
$$;

create or replace function can_read_reports()
returns boolean
language sql
stable
as $$
  select public.is_platform_admin()
    or (
      public.current_app_role() in ('admin', 'supervisor')
      and public.current_pressing_id() is not null
      and public.is_account_active()
    );
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

create table if not exists platform_user_account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role text,
  pressing_id uuid references pressings(id),
  pressing_name text,
  account_status text default 'active'
);

alter table platform_user_account_profiles add column if not exists email text;
alter table platform_user_account_profiles add column if not exists created_at timestamptz;
alter table platform_user_account_profiles add column if not exists last_sign_in_at timestamptz;
alter table platform_user_account_profiles add column if not exists role text;
alter table platform_user_account_profiles add column if not exists pressing_id uuid references pressings(id);
alter table platform_user_account_profiles add column if not exists pressing_name text;
alter table platform_user_account_profiles add column if not exists account_status text default 'active';

create table if not exists tenant_user_account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role text,
  account_status text default 'active',
  pressing_id uuid references pressings(id),
  pressing_name text
);

alter table tenant_user_account_profiles add column if not exists email text;
alter table tenant_user_account_profiles add column if not exists created_at timestamptz;
alter table tenant_user_account_profiles add column if not exists last_sign_in_at timestamptz;
alter table tenant_user_account_profiles add column if not exists role text;
alter table tenant_user_account_profiles add column if not exists account_status text default 'active';
alter table tenant_user_account_profiles add column if not exists pressing_id uuid references pressings(id);
alter table tenant_user_account_profiles add column if not exists pressing_name text;

alter table platform_user_account_profiles enable row level security;
alter table tenant_user_account_profiles enable row level security;

drop policy if exists "Platform admins can read user account profiles" on platform_user_account_profiles;
create policy "Platform admins can read user account profiles"
on platform_user_account_profiles for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "Tenant staff can read user account profiles" on tenant_user_account_profiles;
create policy "Tenant staff can read user account profiles"
on tenant_user_account_profiles for select
to authenticated
using (
  public.is_platform_admin()
  or (
    public.current_app_role() in ('admin', 'supervisor')
    and public.current_pressing_id() is not null
    and public.is_account_active()
    and pressing_id = public.current_pressing_id()
  )
);

create or replace function sync_auth_user_profiles()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  profile_pressing_id uuid;
  profile_pressing_name text;
begin
  profile_pressing_id := nullif(new.raw_app_meta_data ->> 'pressing_id', '')::uuid;

  select pressings.name
  into profile_pressing_name
  from public.pressings
  where pressings.id = profile_pressing_id;

  profile_pressing_name := coalesce(profile_pressing_name, new.raw_app_meta_data ->> 'pressing_name');

  insert into public.platform_user_account_profiles (
    user_id,
    email,
    created_at,
    last_sign_in_at,
    role,
    pressing_id,
    pressing_name,
    account_status
  )
  values (
    new.id,
    new.email,
    new.created_at,
    new.last_sign_in_at,
    new.raw_app_meta_data ->> 'role',
    profile_pressing_id,
    profile_pressing_name,
    coalesce(new.raw_app_meta_data ->> 'account_status', 'active')
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    created_at = excluded.created_at,
    last_sign_in_at = excluded.last_sign_in_at,
    role = excluded.role,
    pressing_id = excluded.pressing_id,
    pressing_name = excluded.pressing_name,
    account_status = excluded.account_status;

  insert into public.tenant_user_account_profiles (
    user_id,
    email,
    created_at,
    last_sign_in_at,
    role,
    account_status,
    pressing_id,
    pressing_name
  )
  values (
    new.id,
    new.email,
    new.created_at,
    new.last_sign_in_at,
    new.raw_app_meta_data ->> 'role',
    coalesce(new.raw_app_meta_data ->> 'account_status', 'active'),
    profile_pressing_id,
    profile_pressing_name
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    created_at = excluded.created_at,
    last_sign_in_at = excluded.last_sign_in_at,
    role = excluded.role,
    account_status = excluded.account_status,
    pressing_id = excluded.pressing_id,
    pressing_name = excluded.pressing_name;

  return new;
end;
$$;

drop trigger if exists sync_auth_user_profiles_trigger on auth.users;
create trigger sync_auth_user_profiles_trigger
after insert or update of email, raw_app_meta_data, last_sign_in_at
on auth.users
for each row
execute function public.sync_auth_user_profiles();

insert into public.platform_user_account_profiles (
  user_id,
  email,
  created_at,
  last_sign_in_at,
  role,
  pressing_id,
  pressing_name,
  account_status
)
select
  users.id,
  users.email,
  users.created_at,
  users.last_sign_in_at,
  users.raw_app_meta_data ->> 'role',
  nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid,
  coalesce(pressings.name, users.raw_app_meta_data ->> 'pressing_name'),
  coalesce(users.raw_app_meta_data ->> 'account_status', 'active')
from auth.users
left join public.pressings
  on pressings.id = nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid
on conflict (user_id) do update
set
  email = excluded.email,
  created_at = excluded.created_at,
  last_sign_in_at = excluded.last_sign_in_at,
  role = excluded.role,
  pressing_id = excluded.pressing_id,
  pressing_name = excluded.pressing_name,
  account_status = excluded.account_status;

insert into public.tenant_user_account_profiles (
  user_id,
  email,
  created_at,
  last_sign_in_at,
  role,
  account_status,
  pressing_id,
  pressing_name
)
select
  users.id,
  users.email,
  users.created_at,
  users.last_sign_in_at,
  users.raw_app_meta_data ->> 'role',
  coalesce(users.raw_app_meta_data ->> 'account_status', 'active'),
  nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid,
  coalesce(pressings.name, users.raw_app_meta_data ->> 'pressing_name')
from auth.users
left join public.pressings
  on pressings.id = nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid
on conflict (user_id) do update
set
  email = excluded.email,
  created_at = excluded.created_at,
  last_sign_in_at = excluded.last_sign_in_at,
  role = excluded.role,
  account_status = excluded.account_status,
  pressing_id = excluded.pressing_id,
  pressing_name = excluded.pressing_name;

create or replace function sync_pressing_name_to_user_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.platform_user_account_profiles
  set pressing_name = new.name
  where pressing_id = new.id;

  update public.tenant_user_account_profiles
  set pressing_name = new.name
  where pressing_id = new.id;

  return new;
end;
$$;

drop trigger if exists sync_pressing_name_to_user_profiles_trigger on public.pressings;
create trigger sync_pressing_name_to_user_profiles_trigger
after update of name
on public.pressings
for each row
execute function public.sync_pressing_name_to_user_profiles();

drop view if exists platform_user_accounts;
drop view if exists tenant_user_accounts;

create or replace view platform_user_accounts
with (security_invoker = true)
as
select
  user_id as id,
  email::character varying as email,
  created_at,
  last_sign_in_at,
  role,
  pressing_id,
  pressing_name,
  account_status
from public.platform_user_account_profiles;

create or replace view tenant_user_accounts
with (security_invoker = true)
as
select
  user_id as id,
  email::character varying as email,
  created_at,
  last_sign_in_at,
  role,
  account_status,
  pressing_id,
  pressing_name
from public.tenant_user_account_profiles;

create or replace function create_tenant_staff_account(
  staff_email text,
  staff_password text,
  staff_role text default 'admin'
)
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role text,
  account_status text,
  pressing_id uuid,
  pressing_name text
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  tenant_id uuid;
  tenant_name text;
  normalized_email text;
  target_user_id uuid;
begin
  tenant_id := public.current_pressing_id();
  normalized_email := lower(trim(staff_email));

  if not (public.is_platform_admin() or (public.current_app_role() = 'supervisor' and public.is_account_active())) then
    raise exception 'supervisor role required' using errcode = '42501';
  end if;

  if tenant_id is null then
    raise exception 'pressing_id required' using errcode = '42501';
  end if;

  if staff_role not in ('admin', 'supervisor') then
    raise exception 'invalid staff role' using errcode = '22023';
  end if;

  if normalized_email = '' or length(staff_password) < 6 then
    raise exception 'valid email and password required' using errcode = '22023';
  end if;

  select name into tenant_name
  from public.pressings
  where pressings.id = tenant_id;

  if tenant_name is null then
    raise exception 'pressing not found' using errcode = '42501';
  end if;

  select users.id into target_user_id
  from auth.users
  where lower(users.email) = normalized_email
  limit 1;

  if target_user_id is not null then
    if coalesce((select raw_app_meta_data ->> 'pressing_id' from auth.users where users.id = target_user_id), tenant_id::text) <> tenant_id::text then
      raise exception 'user already belongs to another pressing' using errcode = '42501';
    end if;

    update auth.users
    set encrypted_password = crypt(staff_password, gen_salt('bf')),
        aud = 'authenticated',
        role = 'authenticated',
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_sent_at = coalesce(confirmation_sent_at, now()),
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || jsonb_build_object(
            'provider', 'email',
            'providers', jsonb_build_array('email'),
            'role', staff_role,
            'pressing_id', tenant_id::text,
            'pressing_name', tenant_name,
            'account_status', 'active'
          ),
        updated_at = now()
    where users.id = target_user_id;
  else
    target_user_id := gen_random_uuid();

    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at
    )
    values (
      target_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      normalized_email,
      crypt(staff_password, gen_salt('bf')),
      now(),
      now(),
      '',
      '',
      '',
      '',
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        'role', staff_role,
        'pressing_id', tenant_id::text,
        'pressing_name', tenant_name,
        'account_status', 'active'
      ),
      jsonb_build_object('created_by_supervisor', auth.uid()::text),
      false,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      target_user_id,
      target_user_id::text,
      target_user_id,
      jsonb_build_object(
        'sub', target_user_id::text,
        'email', normalized_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    )
    on conflict (provider, provider_id) do nothing;
  end if;

  delete from auth.identities
  where user_id = target_user_id
    and provider = 'email';

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    target_user_id::text,
    target_user_id,
    jsonb_build_object(
      'sub', target_user_id::text,
      'email', normalized_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do update
  set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

  return query
  select
    users.id,
    users.email::text,
    users.created_at,
    users.last_sign_in_at,
    users.raw_app_meta_data ->> 'role',
    coalesce(users.raw_app_meta_data ->> 'account_status', 'active'),
    nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid,
    users.raw_app_meta_data ->> 'pressing_name'
  from auth.users
  where users.id = target_user_id;
end;
$$;

create or replace function create_platform_pressing_with_supervisor(
  pressing_name_value text,
  owner_email_value text,
  owner_password_value text,
  contact_value text default null,
  plan_name_value text default 'Starter'
)
returns table (
  id uuid,
  name text,
  owner_email text,
  billing_email text,
  plan_name text,
  monthly_fee integer,
  subscription_status text,
  subscription_started_at timestamptz,
  trial_ends_at timestamptz,
  ticket_counter integer,
  created_at timestamptz,
  updated_at timestamptz,
  supervisor_user_id uuid
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  normalized_email text;
  new_pressing_id uuid;
  target_user_id uuid;
  selected_monthly_fee integer;
begin
  normalized_email := lower(trim(owner_email_value));

  if not public.is_platform_admin() then
    raise exception 'platform admin role required' using errcode = '42501';
  end if;

  if trim(pressing_name_value) = '' then
    raise exception 'pressing name required' using errcode = '22023';
  end if;

  if normalized_email = '' or length(owner_password_value) < 6 then
    raise exception 'valid supervisor email and password required' using errcode = '22023';
  end if;

  selected_monthly_fee := case plan_name_value
    when 'Starter' then 10000
    when 'Pro' then 25000
    when 'Premium' then 50000
    else 0
  end;

  insert into public.pressings (
    name,
    owner_email,
    billing_email,
    plan_name,
    monthly_fee,
    subscription_status,
    subscription_started_at,
    trial_ends_at,
    updated_at
  )
  values (
    trim(pressing_name_value),
    normalized_email,
    coalesce(nullif(trim(contact_value), ''), normalized_email),
    plan_name_value,
    selected_monthly_fee,
    'trial',
    now(),
    now() + interval '14 days',
    now()
  )
  returning pressings.id into new_pressing_id;

  select users.id into target_user_id
  from auth.users
  where lower(users.email) = normalized_email
  limit 1;

  if target_user_id is not null then
    if coalesce((select raw_app_meta_data ->> 'pressing_id' from auth.users where users.id = target_user_id), new_pressing_id::text) <> new_pressing_id::text then
      raise exception 'user already belongs to another pressing' using errcode = '42501';
    end if;

    update auth.users
    set encrypted_password = crypt(owner_password_value, gen_salt('bf')),
        aud = 'authenticated',
        role = 'authenticated',
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_sent_at = coalesce(confirmation_sent_at, now()),
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || jsonb_build_object(
            'provider', 'email',
            'providers', jsonb_build_array('email'),
            'role', 'supervisor',
            'pressing_id', new_pressing_id::text,
            'pressing_name', trim(pressing_name_value),
            'account_status', 'active'
          ),
        updated_at = now()
    where users.id = target_user_id;
  else
    target_user_id := gen_random_uuid();

    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at
    )
    values (
      target_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      normalized_email,
      crypt(owner_password_value, gen_salt('bf')),
      now(),
      now(),
      '',
      '',
      '',
      '',
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        'role', 'supervisor',
        'pressing_id', new_pressing_id::text,
        'pressing_name', trim(pressing_name_value),
        'account_status', 'active'
      ),
      jsonb_build_object('created_by_platform_admin', auth.uid()::text),
      false,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      target_user_id,
      target_user_id::text,
      target_user_id,
      jsonb_build_object(
        'sub', target_user_id::text,
        'email', normalized_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    )
    on conflict (provider, provider_id) do nothing;
  end if;

  delete from auth.identities
  where user_id = target_user_id
    and provider = 'email';

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    target_user_id::text,
    target_user_id,
    jsonb_build_object(
      'sub', target_user_id::text,
      'email', normalized_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do update
  set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

  return query
  select
    pressings.id,
    pressings.name,
    pressings.owner_email,
    pressings.billing_email,
    pressings.plan_name,
    pressings.monthly_fee,
    pressings.subscription_status,
    pressings.subscription_started_at,
    pressings.trial_ends_at,
    pressings.ticket_counter,
    pressings.created_at,
    pressings.updated_at,
    target_user_id
  from public.pressings
  where pressings.id = new_pressing_id;
end;
$$;

create or replace function update_tenant_staff_access(
  target_user_id uuid,
  staff_role text,
  staff_account_status text
)
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role text,
  account_status text,
  pressing_id uuid,
  pressing_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  tenant_id uuid;
  tenant_name text;
begin
  tenant_id := public.current_pressing_id();

  if not (public.is_platform_admin() or (public.current_app_role() = 'supervisor' and public.is_account_active())) then
    raise exception 'supervisor role required' using errcode = '42501';
  end if;

  if tenant_id is null then
    raise exception 'pressing_id required' using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'self access update is not allowed here' using errcode = '42501';
  end if;

  if staff_role not in ('admin', 'supervisor') then
    raise exception 'invalid staff role' using errcode = '22023';
  end if;

  if staff_account_status not in ('active', 'suspended') then
    raise exception 'invalid account status' using errcode = '22023';
  end if;

  select name into tenant_name
  from public.pressings
  where pressings.id = tenant_id;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'role', staff_role,
          'pressing_id', tenant_id::text,
          'pressing_name', tenant_name,
          'account_status', staff_account_status
        ),
      updated_at = now()
  where users.id = target_user_id
    and nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid = tenant_id;

  if not found then
    raise exception 'user not found in this pressing' using errcode = '42501';
  end if;

  return query
  select
    users.id,
    users.email::text,
    users.created_at,
    users.last_sign_in_at,
    users.raw_app_meta_data ->> 'role',
    coalesce(users.raw_app_meta_data ->> 'account_status', 'active'),
    nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid,
    users.raw_app_meta_data ->> 'pressing_name'
  from auth.users
  where users.id = target_user_id;
end;
$$;

create or replace function repair_pressing_supervisor_auth_account(
  supervisor_email_value text,
  supervisor_password_value text
)
returns table (
  id uuid,
  email text,
  role text,
  account_status text,
  pressing_id uuid,
  pressing_name text
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  normalized_email text;
  target_user_id uuid;
  target_pressing_id uuid;
  target_pressing_name text;
begin
  normalized_email := lower(trim(supervisor_email_value));

  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'platform admin role required' using errcode = '42501';
  end if;

  if normalized_email = '' or length(supervisor_password_value) < 6 then
    raise exception 'valid supervisor email and password required' using errcode = '22023';
  end if;

  select users.id,
         coalesce(nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid, pressings.id),
         coalesce(users.raw_app_meta_data ->> 'pressing_name', pressings.name)
    into target_user_id, target_pressing_id, target_pressing_name
  from auth.users
  left join public.pressings
    on lower(pressings.owner_email) = lower(users.email)
  where lower(users.email) = normalized_email
  limit 1;

  if target_user_id is null or target_pressing_id is null then
    raise exception 'supervisor account or pressing not found' using errcode = '22023';
  end if;

  update auth.users
  set encrypted_password = crypt(supervisor_password_value, gen_salt('bf')),
      instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
      aud = 'authenticated',
      role = 'authenticated',
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      confirmation_sent_at = coalesce(confirmation_sent_at, now()),
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      email_change = '',
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'provider', 'email',
          'providers', jsonb_build_array('email'),
          'role', 'supervisor',
          'pressing_id', target_pressing_id::text,
          'pressing_name', target_pressing_name,
          'account_status', 'active'
        ),
      updated_at = now()
  where users.id = target_user_id;

  delete from auth.identities
  where user_id = target_user_id
    and provider = 'email';

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    target_user_id::text,
    target_user_id,
    jsonb_build_object(
      'sub', target_user_id::text,
      'email', normalized_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do update
  set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

  return query
  select
    users.id,
    users.email::text,
    users.raw_app_meta_data ->> 'role',
    coalesce(users.raw_app_meta_data ->> 'account_status', 'active'),
    nullif(users.raw_app_meta_data ->> 'pressing_id', '')::uuid,
    users.raw_app_meta_data ->> 'pressing_name'
  from auth.users
  where users.id = target_user_id;
end;
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
  gender text,
  email text not null,
  phone text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table client_profiles add column if not exists status text not null default 'active';
alter table client_profiles add column if not exists gender text;

create table if not exists client_service_requests (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references pressings(id),
  client_profile_id uuid not null references client_profiles(id),
  client_user_id uuid not null,
  client_name text not null,
  client_gender text,
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

alter table client_service_requests add column if not exists ticket_id uuid references tickets(id);
alter table client_service_requests add column if not exists ticket_number text;
alter table client_service_requests add column if not exists ticket_message text;
alter table client_service_requests add column if not exists ticket_whatsapp_url text;
alter table client_service_requests add column if not exists ticket_sent_at timestamptz;
alter table client_service_requests add column if not exists confirmation_message text;
alter table client_service_requests add column if not exists confirmation_sent_at timestamptz;
alter table client_service_requests add column if not exists client_gender text;
alter table client_service_requests add column if not exists pickup_reminder_level text;
alter table client_service_requests add column if not exists pickup_reminder_message text;
alter table client_service_requests add column if not exists pickup_reminder_sent_at timestamptz;
alter table client_service_requests add column if not exists delivery_request_status text;
alter table client_service_requests add column if not exists delivery_requested_at timestamptz;
alter table client_service_requests add column if not exists delivery_request_note text;

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
grant select on tenant_user_accounts to authenticated;
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
drop policy if exists "Client request delivery update" on client_service_requests;
drop policy if exists "Profile avatar public read" on storage.objects;
drop policy if exists "Profile avatar owner insert" on storage.objects;
drop policy if exists "Profile avatar owner update" on storage.objects;
drop policy if exists "Profile avatar owner delete" on storage.objects;

revoke all on function next_ticket_number() from public;
revoke all on function next_ticket_number() from anon;
revoke all on function next_ticket_number() from authenticated;
grant execute on function next_ticket_number() to authenticated;

revoke all on function create_tenant_staff_account(text, text, text) from public;
revoke all on function create_tenant_staff_account(text, text, text) from anon;
revoke all on function create_tenant_staff_account(text, text, text) from authenticated;
grant execute on function create_tenant_staff_account(text, text, text) to authenticated;

revoke all on function create_platform_pressing_with_supervisor(text, text, text, text, text) from public;
revoke all on function create_platform_pressing_with_supervisor(text, text, text, text, text) from anon;
revoke all on function create_platform_pressing_with_supervisor(text, text, text, text, text) from authenticated;
grant execute on function create_platform_pressing_with_supervisor(text, text, text, text, text) to authenticated;

revoke all on function repair_pressing_supervisor_auth_account(text, text) from public;
revoke all on function repair_pressing_supervisor_auth_account(text, text) from anon;
revoke all on function repair_pressing_supervisor_auth_account(text, text) from authenticated;
grant execute on function repair_pressing_supervisor_auth_account(text, text) to authenticated;

revoke all on function update_tenant_staff_access(uuid, text, text) from public;
revoke all on function update_tenant_staff_access(uuid, text, text) from anon;
revoke all on function update_tenant_staff_access(uuid, text, text) from authenticated;
grant execute on function update_tenant_staff_access(uuid, text, text) to authenticated;

insert into storage.buckets (id, name, "public", file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  "public" = excluded."public",
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Profile avatar public read"
on storage.objects for select
to public
using (bucket_id = 'profile-avatars');

create policy "Profile avatar owner insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Profile avatar owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Profile avatar owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

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

create policy "Client request delivery update"
on client_service_requests for update
to authenticated
using (client_user_id = auth.uid())
with check (client_user_id = auth.uid());

-- Creation d'un nouveau pressing client:
-- Le super admin utilise l'ecran Pressings. L'application appelle
-- create_platform_pressing_with_supervisor pour creer le pressing et le compte
-- superviseur initial. Ce superviseur peut ensuite creer les comptes gerants
-- de son pressing depuis Parametres > Acces du pressing.
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
