-- Create a special trigger to handle pre-existing staff accounts
-- First, let's create a temporary table to store pre-existing accounts

CREATE TABLE IF NOT EXISTS public.pre_existing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  role text NOT NULL,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

-- Insert the staff account into pre-existing accounts
INSERT INTO public.pre_existing_accounts (email, first_name, last_name, role, status)
VALUES ('eugeneotwande@outlook.com', 'Eugene', 'Otwande', 'staff', 'active');

-- Update the handle_new_user function to check for pre-existing accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  existing_account pre_existing_accounts%ROWTYPE;
BEGIN
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
    );
    
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
    );
  END IF;
  
  RETURN NEW;
END;
$$;