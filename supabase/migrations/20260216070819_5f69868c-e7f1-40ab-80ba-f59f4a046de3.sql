
-- Add created_by and must_change_password columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Add created_by_type to track self vs staff/admin creation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_origin text NOT NULL DEFAULT 'self_signup'
CHECK (account_origin IN ('self_signup', 'staff_created', 'admin_created'));

-- Update handle_new_user to set account_origin
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_account pre_existing_accounts%ROWTYPE;
  new_role text;
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Check for pre-existing account
  SELECT * INTO existing_account 
  FROM public.pre_existing_accounts 
  WHERE email = NEW.email;

  IF FOUND THEN
    new_role := existing_account.role;
    
    -- Create profile - staff/admin created account
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, status, account_origin, must_change_password)
    VALUES (
      NEW.id,
      NEW.email,
      existing_account.first_name,
      existing_account.last_name,
      existing_account.role,
      COALESCE(existing_account.status, 'active'),
      'staff_created',
      true
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create role entry
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, existing_account.role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    DELETE FROM public.pre_existing_accounts WHERE email = NEW.email;
  ELSE
    new_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student');
    
    -- Create profile with pending status - self signup
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, status, account_origin, must_change_password)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      new_role,
      'pending',
      'self_signup',
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create role entry
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, new_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create approval record
    INSERT INTO public.user_approvals (user_id, status, requested_at)
    VALUES (NEW.id, 'pending', now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
