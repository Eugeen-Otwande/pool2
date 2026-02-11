
-- Fix security definer view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.v_check_ins_with_details;
CREATE VIEW public.v_check_ins_with_details WITH (security_invoker = true) AS
SELECT 
  ci.id,
  ci.user_id,
  ci.check_in_time,
  ci.check_out_time,
  ci.status,
  ci.notes,
  ci.group_id,
  ci.checked_in_by,
  ci.schedule_id,
  ci.created_at,
  p.first_name,
  p.last_name,
  p.email AS user_email,
  p.role AS user_role,
  g.name AS group_name
FROM public.check_ins ci
LEFT JOIN public.profiles p ON p.user_id = ci.user_id
LEFT JOIN public.groups g ON g.id = ci.group_id;
