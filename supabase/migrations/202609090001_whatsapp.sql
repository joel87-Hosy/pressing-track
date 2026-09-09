-- Tokens are server-only: no browser role can read or mutate either table.
create table if not exists public.pressing_whatsapp_settings (
  pressing_id uuid primary key references public.pressings(id) on delete cascade,
  phone_number_id text not null unique,
  display_phone text not null,
  access_token text not null,
  template_name text not null,
  template_language text not null default 'fr',
  updated_at timestamptz not null default now()
);
create table if not exists public.ticket_whatsapp_sends (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  pressing_id uuid not null references public.pressings(id),
  status text not null check (status in ('sending', 'accepted', 'failed', 'unknown')),
  message_id text,
  consent_by uuid not null,
  consent_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pressing_whatsapp_settings enable row level security;
alter table public.ticket_whatsapp_sends enable row level security;
revoke all on public.pressing_whatsapp_settings, public.ticket_whatsapp_sends from public, anon, authenticated;
grant all on public.pressing_whatsapp_settings, public.ticket_whatsapp_sends to service_role;
