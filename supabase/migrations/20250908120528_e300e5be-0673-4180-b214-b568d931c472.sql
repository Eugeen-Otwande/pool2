-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Create an enum for roles to ensure consistency
CREATE TYPE public.app_role AS ENUM ('system_admin', 'pool_admin', 'staff', 'student', 'member', 'resident', 'visitor');

-- Create a security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role::app_role = _role
  )
$$;

-- Create another function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role IN ('system_admin', 'pool_admin')
  )
$$;

-- Create new, safer policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

-- Update the profiles table to use the enum type (with migration safety)
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE app_role USING role::app_role;

-- Update other tables' policies to use the new functions
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.pool_schedules;
DROP POLICY IF EXISTS "Staff can view all check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can manage all check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can manage equipment" ON public.equipment;
DROP POLICY IF EXISTS "Staff can view all loans" ON public.equipment_loans;
DROP POLICY IF EXISTS "Staff can manage loans" ON public.equipment_loans;

-- Recreate policies with security definer functions
CREATE POLICY "Admins can manage schedules" 
ON public.pool_schedules 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view all check-ins" 
ON public.check_ins 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'system_admin') OR
  public.has_role(auth.uid(), 'pool_admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can manage all check-ins" 
ON public.check_ins 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'system_admin') OR
  public.has_role(auth.uid(), 'pool_admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can manage equipment" 
ON public.equipment 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'system_admin') OR
  public.has_role(auth.uid(), 'pool_admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can view all loans" 
ON public.equipment_loans 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'system_admin') OR
  public.has_role(auth.uid(), 'pool_admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can manage loans" 
ON public.equipment_loans 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'system_admin') OR
  public.has_role(auth.uid(), 'pool_admin') OR
  public.has_role(auth.uid(), 'staff')
);