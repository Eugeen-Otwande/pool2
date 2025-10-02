-- Fix signup flow by preventing duplicate key errors in handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_account pre_existing_accounts%ROWTYPE;
BEGIN
  -- Check if profile already exists (prevents duplicate key errors)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Check if this email has a pre-existing account
  SELECT * INTO existing_account 
  FROM public.pre_existing_accounts 
  WHERE email = NEW.email;

  IF FOUND THEN
    -- Use the pre-existing account details
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, status)
    VALUES (
      NEW.id,
      NEW.email,
      existing_account.first_name,
      existing_account.last_name,
      existing_account.role,
      existing_account.status
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Remove from pre-existing accounts table
    DELETE FROM public.pre_existing_accounts WHERE email = NEW.email;
  ELSE
    -- Default behavior for new users
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();