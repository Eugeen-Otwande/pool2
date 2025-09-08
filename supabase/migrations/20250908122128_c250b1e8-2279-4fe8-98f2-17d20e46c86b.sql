-- Insert profiles with NULL user_id to avoid foreign key issues
INSERT INTO public.profiles (
  user_id, 
  email, 
  first_name, 
  last_name, 
  role, 
  status
) VALUES 
(
  NULL,
  'otwandeeugeen@gmail.com',
  'Eugene',
  'Otwande',
  'admin',
  'active'
),
(
  NULL,
  'eugeneotwande@outlook.com',
  'Eugene',
  'Otwande',
  'staff',
  'active'
);