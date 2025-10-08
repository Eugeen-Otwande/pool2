-- Add 'faculty' role to profiles table
-- First, we need to drop the existing check constraint and create a new one
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY[
  'admin'::text, 
  'system_admin'::text, 
  'pool_admin'::text, 
  'staff'::text,
  'student'::text, 
  'member'::text, 
  'resident'::text, 
  'visitor'::text,
  'faculty'::text
]));

-- Update pool_schedules to include faculty in allowed_roles where members are allowed
-- This will make faculty have the same schedule access as members
UPDATE public.pool_schedules
SET allowed_roles = array_append(allowed_roles, 'faculty'::text)
WHERE 'member'::text = ANY(allowed_roles) 
  AND NOT ('faculty'::text = ANY(allowed_roles));

-- Add comment for documentation
COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS 
'Allowed roles: admin, system_admin, pool_admin, staff, student, member, resident, visitor, faculty';