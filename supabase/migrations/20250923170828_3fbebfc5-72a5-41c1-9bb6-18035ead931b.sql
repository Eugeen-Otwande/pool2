-- Create activities table for logging all check-in/check-out activities
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'check_in' or 'check_out'
  entity_type TEXT NOT NULL DEFAULT 'check_in', -- 'check_in', 'visitor', etc.
  entity_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Users can view their own activities
CREATE POLICY "Users can view their own activities" 
ON public.activities 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admin and staff can view all activities
CREATE POLICY "Admin and staff can view all activities" 
ON public.activities 
FOR SELECT 
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- System can insert activities (for triggers)
CREATE POLICY "System can insert activities" 
ON public.activities 
FOR INSERT 
WITH CHECK (true);

-- Add missing columns to visitors table if they don't exist
ALTER TABLE public.visitors 
ADD COLUMN IF NOT EXISTS check_in_status TEXT DEFAULT 'Not Checked In',
ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMP WITH TIME ZONE;

-- Update existing check_in_status column default if it exists
UPDATE public.visitors 
SET check_in_status = 'Not Checked In' 
WHERE check_in_status IS NULL;

-- Create trigger function for check_ins timestamps and activity logging
CREATE OR REPLACE FUNCTION public.handle_checkin_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_profile record;
BEGIN
  -- Get user profile for role information
  SELECT * INTO user_profile 
  FROM public.profiles 
  WHERE user_id = NEW.user_id;

  -- When status changes to 'checked_in', set check_in_time and log activity
  IF NEW.status = 'checked_in' AND (OLD IS NULL OR OLD.status != 'checked_in') THEN
    NEW.check_in_time = now();
    NEW.check_out_time = NULL;
    
    -- Log check-in activity
    INSERT INTO public.activities (user_id, user_role, activity_type, entity_type, entity_id, description)
    VALUES (
      NEW.user_id, 
      COALESCE(user_profile.role, 'student'),
      'check_in',
      'check_in',
      NEW.id,
      'User checked into pool session'
    );
  END IF;
  
  -- When status changes to 'checked_out', set check_out_time and log activity
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    NEW.check_out_time = now();
    
    -- Log check-out activity
    INSERT INTO public.activities (user_id, user_role, activity_type, entity_type, entity_id, description)
    VALUES (
      NEW.user_id, 
      COALESCE(user_profile.role, 'student'),
      'check_out',
      'check_in',
      NEW.id,
      'User checked out of pool session'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for check_ins table
DROP TRIGGER IF EXISTS trigger_handle_checkin_changes ON public.check_ins;
CREATE TRIGGER trigger_handle_checkin_changes
  BEFORE UPDATE ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_checkin_changes();

-- Create trigger for check_ins inserts
DROP TRIGGER IF EXISTS trigger_handle_checkin_inserts ON public.check_ins;
CREATE TRIGGER trigger_handle_checkin_inserts
  BEFORE INSERT ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_checkin_changes();

-- Create improved toggle_checkin function that works correctly
CREATE OR REPLACE FUNCTION public.toggle_checkin(p_user_id uuid, p_schedule_id uuid DEFAULT NULL)
RETURNS json AS $$
DECLARE
  current_checkin record;
  result_record record;
  user_profile record;
BEGIN
  -- Get user profile for role information
  SELECT * INTO user_profile 
  FROM public.profiles 
  WHERE user_id = p_user_id;

  -- Get current active check-in for the user (using proper ordering)
  SELECT * INTO current_checkin 
  FROM public.check_ins 
  WHERE user_id = p_user_id AND status = 'checked_in'
  ORDER BY check_in_time DESC NULLS LAST, created_at DESC
  LIMIT 1;
  
  IF current_checkin IS NOT NULL THEN
    -- User is checked in, so check them out
    UPDATE public.check_ins
    SET status = 'checked_out'
    WHERE id = current_checkin.id
    RETURNING * INTO result_record;
    
    RETURN json_build_object(
      'action', 'checked_out',
      'record', row_to_json(result_record),
      'message', 'Successfully checked out'
    );
  ELSE
    -- User is not checked in, so check them in
    INSERT INTO public.check_ins (user_id, schedule_id, status, notes)
    VALUES (p_user_id, p_schedule_id, 'checked_in', 'Self check-in')
    RETURNING * INTO result_record;
    
    RETURN json_build_object(
      'action', 'checked_in',
      'record', row_to_json(result_record),
      'message', 'Successfully checked in'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_checkin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_checkin(uuid) TO authenticated;