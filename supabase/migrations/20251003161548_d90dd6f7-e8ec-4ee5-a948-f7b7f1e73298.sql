-- Drop foreign key constraints and change checked_by and confirmed_by to text
ALTER TABLE public.pool_logs 
  DROP CONSTRAINT IF EXISTS fk_pool_logs_checked_by,
  DROP CONSTRAINT IF EXISTS fk_pool_logs_confirmed_by;

-- Change columns from UUID to text
ALTER TABLE public.pool_logs 
  ALTER COLUMN checked_by TYPE text USING checked_by::text,
  ALTER COLUMN confirmed_by TYPE text USING confirmed_by::text;