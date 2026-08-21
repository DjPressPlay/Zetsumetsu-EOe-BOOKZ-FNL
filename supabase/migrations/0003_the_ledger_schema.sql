-- The Ledger: Append-only Public Operations Log
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  title TEXT NOT NULL,
  target_id TEXT,
  target_title TEXT,
  target_path TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON public.ledger_entries (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_action ON public.ledger_entries (action);
CREATE INDEX IF NOT EXISTS idx_ledger_target_id ON public.ledger_entries (target_id);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Ledger" ON public.ledger_entries;
CREATE POLICY "Public Read Ledger" 
ON public.ledger_entries 
FOR SELECT 
TO public, anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Public Insert Ledger" ON public.ledger_entries;
CREATE POLICY "Public Insert Ledger" 
ON public.ledger_entries 
FOR INSERT 
TO public, anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Ledger" ON public.ledger_entries;
CREATE POLICY "Public Update Ledger" 
ON public.ledger_entries 
FOR UPDATE 
TO public, anon, authenticated 
USING (true)
WITH CHECK (true);

