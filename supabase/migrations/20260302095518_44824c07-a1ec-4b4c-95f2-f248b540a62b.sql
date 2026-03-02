
-- 1. Add unique constraint on user_approvals.user_id for upsert to work
ALTER TABLE public.user_approvals ADD CONSTRAINT user_approvals_user_id_unique UNIQUE (user_id);

-- 2. Allow staff to manage user_approvals (approve/reject)
CREATE POLICY "Staff can manage approvals"
ON public.user_approvals
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 3. Allow staff to update profiles (for approving/rejecting users)
CREATE POLICY "profiles_update_staff"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- 4. Add index on profiles.status for faster approval queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
