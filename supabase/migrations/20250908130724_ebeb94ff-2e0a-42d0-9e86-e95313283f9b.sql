-- Create trigger to handle new user registrations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_account pre_existing_accounts%ROWTYPE;
BEGIN
  -- Check if this email has a pre-existing account
  SELECT * INTO existing_account 
  FROM public.pre_existing_accounts 
  WHERE email = NEW.email;

  IF FOUND THEN
    -- Use the pre-existing account details
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, status)
    VALUES (
      NEW.id,
      NEW.email,
      existing_account.first_name,
      existing_account.last_name,
      existing_account.role,
      existing_account.status
    );
    
    -- Remove from pre-existing accounts table
    DELETE FROM public.pre_existing_accounts WHERE email = NEW.email;
  ELSE
    -- Default behavior for new users - extract from metadata
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'firstName'),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', NEW.raw_user_meta_data ->> 'lastName'),
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'student'),
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger for profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for equipment table
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for pool_schedules table
CREATE TRIGGER update_pool_schedules_updated_at
  BEFORE UPDATE ON public.pool_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for messages table
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for message_replies table
CREATE TRIGGER update_message_replies_updated_at
  BEFORE UPDATE ON public.message_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key relationships
ALTER TABLE public.check_ins 
ADD CONSTRAINT fk_check_ins_schedule 
FOREIGN KEY (schedule_id) REFERENCES public.pool_schedules(id) ON DELETE SET NULL;

ALTER TABLE public.equipment_loans 
ADD CONSTRAINT fk_equipment_loans_equipment 
FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;

ALTER TABLE public.message_replies 
ADD CONSTRAINT fk_message_replies_message 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;