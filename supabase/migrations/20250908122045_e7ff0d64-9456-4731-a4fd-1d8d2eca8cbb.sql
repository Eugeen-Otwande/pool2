-- Drop the foreign key constraint completely
ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_id_fkey;

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