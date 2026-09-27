create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  school_form text not null check (school_form in ('Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5')),
  app_language text not null default 'English' check (app_language in ('English', 'Bahasa Melayu', 'Chinese')),
  theme_mode text not null default 'Light' check (theme_mode in ('Light', 'Dark')),
  notifications_enabled boolean not null default true,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_activity_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles add constraint profiles_display_name_length check (char_length(display_name) between 1 and 80);
alter table public.profiles drop constraint if exists profiles_email_length;
alter table public.profiles add constraint profiles_email_length check (char_length(email) between 3 and 254);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from public;
revoke all on public.profiles from anon;
revoke delete on public.profiles from authenticated;

create table if not exists public.user_app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_app_data enable row level security;
alter table public.user_app_data force row level security;

drop policy if exists "user_app_data_select_own" on public.user_app_data;
drop policy if exists "user_app_data_insert_own" on public.user_app_data;
drop policy if exists "user_app_data_update_own" on public.user_app_data;

create policy "user_app_data_select_own"
on public.user_app_data
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_app_data_insert_own"
on public.user_app_data
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_app_data_update_own"
on public.user_app_data
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_app_data to authenticated;
revoke all on public.user_app_data from public;
revoke all on public.user_app_data from anon;
revoke delete on public.user_app_data from authenticated;
