-- Create trigger to automatically link residents to auth.users and profiles
-- This trigger runs when a resident is inserted or updated

CREATE OR REPLACE FUNCTION public.auto_link_resident_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_user_id uuid;
  new_user_id uuid;
  temp_password text;
BEGIN
  -- If user_id is already set, skip
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user already exists with this email
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    -- Link to existing user
    NEW.user_id := existing_user_id;
    
    -- Ensure profile exists and has correct role
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, status)
    VALUES (
      existing_user_id,
      NEW.email,
      split_part(NEW.full_name, ' ', 1),
      substring(NEW.full_name from position(' ' in NEW.full_name) + 1),
      'resident',
      'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      role = 'resident',
      status = 'active',
      updated_at = now();
    
    -- Ensure user_roles entry exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_user_id, 'resident'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on residents table
DROP TRIGGER IF EXISTS trg_auto_link_resident ON public.residents;
CREATE TRIGGER trg_auto_link_resident
  BEFORE INSERT OR UPDATE ON public.residents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_resident_to_user();