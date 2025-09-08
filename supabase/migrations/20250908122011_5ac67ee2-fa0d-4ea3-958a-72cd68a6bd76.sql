-- Drop the existing constraint
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

-- Add the new constraint with 'admin' instead of 'system_admin'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'pool_admin'::text, 'staff'::text, 'student'::text, 'member'::text, 'resident'::text, 'visitor'::text]));

-- Now insert the admin account
INSERT INTO public.profiles (
  user_id, 
  email, 
  first_name, 
  last_name, 
  role, 
  status
) VALUES (
  gen_random_uuid(),
  'otwandeeugeen@gmail.com',
  'Eugene',
  'Otwande',
  'admin',
  'active'
);

-- Insert the staff account
INSERT INTO public.profiles (
  user_id, 
  email, 
  first_name, 
  last_name, 
  role, 
  status
) VALUES (
  gen_random_uuid(),
  'eugeneotwande@outlook.com',
  'Eugene',
  'Otwande',
  'staff',
  'active'
);