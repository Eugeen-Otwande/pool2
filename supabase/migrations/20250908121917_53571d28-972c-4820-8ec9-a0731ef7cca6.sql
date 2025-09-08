-- First, drop the existing check constraint on role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add a new check constraint that allows admin, staff, student, member, and resident
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'staff', 'student', 'member', 'resident'));

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