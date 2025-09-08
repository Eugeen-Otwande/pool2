-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_equipment_updated_at ON public.equipment;
DROP TRIGGER IF EXISTS update_pool_schedules_updated_at ON public.pool_schedules;
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
DROP TRIGGER IF EXISTS update_message_replies_updated_at ON public.message_replies;

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

-- Add foreign key relationships (with IF NOT EXISTS equivalent)
DO $$ 
BEGIN
    -- Add check_ins to pool_schedules foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_check_ins_schedule'
    ) THEN
        ALTER TABLE public.check_ins 
        ADD CONSTRAINT fk_check_ins_schedule 
        FOREIGN KEY (schedule_id) REFERENCES public.pool_schedules(id) ON DELETE SET NULL;
    END IF;

    -- Add equipment_loans to equipment foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_equipment_loans_equipment'
    ) THEN
        ALTER TABLE public.equipment_loans 
        ADD CONSTRAINT fk_equipment_loans_equipment 
        FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;
    END IF;

    -- Add message_replies to messages foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_message_replies_message'
    ) THEN
        ALTER TABLE public.message_replies 
        ADD CONSTRAINT fk_message_replies_message 
        FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;
    END IF;
END $$;