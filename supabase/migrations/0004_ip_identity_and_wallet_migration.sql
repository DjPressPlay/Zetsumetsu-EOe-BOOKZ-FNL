-- ==============================================================================
-- ZETSU EOE BOOKZ — MIGRATION 0004: IP-BASED ACCOUNT IDENTITY & WALLET RECOVERY
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
--
-- This migration upgrades user profiles and wallet systems to be anchored to
-- the user's Public IP Address. This ensures that clearing browser cookies,
-- cache, or localStorage NEVER wipes the user's Marqs balance, uploaded books,
-- or wallet security. Unregistered visitors receive their IP as a temporary
-- username until they create/customize their author wallet.
-- ==============================================================================

-- 1. Ensure public.bookz_user_profiles supports IP-based indexing & fast lookups
CREATE TABLE IF NOT EXISTS public.bookz_user_profiles (
  id TEXT PRIMARY KEY,
  device_id TEXT,
  ip_address TEXT,
  author_name TEXT,
  wallet_password_hash TEXT,
  marqs_balance NUMERIC(14, 2) DEFAULT 50.00 NOT NULL,
  total_earned NUMERIC(14, 2) DEFAULT 50.00 NOT NULL,
  total_spent NUMERIC(14, 2) DEFAULT 0.00 NOT NULL,
  uploaded_books JSONB DEFAULT '[]'::jsonb NOT NULL,
  transactions JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_active TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure IP address and device_id columns exist if table was created previously
ALTER TABLE public.bookz_user_profiles
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS wallet_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS marqs_balance NUMERIC(14, 2) DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS total_earned NUMERIC(14, 2) DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC(14, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS uploaded_books JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS transactions JSONB DEFAULT '[]'::jsonb;

-- Create high-performance index on IP address for instant account restoration
CREATE INDEX IF NOT EXISTS idx_bookz_user_profiles_ip_lookup 
  ON public.bookz_user_profiles (ip_address);

CREATE INDEX IF NOT EXISTS idx_bookz_user_profiles_device_lookup 
  ON public.bookz_user_profiles (device_id);

-- 2. Ensure legacy public.user_profiles table also has identical IP indexing support
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  device_id TEXT,
  ip_address TEXT,
  author_name TEXT,
  wallet_password_hash TEXT,
  marqs_balance NUMERIC(14, 2) DEFAULT 50.00 NOT NULL,
  total_earned NUMERIC(14, 2) DEFAULT 50.00 NOT NULL,
  total_spent NUMERIC(14, 2) DEFAULT 0.00 NOT NULL,
  uploaded_books JSONB DEFAULT '[]'::jsonb NOT NULL,
  transactions JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_active TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS wallet_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS author_name TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_ip_lookup 
  ON public.user_profiles (ip_address);

-- 3. Row Level Security (RLS) policies for anonymous IP read, insert, and update
ALTER TABLE public.bookz_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public bookz_user_profiles IP select" ON public.bookz_user_profiles;
CREATE POLICY "Public bookz_user_profiles IP select" 
  ON public.bookz_user_profiles FOR SELECT 
  TO public, anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Public bookz_user_profiles IP insert" ON public.bookz_user_profiles;
CREATE POLICY "Public bookz_user_profiles IP insert" 
  ON public.bookz_user_profiles FOR INSERT 
  TO public, anon, authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public bookz_user_profiles IP update" ON public.bookz_user_profiles;
CREATE POLICY "Public bookz_user_profiles IP update" 
  ON public.bookz_user_profiles FOR UPDATE 
  TO public, anon, authenticated 
  USING (true) WITH CHECK (true);

-- Legacy user_profiles policies
DROP POLICY IF EXISTS "Public user_profiles IP select" ON public.user_profiles;
CREATE POLICY "Public user_profiles IP select" 
  ON public.user_profiles FOR SELECT 
  TO public, anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Public user_profiles IP insert" ON public.user_profiles;
CREATE POLICY "Public user_profiles IP insert" 
  ON public.user_profiles FOR INSERT 
  TO public, anon, authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public user_profiles IP update" ON public.user_profiles;
CREATE POLICY "Public user_profiles IP update" 
  ON public.user_profiles FOR UPDATE 
  TO public, anon, authenticated 
  USING (true) WITH CHECK (true);
