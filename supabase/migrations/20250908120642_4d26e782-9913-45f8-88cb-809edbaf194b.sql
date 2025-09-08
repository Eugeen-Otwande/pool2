-- Drop ALL policies that reference the role column
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Drop other policies that might reference profiles table
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.pool_schedules;
DROP POLICY IF EXISTS "Staff can view all check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can manage all check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can manage equipment" ON public.equipment;
DROP POLICY IF EXISTS "Staff can view all loans" ON public.equipment_loans;
DROP POLICY IF EXISTS "Staff can manage loans" ON public.equipment_loans;

-- Create basic policies without role checking for now
CREATE POLICY "Basic user access" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = user_id);

-- Recreate basic policies for other tables
CREATE POLICY "Basic schedule access" 
ON public.pool_schedules 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Basic check-in access" 
ON public.check_ins 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Basic equipment view" 
ON public.equipment 
FOR SELECT 
USING (status = 'available');

CREATE POLICY "Basic loan access" 
ON public.equipment_loans 
FOR ALL 
USING (auth.uid() = user_id);