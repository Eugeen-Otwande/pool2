-- Update the v_recent_activities view to include email field
DROP VIEW IF EXISTS public.v_recent_activities;

CREATE OR REPLACE VIEW public.v_recent_activities AS
SELECT
  ci.id,
  ci.user_id,
  p.first_name,
  p.last_name,
  p.role,
  p.email,
  ci.check_in_time,
  ci.check_out_time,
  ci.status,
  ci.notes,
  ci.created_at
FROM public.check_ins ci
LEFT JOIN public.profiles p ON p.user_id = ci.user_id
ORDER BY ci.check_in_time DESC;