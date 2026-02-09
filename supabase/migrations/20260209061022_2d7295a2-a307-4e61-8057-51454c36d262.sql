-- Create groups table for managing swimmer groups
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  group_type TEXT NOT NULL DEFAULT 'other' CHECK (group_type IN ('university', 'club', 'corporate', 'training', 'school', 'other')),
  expected_session_time TIME,
  schedule_id UUID REFERENCES public.pool_schedules(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table to link users to groups
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  member_email TEXT,
  member_phone TEXT,
  member_role TEXT NOT NULL DEFAULT 'member' CHECK (member_role IN ('student', 'member', 'resident', 'visitor', 'coach', 'instructor', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, member_email)
);

-- Add group_id and checked_in_by to check_ins table
ALTER TABLE public.check_ins 
ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
ADD COLUMN checked_in_by UUID;

-- Create index for faster group queries
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_check_ins_group_id ON public.check_ins(group_id);
CREATE INDEX idx_groups_status ON public.groups(status);

-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for groups
CREATE POLICY "Admin and staff can manage groups"
ON public.groups
FOR ALL
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Everyone can view active groups"
ON public.groups
FOR SELECT
USING (status = 'active');

-- Enable RLS on group_members table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_members
CREATE POLICY "Admin and staff can manage group members"
ON public.group_members
FOR ALL
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Users can view their own group membership"
ON public.group_members
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to bulk check-in group members
CREATE OR REPLACE FUNCTION public.bulk_group_checkin(
  p_group_id UUID,
  p_schedule_id UUID DEFAULT NULL,
  p_checked_in_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
  v_checked_in_count INTEGER := 0;
  v_already_checked_in INTEGER := 0;
  v_check_in_id UUID;
BEGIN
  -- Loop through all active members in the group
  FOR v_member IN 
    SELECT gm.id, gm.user_id, gm.member_name, gm.member_email
    FROM group_members gm
    WHERE gm.group_id = p_group_id AND gm.status = 'active'
  LOOP
    -- Check if member is already checked in today
    IF v_member.user_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM check_ins 
        WHERE user_id = v_member.user_id 
        AND status = 'checked_in'
        AND DATE(check_in_time) = CURRENT_DATE
      ) THEN
        v_already_checked_in := v_already_checked_in + 1;
        CONTINUE;
      END IF;
      
      -- Create check-in record for linked user
      INSERT INTO check_ins (user_id, group_id, schedule_id, checked_in_by, status, check_in_time)
      VALUES (v_member.user_id, p_group_id, p_schedule_id, p_checked_in_by, 'checked_in', now())
      RETURNING id INTO v_check_in_id;
      
      -- Update profile check-in status
      UPDATE profiles 
      SET check_in_status = 'Checked In', 
          check_in_at = now()
      WHERE user_id = v_member.user_id;
      
      v_checked_in_count := v_checked_in_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'checked_in', v_checked_in_count,
    'already_checked_in', v_already_checked_in,
    'message', format('Checked in %s members (%s already checked in)', v_checked_in_count, v_already_checked_in)
  );
END;
$$;

-- Create function to bulk check-out group members
CREATE OR REPLACE FUNCTION public.bulk_group_checkout(
  p_group_id UUID,
  p_checked_out_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
  v_checked_out_count INTEGER := 0;
BEGIN
  -- Loop through all active members in the group who are checked in
  FOR v_member IN 
    SELECT gm.user_id
    FROM group_members gm
    WHERE gm.group_id = p_group_id 
    AND gm.status = 'active'
    AND gm.user_id IS NOT NULL
  LOOP
    -- Update check-in record
    UPDATE check_ins 
    SET status = 'checked_out', 
        check_out_time = now()
    WHERE user_id = v_member.user_id 
    AND group_id = p_group_id
    AND status = 'checked_in'
    AND DATE(check_in_time) = CURRENT_DATE;
    
    IF FOUND THEN
      -- Update profile check-in status
      UPDATE profiles 
      SET check_in_status = 'Checked Out', 
          check_out_at = now()
      WHERE user_id = v_member.user_id;
      
      v_checked_out_count := v_checked_out_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'checked_out', v_checked_out_count,
    'message', format('Checked out %s members', v_checked_out_count)
  );
END;
$$;

-- Create trigger for updated_at on groups
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on group_members
CREATE TRIGGER update_group_members_updated_at
BEFORE UPDATE ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();