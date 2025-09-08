-- Create permanent staff account
-- First, let's create a profile entry for the staff user that will be linked when they sign up

-- Insert staff account profile with a placeholder user_id that will be updated when they sign up
INSERT INTO public.profiles (
  user_id, 
  email, 
  first_name, 
  last_name, 
  role, 
  status
) VALUES (
  NULL,  -- Will be updated when user signs up
  'eugeneotwande@outlook.com',
  'Eugene',
  'Otwande',
  'staff',
  'active'
);