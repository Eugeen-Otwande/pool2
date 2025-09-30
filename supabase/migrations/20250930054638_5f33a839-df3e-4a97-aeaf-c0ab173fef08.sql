-- Fix search path for toggle_checkin_for_user function to address security warning
DROP FUNCTION IF EXISTS public.toggle_checkin_for_user(uuid);

CREATE OR REPLACE FUNCTION public.toggle_checkin_for_user(_user_id uuid)
RETURNS TABLE (
  check_in_id uuid,
  user_id uuid,
  status text,
  check_in_time timestamptz,
  check_out_time timestamptz
) AS $$
DECLARE
  active_id uuid;
BEGIN
  -- Use explicit table references to avoid ambiguity
  SELECT ci.id INTO active_id
  FROM public.check_ins ci
  WHERE ci.user_id = _user_id AND ci.status = 'checked_in' AND ci.check_out_time IS NULL
  ORDER BY ci.check_in_time DESC
  LIMIT 1;

  IF active_id IS NULL THEN
    -- Check in the user
    INSERT INTO public.check_ins (user_id, status, check_in_time)
    VALUES (_user_id, 'checked_in', now())
    RETURNING id, public.check_ins.user_id, status, check_in_time, check_out_time
    INTO check_in_id, user_id, status, check_in_time, check_out_time;
  ELSE
    -- Check out the user
    UPDATE public.check_ins
    SET status = 'checked_out',
        check_out_time = now()
    WHERE id = active_id
    RETURNING id, public.check_ins.user_id, status, check_in_time, check_out_time
    INTO check_in_id, user_id, status, check_in_time, check_out_time;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.toggle_checkin_for_user(uuid) TO authenticated;