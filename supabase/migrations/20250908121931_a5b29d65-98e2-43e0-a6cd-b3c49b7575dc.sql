-- First, make user_id nullable so we can create profiles without auth users
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Drop the foreign key constraint temporarily  
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Now insert the admin account with a generated UUID but no auth link
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