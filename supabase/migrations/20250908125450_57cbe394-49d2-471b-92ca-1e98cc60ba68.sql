-- Create comprehensive tables for the admin system

-- 1. User approvals table
CREATE TABLE public.user_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  approval_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enhanced pool schedules table (additional fields)
ALTER TABLE public.pool_schedules 
ADD COLUMN IF NOT EXISTS session_name TEXT,
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_staff INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_residents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 0;

-- 3. Messages/Notifications table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID,
  recipient_role TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'notification',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Message replies table
CREATE TABLE public.message_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Pool logs table
CREATE TABLE public.pool_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  session TEXT NOT NULL,
  students_count INTEGER DEFAULT 0,
  staff_count INTEGER DEFAULT 0,
  residents_count INTEGER DEFAULT 0,
  members_count INTEGER DEFAULT 0,
  total_swimmers INTEGER DEFAULT 0,
  chlorine_ppm DECIMAL(3,1),
  ph_level DECIMAL(3,1),
  water_clarity TEXT,
  chemicals_added TEXT,
  chemical_notes TEXT,
  filtration_system TEXT DEFAULT 'Good',
  pumps_status TEXT DEFAULT 'Working',
  lighting_status TEXT DEFAULT 'Working',
  safety_equipment TEXT DEFAULT 'All Present',
  cleaning_status TEXT DEFAULT 'Excellent',
  maintenance_performed TEXT,
  system_notes TEXT,
  occurrence_reported BOOLEAN DEFAULT false,
  occurrence_details TEXT,
  checked_by UUID,
  checked_by_signature TEXT,
  confirmed_by UUID,
  confirmed_by_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Sports inventory table
CREATE TABLE public.sports_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  quantity_total INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'good',
  barcode TEXT,
  location TEXT,
  purchase_date DATE,
  replacement_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Equipment loans table (enhanced)
ALTER TABLE public.equipment_loans 
ADD COLUMN IF NOT EXISTS equipment_type TEXT DEFAULT 'pool',
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS late_return BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS damage_reported BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS damage_notes TEXT;

-- 8. Reports metadata table
CREATE TABLE public.reports_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  generated_by UUID NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  filters JSONB,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_approvals
CREATE POLICY "Admin can manage all approvals" ON public.user_approvals
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create RLS policies for messages
CREATE POLICY "Users can view their own messages" ON public.messages
FOR SELECT USING (
  sender_id = auth.uid() OR 
  recipient_id = auth.uid() OR
  (recipient_role IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = recipient_role
  ))
);

CREATE POLICY "Admin can send messages to all" ON public.messages
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create RLS policies for message_replies
CREATE POLICY "Users can view replies to their messages" ON public.message_replies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messages 
    WHERE id = message_id AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  )
);

CREATE POLICY "Users can reply to their messages" ON public.message_replies
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages 
    WHERE id = message_id AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  )
);

-- Create RLS policies for pool_logs
CREATE POLICY "Staff and admin can manage pool logs" ON public.pool_logs
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
);

-- Create RLS policies for sports_inventory
CREATE POLICY "Everyone can view sports inventory" ON public.sports_inventory
FOR SELECT USING (true);

CREATE POLICY "Staff and admin can manage sports inventory" ON public.sports_inventory
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
);

-- Create RLS policies for reports_metadata
CREATE POLICY "Admin can manage all reports" ON public.reports_metadata
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add foreign key constraints
ALTER TABLE public.user_approvals
ADD CONSTRAINT fk_user_approvals_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_user_approvals_approved_by FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.messages
ADD CONSTRAINT fk_messages_sender_id FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_messages_recipient_id FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.message_replies
ADD CONSTRAINT fk_message_replies_message_id FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_message_replies_sender_id FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.pool_logs
ADD CONSTRAINT fk_pool_logs_checked_by FOREIGN KEY (checked_by) REFERENCES auth.users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_pool_logs_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.reports_metadata
ADD CONSTRAINT fk_reports_generated_by FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_approvals_updated_at
BEFORE UPDATE ON public.user_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_replies_updated_at
BEFORE UPDATE ON public.message_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pool_logs_updated_at
BEFORE UPDATE ON public.pool_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sports_inventory_updated_at
BEFORE UPDATE ON public.sports_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();