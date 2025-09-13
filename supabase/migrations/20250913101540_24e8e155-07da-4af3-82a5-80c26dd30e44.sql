-- Create residence members table
CREATE TABLE IF NOT EXISTS public.residence_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  school TEXT NOT NULL,
  hostel_admission TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.residence_members ENABLE ROW LEVEL SECURITY;

-- Create policies for residence members
CREATE POLICY "Admin and staff can manage residence members" 
ON public.residence_members 
FOR ALL 
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Residents can view their own data" 
ON public.residence_members 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function for residence member check-in
CREATE OR REPLACE FUNCTION public.residence_member_checkin(
  member_id UUID,
  schedule_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_user_id UUID;
  checkin_id UUID;
BEGIN
  -- Get the user_id for the residence member
  SELECT user_id INTO member_user_id 
  FROM residence_members 
  WHERE id = member_id AND status = 'active';
  
  IF member_user_id IS NULL THEN
    RAISE EXCEPTION 'Residence member not found or inactive';
  END IF;
  
  -- Create check-in record
  INSERT INTO check_ins (user_id, schedule_id, status, notes)
  VALUES (member_user_id, schedule_id, 'checked_in', 'Self check-in by admin/staff for residence member')
  RETURNING id INTO checkin_id;
  
  RETURN checkin_id;
END;
$$;

-- Enable realtime for residence_members and check_ins
ALTER TABLE public.residence_members REPLICA IDENTITY FULL;
ALTER TABLE public.check_ins REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.residence_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;

-- Create trigger for updated_at
CREATE TRIGGER update_residence_members_updated_at
BEFORE UPDATE ON public.residence_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();