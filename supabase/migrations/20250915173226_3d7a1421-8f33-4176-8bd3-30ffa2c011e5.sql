-- Add RCMRD officials role to the database schema by updating the allowed roles constraint if it exists
-- This ensures the role can be used in the profiles table

-- Since there isn't a specific role constraint, we can proceed with using 'rcmrd_official' as a role value
-- The role field in profiles table is just text, so we can add a comment for documentation

COMMENT ON COLUMN profiles.role IS 'User role: admin, staff, student, member, resident, visitor, rcmrd_official';

-- Create a function to check if a user is an RCMRD official (similar to admin and staff functions)
CREATE OR REPLACE FUNCTION public.is_rcmrd_official(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.user_id = _uid and p.role = 'rcmrd_official'
  );
$function$;