
-- Indexes for check_ins table performance
CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON public.check_ins (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_status ON public.check_ins (status);
CREATE INDEX IF NOT EXISTS idx_check_ins_group_id ON public.check_ins (group_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON public.check_ins (user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_check_in_time ON public.check_ins (check_in_time DESC);

-- Composite index for the most common query pattern: active check-ins today
CREATE INDEX IF NOT EXISTS idx_check_ins_active_today ON public.check_ins (status, check_in_time DESC) WHERE status = 'checked_in';

-- Composite index for date range + status filtering
CREATE INDEX IF NOT EXISTS idx_check_ins_time_status ON public.check_ins (check_in_time DESC, status);

-- Index on profiles.user_id for fast joins
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Create a view for today's active check-ins with profile and group data joined
CREATE OR REPLACE VIEW public.v_check_ins_with_details AS
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
