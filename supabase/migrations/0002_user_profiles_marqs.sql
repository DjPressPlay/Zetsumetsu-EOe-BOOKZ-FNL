-- ==============================================================================
-- ZETSU EOE BOOKZ — USER PROFILES & MARQ'S WALLET SCHEMA
-- Run this migration in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create the user_profiles table tracking Author identity, IP, Device, Wallet Password & Marq's Balance
create table if not exists public.user_profiles (
  id text primary key,
  device_id text not null unique,
  ip_address text,
  author_name text not null default 'Anonymous Archivist',
  wallet_password_hash text,
  marqs_balance numeric(12, 2) not null default 50.00,
  total_earned numeric(12, 2) not null default 50.00,
  total_spent numeric(12, 2) not null default 0.00,
  uploaded_books jsonb not null default '[]'::jsonb,
  transactions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  last_active timestamptz not null default now()
);

-- 2. Index for rapid lookup by device_id and author_name
create index if not exists idx_user_profiles_device on public.user_profiles (device_id);
create index if not exists idx_user_profiles_author on public.user_profiles (author_name);

-- 3. Row Level Security configuration for client-side persistence and sync
alter table public.user_profiles enable row level security;

drop policy if exists "anon can read user_profiles" on public.user_profiles;
create policy "anon can read user_profiles"
  on public.user_profiles for select
  to anon using (true);

drop policy if exists "anon can insert user_profiles" on public.user_profiles;
create policy "anon can insert user_profiles"
  on public.user_profiles for insert
  to anon with check (true);

drop policy if exists "anon can update user_profiles" on public.user_profiles;
create policy "anon can update user_profiles"
  on public.user_profiles for update
  to anon using (true) with check (true);
