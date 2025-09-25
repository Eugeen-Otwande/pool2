-- Add check-in status fields to profiles table for consistent student experience
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS check_in_status text DEFAULT 'Not Checked In',
ADD COLUMN IF NOT EXISTS check_in_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS check_out_at timestamp with time zone;

-- Create trigger function to update check-in timestamps on profile when check_ins table changes
CREATE OR REPLACE FUNCTION public.update_profile_checkin_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user checks in
  IF NEW.status = 'checked_in' AND (OLD IS NULL OR OLD.status != 'checked_in') THEN
    UPDATE public.profiles
    SET 
      check_in_status = 'Checked In',
      check_in_at = NEW.check_in_time,
      check_out_at = NULL
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- When a user checks out
  IF NEW.status = 'checked_out' AND OLD.status = 'checked_in' THEN
    UPDATE public.profiles
    SET 
      check_in_status = 'Checked Out',
      check_out_at = NEW.check_out_time
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update profile status when check_ins change
DROP TRIGGER IF EXISTS update_profile_checkin_trigger ON public.check_ins;
CREATE TRIGGER update_profile_checkin_trigger
  AFTER INSERT OR UPDATE ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_checkin_status();

-- Create function to handle check-in/out logic that also updates profile
CREATE OR REPLACE FUNCTION public.student_toggle_checkin(p_user_id uuid, p_schedule_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_checkin record;
  result_record record;
  profile_role text;
BEGIN
  -- Check if user is a student
  SELECT role INTO profile_role 
  FROM public.profiles 
  WHERE user_id = p_user_id;
  
  IF profile_role != 'student' THEN
    RAISE EXCEPTION 'This function is only for students';
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
      'message', 'Successfully checked out'
    );
  ELSE
    -- User is not checked in, so check them in
    INSERT INTO public.check_ins (user_id, schedule_id, status, notes, check_in_time)
    VALUES (p_user_id, p_schedule_id, 'checked_in', 'Student self check-in', now())
    RETURNING * INTO result_record;
    
    RETURN json_build_object(
      'action', 'checked_in',
      'record', row_to_json(result_record),
      'message', 'Successfully checked in'
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.student_toggle_checkin(uuid, uuid) TO authenticated;

-- Update existing profiles to have correct initial check-in status
UPDATE public.profiles 
SET check_in_status = 'Not Checked In'
WHERE check_in_status IS NULL;