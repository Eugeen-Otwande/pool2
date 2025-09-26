-- Make problematic columns nullable first
ALTER TABLE public.residents ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.residents ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.residents ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.residents ALTER COLUMN password_hash DROP NOT NULL;

-- Add missing fields from residence_members to residents table
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS school text,
ADD COLUMN IF NOT EXISTS hostel_admission text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update existing residents with proper data
UPDATE public.residents 
SET 
  full_name = COALESCE(name, 'Unknown'),
  phone_number = COALESCE(phone, ''),
  status = 'active',
  updated_at = now()
WHERE full_name IS NULL;

-- Fix any null values in existing data
UPDATE public.residents 
SET 
  name = COALESCE(name, full_name, 'Unknown'),
  phone = COALESCE(phone, phone_number, ''),
  email = COALESCE(email, 'unknown@example.com'),
  password_hash = COALESCE(password_hash, 'legacy_password')
WHERE name IS NULL OR phone IS NULL OR email IS NULL OR password_hash IS NULL;

-- Insert residence_members data into residents table (avoiding duplicates)
INSERT INTO public.residents (
  full_name, email, phone_number, school, hostel_admission, 
  status, user_id, created_by, created_at, updated_at, 
  name, phone, password_hash, role
)
SELECT 
  rm.full_name, 
  rm.email, 
  rm.phone_number, 
  rm.school, 
  rm.hostel_admission,
  rm.status, 
  rm.user_id, 
  rm.created_by, 
  rm.created_at, 
  rm.updated_at,
  rm.full_name,
  COALESCE(rm.phone_number, ''),
  'legacy_password',
  'Resident'
FROM public.residence_members rm
WHERE NOT EXISTS (
  SELECT 1 FROM public.residents r 
  WHERE r.email = rm.email AND rm.email IS NOT NULL
);

-- Restore NOT NULL constraints where appropriate
ALTER TABLE public.residents ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.residents ALTER COLUMN email SET NOT NULL;

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_residents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_residents_updated_at_trigger ON public.residents;
CREATE TRIGGER update_residents_updated_at_trigger
  BEFORE UPDATE ON public.residents
  FOR EACH ROW
  EXECUTE FUNCTION update_residents_updated_at();

-- Update RLS policies for residents table
DROP POLICY IF EXISTS "Residents can view their own data" ON public.residents;
DROP POLICY IF EXISTS "Admin and staff can view all residents" ON public.residents;
DROP POLICY IF EXISTS "Admin can manage residents" ON public.residents;

CREATE POLICY "Residents can view their own data" ON public.residents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin and staff can view all residents" ON public.residents
  FOR SELECT USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Admin and staff can manage residents" ON public.residents
  FOR ALL USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- Create a function for resident check-in/check-out toggle
CREATE OR REPLACE FUNCTION public.resident_toggle_checkin(p_user_id uuid, p_schedule_id uuid DEFAULT NULL::uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_checkin record;
  result_record record;
  resident_exists boolean;
BEGIN
  -- Check if resident exists
  SELECT EXISTS(
    SELECT 1 FROM public.residents 
    WHERE user_id = p_user_id AND status = 'active'
  ) INTO resident_exists;
  
  IF NOT resident_exists THEN
    RAISE EXCEPTION 'Resident not found or inactive';
  END IF;
  
  -- Get current active check-in for the user
  SELECT * INTO current_checkin 
  FROM public.check_ins 
  WHERE user_id = p_user_id AND status = 'checked_in'
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF current_checkin IS NOT NULL THEN
    -- User is checked in, so check them out
    UPDATE public.check_ins
    SET status = 'checked_out', check_out_time = now()
    WHERE id = current_checkin.id
    RETURNING * INTO result_record;
    
    RETURN json_build_object(
      'action', 'checked_out',
      'record', row_to_json(result_record),
      'message', 'Resident successfully checked out'
    );
  ELSE
    -- User is not checked in, so check them in
    INSERT INTO public.check_ins (user_id, schedule_id, status, notes, check_in_time)
    VALUES (p_user_id, p_schedule_id, 'checked_in', 'Resident check-in', now())
    RETURNING * INTO result_record;
    
    RETURN json_build_object(
      'action', 'checked_in',
      'record', row_to_json(result_record),
      'message', 'Resident successfully checked in'
    );
  END IF;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.resident_toggle_checkin TO authenticated;