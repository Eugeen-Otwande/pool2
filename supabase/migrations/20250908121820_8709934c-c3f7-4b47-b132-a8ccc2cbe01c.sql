-- Insert admin account
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
) ON CONFLICT (email) DO UPDATE SET 
  role = 'admin',
  status = 'active';

-- Insert staff account
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
) ON CONFLICT (email) DO UPDATE SET 
  role = 'staff',
  status = 'active';