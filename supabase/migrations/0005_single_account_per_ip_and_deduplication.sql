-- ==============================================================================
-- ZETSU EOE BOOKZ — MIGRATION 0005: STRICT SINGLE ACCOUNT PER IP & DEDUPLICATION
-- ==============================================================================
-- This migration ensures that only 1 account exists per public IP address.
-- If duplicate accounts for the same IP are found, the account with the highest
-- Marqs balance is preserved, and duplicate accounts with lower balances are purged.
-- ==============================================================================

-- 1. Deduplicate public.bookz_user_profiles: Keep row with MAX marqs_balance per IP
WITH ranked_profiles AS (
  SELECT 
    id,
    ip_address,
    marqs_balance,
    ROW_NUMBER() OVER (
      PARTITION BY ip_address 
      ORDER BY marqs_balance DESC, last_active DESC, created_at ASC
    ) as rank
  FROM public.bookz_user_profiles
  WHERE ip_address IS NOT NULL 
    AND ip_address <> '' 
    AND ip_address <> '127.0.0.1'
)
DELETE FROM public.bookz_user_profiles
WHERE id IN (
  SELECT id FROM ranked_profiles WHERE rank > 1
);

-- 2. Deduplicate legacy public.user_profiles if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    WITH ranked_legacy AS (
      SELECT 
        id,
        ip_address,
        marqs_balance,
        ROW_NUMBER() OVER (
          PARTITION BY ip_address 
          ORDER BY marqs_balance DESC, last_active DESC, created_at ASC
        ) as rank
      FROM public.user_profiles
      WHERE ip_address IS NOT NULL 
        AND ip_address <> '' 
        AND ip_address <> '127.0.0.1'
    )
    DELETE FROM public.user_profiles
    WHERE id IN (
      SELECT id FROM ranked_legacy WHERE rank > 1
    );
  END IF;
END $$;

-- 3. Create Unique Partial Index on ip_address to enforce 1:1 account mapping in DB
DROP INDEX IF EXISTS idx_bookz_user_profiles_unique_ip;
CREATE UNIQUE INDEX idx_bookz_user_profiles_unique_ip 
  ON public.bookz_user_profiles (ip_address) 
  WHERE ip_address IS NOT NULL AND ip_address <> '' AND ip_address <> '127.0.0.1';

-- 4. Verify RLS policies remain active and permissive for IP-anchored sync
ALTER TABLE public.bookz_user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public bookz_user_profiles IP delete" ON public.bookz_user_profiles;
CREATE POLICY "Public bookz_user_profiles IP delete" 
  ON public.bookz_user_profiles FOR DELETE 
  TO public, anon, authenticated 
  USING (true);
