-- Update existing admin account role
UPDATE public.profiles 
SET role = 'admin', 
    status = 'active',
    first_name = 'Eugene',
    last_name = 'Otwande'
WHERE email = 'otwandeeugeen@gmail.com';

-- Check if staff account exists, if not we need to handle it differently
-- For now, let's update the admin and see if staff exists
UPDATE public.profiles 
SET role = 'staff', 
    status = 'active',
    first_name = 'Eugene',
    last_name = 'Otwande'
WHERE email = 'eugeneotwande@outlook.com';