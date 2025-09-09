-- Fix RLS to allow admins and staff to see other users and ensure messaging visibility

-- 1) PROFILES: Replace restrictive policies with permissive ones combining conditions properly
DROP POLICY IF EXISTS "Admins and staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Basic user access" ON public.profiles;

-- SELECT: users can see themselves OR admins/staff can see everyone
CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR is_admin(auth.uid())
  OR is_staff(auth.uid())
);

-- UPDATE: a) users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- UPDATE: b) admins can update any profile
CREATE POLICY "profiles_update_admin"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Ensure updated_at maintains automatically
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) MESSAGES: allow admins and staff to view all messages while keeping existing user visibility
DROP POLICY IF EXISTS "messages_select_admin_staff" ON public.messages;
CREATE POLICY "messages_select_admin_staff"
ON public.messages
FOR SELECT
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- 3) MESSAGE_REPLIES: allow admins and staff to view all replies
DROP POLICY IF EXISTS "message_replies_select_admin_staff" ON public.message_replies;
CREATE POLICY "message_replies_select_admin_staff"
ON public.message_replies
FOR SELECT
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- 4) Ensure profiles are auto-created on signup by adding the missing trigger on auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_handle_new_user'
  ) THEN
    CREATE TRIGGER on_auth_user_created_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END$$;