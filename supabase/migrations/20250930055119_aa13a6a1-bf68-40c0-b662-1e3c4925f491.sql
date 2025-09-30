-- Fix the toggle_checkin_for_user function with proper error handling and debug logging
DROP FUNCTION IF EXISTS public.toggle_checkin_for_user(uuid);

CREATE OR REPLACE FUNCTION public.toggle_checkin_for_user(_user_id uuid)
RETURNS TABLE (
  check_in_id uuid,
  user_id uuid,
  status text,
  check_in_time timestamptz,
  check_out_time timestamptz,
  message text
) AS $$
DECLARE
  active_checkin_id uuid;
  user_exists boolean;
  result_status text;
  result_check_in_time timestamptz;
  result_check_out_time timestamptz;
  result_id uuid;
BEGIN
  -- Check if user exists in profiles table
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = _user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Return error for missing user
    check_in_id := null;
    user_id := _user_id;
    status := 'error';
    check_in_time := null;
    check_out_time := null;
    message := 'User not found in profiles table';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check for existing active check-in
  SELECT ci.id INTO active_checkin_id
  FROM public.check_ins ci
  WHERE ci.user_id = _user_id 
    AND ci.status = 'checked_in' 
    AND ci.check_out_time IS NULL
  ORDER BY ci.check_in_time DESC
  LIMIT 1;

  IF active_checkin_id IS NULL THEN
    -- No active check-in, so check the user in
    BEGIN
      INSERT INTO public.check_ins (user_id, status, check_in_time)
      VALUES (_user_id, 'checked_in', now())
      RETURNING ci.id, ci.status, ci.check_in_time, ci.check_out_time
      INTO result_id, result_status, result_check_in_time, result_check_out_time;
      
      -- Return success result
      check_in_id := result_id;
      user_id := _user_id;
      status := result_status;
      check_in_time := result_check_in_time;
      check_out_time := result_check_out_time;
      message := 'User successfully checked in';
      
    EXCEPTION WHEN OTHERS THEN
      -- Return database error
      check_in_id := null;
      user_id := _user_id;
      status := 'error';
      check_in_time := null;
      check_out_time := null;
      message := 'Database constraint violation: ' || SQLERRM;
    END;
  ELSE
    -- User has active check-in, so check them out
    BEGIN
      UPDATE public.check_ins
      SET status = 'checked_out',
          check_out_time = now()
      WHERE id = active_checkin_id
      RETURNING ci.id, ci.status, ci.check_in_time, ci.check_out_time
      INTO result_id, result_status, result_check_in_time, result_check_out_time;
      
      -- Return success result
      check_in_id := result_id;
      user_id := _user_id;
      status := result_status;
      check_in_time := result_check_in_time;
      check_out_time := result_check_out_time;
      message := 'User successfully checked out';
      
    EXCEPTION WHEN OTHERS THEN
      -- Return database error
      check_in_id := active_checkin_id;
      user_id := _user_id;
      status := 'error';
      check_in_time := null;
      check_out_time := null;
      message := 'Database constraint violation during checkout: ' || SQLERRM;
    END;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.toggle_checkin_for_user(uuid) TO authenticated;

-- Create a helper function to get user check-in status
CREATE OR REPLACE FUNCTION public.get_user_checkin_status(_user_id uuid)
RETURNS TABLE (
  is_checked_in boolean,
  latest_checkin_id uuid,
  check_in_time timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN ci.id IS NOT NULL THEN true ELSE false END as is_checked_in,
    ci.id as latest_checkin_id,
    ci.check_in_time
  FROM public.check_ins ci
  WHERE ci.user_id = _user_id 
    AND ci.status = 'checked_in' 
    AND ci.check_out_time IS NULL
  ORDER BY ci.check_in_time DESC
  LIMIT 1;
  
  -- If no active check-in found, return false
  IF NOT FOUND THEN
    is_checked_in := false;
    latest_checkin_id := null;
    check_in_time := null;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_checkin_status(uuid) TO authenticated;