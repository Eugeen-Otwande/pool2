-- First, drop the old constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the corrected constraint that includes 'admin'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'system_admin'::text, 'pool_admin'::text, 'staff'::text, 'student'::text, 'member'::text, 'resident'::text, 'visitor'::text]));

-- Now insert both accounts
INSERT INTO public.profiles (
  user_id, 
  email, 
  first_name, 
  last_name, 
  role, 
  status
) VALUES 
(
  gen_random_uuid(),
  'otwandeeugeen@gmail.com',
  'Eugene',
  'Otwande',
  'admin',
  'active'
),
(
  gen_random_uuid(),
  'eugeneotwande@outlook.com',
  'Eugene',
  'Otwande',
  'staff',
  'active'
);