-- Update handle_new_user function to create user_approvals record automatically
-- This ensures all new users are pending approval by default

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
    -- Default behavior for new users - set status to 'pending'
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, status)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'student'),
      'pending'  -- All new users start as pending
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Create user_approvals record for all new signups
    INSERT INTO public.user_approvals (user_id, status, requested_at)
    VALUES (NEW.id, 'pending', now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;