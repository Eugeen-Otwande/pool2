-- Fix foreign key relationships for messaging system

-- Drop existing foreign key constraints
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS fk_messages_sender_id;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS fk_messages_recipient_id;
ALTER TABLE public.message_replies DROP CONSTRAINT IF EXISTS fk_message_replies_sender_id;

-- Add proper foreign key relationships to profiles table instead of auth.users
ALTER TABLE public.messages
ADD CONSTRAINT fk_messages_sender_user_id FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages
ADD CONSTRAINT fk_messages_recipient_user_id FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.message_replies
ADD CONSTRAINT fk_message_replies_sender_user_id FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;