-- Create trigger function to distribute role-based messages to all users in that role
CREATE OR REPLACE FUNCTION public.distribute_role_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- Only distribute if this is a role-based message (no recipient_id but has recipient_role)
  IF NEW.recipient_id IS NULL AND NEW.recipient_role IS NOT NULL THEN
    -- Insert individual messages for each user with the target role
    INSERT INTO public.messages (sender_id, recipient_id, recipient_role, title, content, message_type)
    SELECT 
      NEW.sender_id, 
      p.user_id, 
      NEW.recipient_role, 
      NEW.title, 
      NEW.content, 
      NEW.message_type
    FROM public.profiles p
    WHERE p.role = NEW.recipient_role 
      AND p.status = 'active'
      AND p.user_id != NEW.sender_id; -- Don't send to self
    
    -- Return NULL to prevent the original role-based message from being inserted
    RETURN NULL;
  END IF;
  
  -- For direct messages, allow normal insertion
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS distribute_role_messages_trigger ON public.messages;

-- Create trigger on messages table
CREATE TRIGGER distribute_role_messages_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.distribute_role_messages();

-- Create trigger function to update parent message timestamp when reply is added
CREATE OR REPLACE FUNCTION public.update_message_on_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent message's updated_at timestamp
  UPDATE public.messages
  SET updated_at = now()
  WHERE id = NEW.message_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_message_on_reply_trigger ON public.message_replies;

-- Create trigger on message_replies table
CREATE TRIGGER update_message_on_reply_trigger
AFTER INSERT ON public.message_replies
FOR EACH ROW EXECUTE FUNCTION public.update_message_on_reply();

-- Create a summary view for debugging messages
CREATE OR REPLACE VIEW public.v_messages_summary AS
SELECT 
  m.id,
  m.sender_id,
  m.recipient_id,
  m.recipient_role,
  COALESCE(p_sender.first_name || ' ' || p_sender.last_name, p_sender.email) AS sender_name,
  COALESCE(p_recipient.first_name || ' ' || p_recipient.last_name, p_recipient.email) AS recipient_name,
  m.title,
  m.content,
  m.message_type,
  m.read_at,
  m.created_at,
  m.updated_at,
  (SELECT COUNT(*) FROM public.message_replies WHERE message_id = m.id) AS reply_count
FROM public.messages m
LEFT JOIN public.profiles p_sender ON m.sender_id = p_sender.user_id
LEFT JOIN public.profiles p_recipient ON m.recipient_id = p_recipient.user_id
ORDER BY m.created_at DESC;