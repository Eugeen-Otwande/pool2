-- First, let's check if these accounts already exist
-- If they don't exist, we'll insert them

-- Insert admin account (only if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'otwandeeugeen@gmail.com') THEN
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
  ELSE
    UPDATE public.profiles 
    SET role = 'admin', status = 'active'
    WHERE email = 'otwandeeugeen@gmail.com';
  END IF;
END $$;

-- Insert staff account (only if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'eugeneotwande@outlook.com') THEN
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
  ELSE
    UPDATE public.profiles 
    SET role = 'staff', status = 'active'
    WHERE email = 'eugeneotwande@outlook.com';
  END IF;
END $$;