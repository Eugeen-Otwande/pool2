DROP POLICY IF EXISTS "Users can reply to their messages" ON public.message_replies;

CREATE POLICY "Users can reply to their messages"
ON public.message_replies
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_replies.message_id
      AND (
        m.sender_id = auth.uid()
        OR m.recipient_id = auth.uid()
        OR (
          m.recipient_role IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND p.role = m.recipient_role
          )
        )
      )
  )
);

-- Also broaden SELECT so users can see replies on broadcasts they're targeted by
DROP POLICY IF EXISTS "Users can view replies to their messages" ON public.message_replies;
CREATE POLICY "Users can view replies to their messages"
ON public.message_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_replies.message_id
      AND (
        m.sender_id = auth.uid()
        OR m.recipient_id = auth.uid()
        OR (
          m.recipient_role IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND p.role = m.recipient_role
          )
        )
      )
  )
);