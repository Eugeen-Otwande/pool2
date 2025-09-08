-- Drop and recreate the role constraint to include 'admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the constraint with all roles including 'admin'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'system_admin'::text, 'pool_admin'::text, 'staff'::text, 'student'::text, 'member'::text, 'resident'::text, 'visitor'::text]));

-- Now update the admin account role
UPDATE public.profiles 
SET role = 'admin', 
    status = 'active',
    first_name = 'Eugene',
    last_name = 'Otwande'
WHERE email = 'otwandeeugeen@gmail.com';