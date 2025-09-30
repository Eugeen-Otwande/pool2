-- Fix the toggle_checkin_for_user function to resolve ambiguous column reference
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_checkin_for_user(uuid) TO authenticated;

-- Add foreign key relationship between check_ins and profiles
ALTER TABLE public.check_ins 
ADD CONSTRAINT fk_check_ins_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update the v_recent_activities view to use proper joins
DROP VIEW IF EXISTS public.v_recent_activities;

CREATE OR REPLACE VIEW public.v_recent_activities AS
SELECT
  ci.id,
  ci.user_id,
  p.first_name,
  p.last_name,
  p.role,
  ci.check_in_time,
  ci.check_out_time,
  ci.status,
  ci.notes,
  ci.created_at
FROM public.check_ins ci
LEFT JOIN public.profiles p ON p.user_id = ci.user_id
ORDER BY ci.check_in_time DESC;