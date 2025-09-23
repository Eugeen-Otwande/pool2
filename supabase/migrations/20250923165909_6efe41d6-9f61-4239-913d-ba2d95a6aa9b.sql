-- Create trigger function to automatically set timestamps when status changes
CREATE OR REPLACE FUNCTION public.update_checkin_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'checked_in', set check_in_time
  IF NEW.status = 'checked_in' AND OLD.status != 'checked_in' THEN
    NEW.check_in_time = now();
    NEW.check_out_time = NULL;
  END IF;
  
  -- When status changes to 'checked_out', set check_out_time
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    NEW.check_out_time = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for check_ins table
DROP TRIGGER IF EXISTS trigger_update_checkin_timestamps ON public.check_ins;
CREATE TRIGGER trigger_update_checkin_timestamps
  BEFORE UPDATE ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_checkin_timestamps();

-- Create toggle check-in function
CREATE OR REPLACE FUNCTION public.toggle_checkin(p_user_id uuid, p_schedule_id uuid DEFAULT NULL)
RETURNS json AS $$
DECLARE
  current_checkin record;
  result_record record;
BEGIN
  -- Get current active check-in for the user
  SELECT * INTO current_checkin 
  FROM public.check_ins 
  WHERE user_id = p_user_id AND status = 'checked_in'
  ORDER BY created_at DESC 
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