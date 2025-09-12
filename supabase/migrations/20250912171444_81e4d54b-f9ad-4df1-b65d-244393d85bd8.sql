-- Create residence_members table for residence management
CREATE TABLE public.residence_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  school TEXT NOT NULL,
  hostel_admission TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.residence_members ENABLE ROW LEVEL SECURITY;

-- Create policies for residence_members
CREATE POLICY "Admin and staff can manage residence members" 
ON public.residence_members 
FOR ALL 
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- Create RLS policy for residents to view their own data
CREATE POLICY "Residents can view their own data" 
ON public.residence_members 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_residence_members_updated_at
BEFORE UPDATE ON public.residence_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_residence_members_email ON public.residence_members(email);
CREATE INDEX idx_residence_members_user_id ON public.residence_members(user_id);
CREATE INDEX idx_residence_members_status ON public.residence_members(status);

-- Create function to handle residence member self-checkin
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