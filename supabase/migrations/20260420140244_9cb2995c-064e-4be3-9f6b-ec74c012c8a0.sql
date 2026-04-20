-- Restrict admin/staff visibility on direct messages to preserve privacy.
-- Admins/staff can only view broadcast messages (those with a recipient_role)
-- or messages they are personally a sender/recipient of.

DROP POLICY IF EXISTS "messages_select_admin_staff" ON public.messages;
CREATE POLICY "messages_select_admin_staff_broadcasts_only"
ON public.messages
FOR SELECT
USING (
  (is_admin(auth.uid()) OR is_staff(auth.uid()))
  AND recipient_role IS NOT NULL
);

-- Replies: admins/staff can only see replies to broadcast messages they can view
DROP POLICY IF EXISTS "message_replies_select_admin_staff" ON public.message_replies;
CREATE POLICY "message_replies_select_admin_staff_broadcasts_only"
ON public.message_replies
FOR SELECT
USING (
  (is_admin(auth.uid()) OR is_staff(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_replies.message_id
      AND m.recipient_role IS NOT NULL
  )
);