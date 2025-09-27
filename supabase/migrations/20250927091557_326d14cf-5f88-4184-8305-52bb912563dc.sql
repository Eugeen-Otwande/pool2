-- Update check_ins table to support pending approval workflow
ALTER TABLE public.check_ins 
DROP CONSTRAINT IF EXISTS check_ins_status_check;

-- Add new status values including approval workflow
ALTER TABLE public.check_ins 
ADD CONSTRAINT check_ins_status_check 
CHECK (status IN ('pending_approval', 'checked_in', 'checked_out', 'rejected'));

-- Update default status to pending_approval for new workflow
ALTER TABLE public.check_ins 
ALTER COLUMN status SET DEFAULT 'pending_approval';

-- Create function to handle check-in approval
CREATE OR REPLACE FUNCTION public.approve_checkin(checkin_id uuid, approved_by_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_record record;
BEGIN
  -- Update the check-in status to approved
  UPDATE public.check_ins
  SET 
    status = 'checked_in',
    check_in_time = now(),
    notes = COALESCE(notes, '') || ' - Approved by staff/admin'
  WHERE id = checkin_id AND status = 'pending_approval'
  RETURNING * INTO result_record;
  
  IF result_record IS NULL THEN
    RAISE EXCEPTION 'Check-in not found or already processed';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'record', row_to_json(result_record),
    'message', 'Check-in approved successfully'
  );
END;
$$;

-- Create function to reject check-in
CREATE OR REPLACE FUNCTION public.reject_checkin(checkin_id uuid, rejected_by_user_id uuid, rejection_reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_record record;
BEGIN
  -- Update the check-in status to rejected
  UPDATE public.check_ins
  SET 
    status = 'rejected',
    notes = COALESCE(notes, '') || ' - Rejected: ' || COALESCE(rejection_reason, 'No reason provided')
  WHERE id = checkin_id AND status = 'pending_approval'
  RETURNING * INTO result_record;
  
  IF result_record IS NULL THEN
    RAISE EXCEPTION 'Check-in not found or already processed';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'record', row_to_json(result_record),
    'message', 'Check-in rejected'
  );
END;
$$;

-- Create function for force checkout
CREATE OR REPLACE FUNCTION public.force_checkout(checkin_id uuid, forced_by_user_id uuid, force_reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_record record;
BEGIN
  -- Force checkout for stuck check-ins
  UPDATE public.check_ins
  SET 
    status = 'checked_out',
    check_out_time = now(),
    notes = COALESCE(notes, '') || ' - Force checkout: ' || COALESCE(force_reason, 'Forced by staff/admin')
  WHERE id = checkin_id AND status = 'checked_in'
  RETURNING * INTO result_record;
  
  IF result_record IS NULL THEN
    RAISE EXCEPTION 'Check-in not found or not in checked-in state';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'record', row_to_json(result_record),
    'message', 'Force checkout completed'
  );
END;
$$;

-- Grant execute permissions to staff and admin
GRANT EXECUTE ON FUNCTION public.approve_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_checkout TO authenticated;