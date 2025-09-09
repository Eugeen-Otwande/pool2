-- Allow admins and staff to view all check-ins
DROP POLICY IF EXISTS "check_ins_select_admin_staff" ON public.check_ins;
CREATE POLICY "check_ins_select_admin_staff"
ON public.check_ins
FOR SELECT
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- Allow admins and staff to manage check-ins (insert/update for manual operations)
DROP POLICY IF EXISTS "check_ins_insert_admin_staff" ON public.check_ins;
CREATE POLICY "check_ins_insert_admin_staff"
ON public.check_ins
FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR is_staff(auth.uid()));

DROP POLICY IF EXISTS "check_ins_update_admin_staff" ON public.check_ins;
CREATE POLICY "check_ins_update_admin_staff"
ON public.check_ins
FOR UPDATE
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- Enable real-time for check_ins table
ALTER TABLE public.check_ins REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;

-- Enable real-time for profiles table for user management
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;