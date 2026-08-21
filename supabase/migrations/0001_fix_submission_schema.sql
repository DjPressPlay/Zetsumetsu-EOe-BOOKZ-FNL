-- Fixes the three schema mismatches that made submissions fail silently.
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
--
-- Verified against the live project on 2026-08-21: every statement below targets a
-- column or constraint that the application code already assumes exists.

-- 1. The print-on-demand order form writes newsletter_emails.order_info, which was
--    never created. Every order insert failed with PGRST204 and the checkout aborted.
alter table public.newsletter_emails
  add column if not exists order_info text;

-- 2. The upload gate reads user_credits.is_premium to decide whether to lift the
--    5-book limit. The column does not exist, so the read errored and premium was
--    treated as false for everyone.
alter table public.user_credits
  add column if not exists is_premium boolean not null default false;

-- 3. user_credits.user_id is a foreign key to auth.users, but this application never
--    signs anyone in -- it identifies browsers with a locally generated UUID. The FK
--    rejected every insert with 23503, so no credit account could ever be created and
--    the Stripe webhook could not grant premium.
--
--    Pick ONE of the two options below.

--    Option A (matches the current anonymous design): detach from auth.users.
alter table public.user_credits
  drop constraint if exists user_credits_user_id_fkey;

--    Option B (keep the FK): leave the constraint in place, enable Anonymous Sign-ins
--    under Authentication -> Providers in the Supabase dashboard, and call
--    supabase.auth.signInAnonymously() on app start so every visitor gets a real
--    auth.users row. If you choose this, delete the "Option A" statement above.

-- Row level security must allow the anonymous role to maintain its own credit row.
-- Adjust to taste if you adopt Option B and can key policies off auth.uid().
alter table public.user_credits enable row level security;

drop policy if exists "anon can read credits" on public.user_credits;
create policy "anon can read credits"
  on public.user_credits for select
  to anon using (true);

drop policy if exists "anon can create credits" on public.user_credits;
create policy "anon can create credits"
  on public.user_credits for insert
  to anon with check (true);

drop policy if exists "anon can update credits" on public.user_credits;
create policy "anon can update credits"
  on public.user_credits for update
  to anon using (true) with check (true);
