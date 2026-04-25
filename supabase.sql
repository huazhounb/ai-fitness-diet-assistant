create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  sync_id text not null unique,
  nickname text,
  sex text,
  age integer,
  height_cm numeric,
  current_weight_kg numeric,
  target_weight_kg numeric,
  goal text,
  training_days_per_week integer,
  diet_preferences jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  sync_id text not null,
  record_date date not null,
  weight_kg numeric,
  training_goal text,
  duration_minutes integer,
  equipment jsonb not null default '[]'::jsonb,
  foods jsonb not null default '[]'::jsonb,
  body_state jsonb not null default '{}'::jsonb,
  ai_result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_records_sync_date_unique unique (sync_id, record_date)
);

create index if not exists daily_records_sync_date_idx
  on public.daily_records (sync_id, record_date desc);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists daily_records_set_updated_at on public.daily_records;
create trigger daily_records_set_updated_at
before update on public.daily_records
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.daily_records enable row level security;

drop policy if exists "anon read user_profiles" on public.user_profiles;
create policy "anon read user_profiles"
on public.user_profiles
for select
to anon
using (true);

drop policy if exists "anon write user_profiles" on public.user_profiles;
create policy "anon write user_profiles"
on public.user_profiles
for insert
to anon
with check (true);

drop policy if exists "anon update user_profiles" on public.user_profiles;
create policy "anon update user_profiles"
on public.user_profiles
for update
to anon
using (true)
with check (true);

drop policy if exists "anon read daily_records" on public.daily_records;
create policy "anon read daily_records"
on public.daily_records
for select
to anon
using (true);

drop policy if exists "anon write daily_records" on public.daily_records;
create policy "anon write daily_records"
on public.daily_records
for insert
to anon
with check (true);

drop policy if exists "anon update daily_records" on public.daily_records;
create policy "anon update daily_records"
on public.daily_records
for update
to anon
using (true)
with check (true);
