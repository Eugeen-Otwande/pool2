-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'student', 'resident', 'member', 'rcmrd_official', 'rcmrd_team', 'visitor');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'staff' THEN 2
      WHEN 'rcmrd_official' THEN 3
      WHEN 'rcmrd_team' THEN 4
      WHEN 'resident' THEN 5
      WHEN 'member' THEN 6
      WHEN 'student' THEN 7
      WHEN 'visitor' THEN 8
      ELSE 9
    END
  LIMIT 1
$$;

-- Update is_admin function to use user_roles
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin');
$$;

-- Update is_staff function to use user_roles
CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'staff');
$$;

-- Update is_rcmrd_official function to use user_roles
CREATE OR REPLACE FUNCTION public.is_rcmrd_official(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'rcmrd_official');
$$;

-- Update is_rcmrd_team function to use user_roles
CREATE OR REPLACE FUNCTION public.is_rcmrd_team(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'rcmrd_team');
$$;

-- Create function to sync role changes
CREATE OR REPLACE FUNCTION public.sync_user_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profiles.role to match primary role
  UPDATE public.profiles
  SET role = (SELECT public.get_user_role(NEW.user_id)),
      updated_at = now()
  WHERE user_id = NEW.user_id;
  
  -- If role is resident, ensure entry in residents table
  IF NEW.role = 'resident' THEN
    INSERT INTO public.residents (user_id, name, email, status)
    SELECT 
      p.user_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email),
      p.email,
      'active'
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id
    ON CONFLICT (user_id) DO UPDATE
    SET status = 'active', updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for role synchronization
CREATE TRIGGER sync_role_on_user_roles_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_change();

-- Update handle_new_user to use user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    
    -- Create profile
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
    
    -- Create role entry
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, existing_account.role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    DELETE FROM public.pre_existing_accounts WHERE email = NEW.email;
  ELSE
    new_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student');
    
    -- Create profile with pending status
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, status)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      new_role,
      'pending'
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
$$;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (is_admin(auth.uid()));

-- Create function to update user role
CREATE OR REPLACE FUNCTION public.update_user_role(
  _user_id uuid,
  _new_role text,
  _updated_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_role text;
  result json;
BEGIN
  -- Check if caller is admin or staff
  IF NOT (is_admin(_updated_by) OR is_staff(_updated_by)) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  
  -- Get current role
  SELECT role INTO old_role FROM public.profiles WHERE user_id = _user_id;
  
  -- Delete old role from user_roles
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  
  -- Insert new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _new_role::app_role);
  
  -- Update profiles (will be synced by trigger)
  UPDATE public.profiles
  SET role = _new_role, updated_at = now()
  WHERE user_id = _user_id;
  
  -- Handle role-specific table updates
  IF _new_role = 'resident' THEN
    INSERT INTO public.residents (user_id, name, email, status)
    SELECT 
      p.user_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email),
      p.email,
      'active'
    FROM public.profiles p
    WHERE p.user_id = _user_id
    ON CONFLICT (user_id) DO UPDATE
    SET status = 'active', updated_at = now();
  ELSIF old_role = 'resident' AND _new_role != 'resident' THEN
    UPDATE public.residents
    SET status = 'inactive', updated_at = now()
    WHERE user_id = _user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Role updated successfully and synced across the system',
    'old_role', old_role,
    'new_role', _new_role
  );
END;
$$;