-- Drop and recreate v_recent_activities view to fix ambiguous column reference
DROP VIEW IF EXISTS public.v_recent_activities;

CREATE VIEW public.v_recent_activities AS
SELECT 
  check_ins.id,
  check_ins.user_id,
  check_ins.check_in_time,
  check_ins.check_out_time,
  check_ins.created_at,
  profiles.first_name,
  profiles.last_name,
  profiles.role,
  profiles.email,
  check_ins.status,
  check_ins.notes
FROM check_ins
JOIN profiles ON check_ins.user_id = profiles.user_id
ORDER BY check_ins.check_in_time DESC;