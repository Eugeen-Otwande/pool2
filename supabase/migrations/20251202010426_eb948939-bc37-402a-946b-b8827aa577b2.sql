
-- =====================================================
-- SYSTEM REPAIR & ENHANCEMENT MIGRATION (Fixed)
-- Fixes security, data integrity, and validation logic
-- =====================================================

-- 1. DROP AND RECREATE toggle_checkin_for_user WITH PROPER SIGNATURE
-- =====================================================

DROP FUNCTION IF EXISTS public.toggle_checkin_for_user(uuid);
DROP FUNCTION IF EXISTS public.toggle_checkin_for_user(uuid, uuid);

CREATE FUNCTION public.toggle_checkin_for_user(
  _user_id uuid,
  _schedule_id uuid DEFAULT NULL
)
RETURNS TABLE(
  check_in_id uuid, 
  user_id uuid, 
  status text, 
  check_in_time timestamp with time zone, 
  check_out_time timestamp with time zone, 
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  active_checkin_id uuid;
  validation_result json;
  result_status text;
  result_check_in_time timestamptz;
  result_check_out_time timestamptz;
  result_id uuid;
BEGIN
  -- Check for existing active check-in
  SELECT ci.id INTO active_checkin_id
  FROM public.check_ins ci
  WHERE ci.user_id = _user_id 
    AND ci.status = 'checked_in' 
    AND ci.check_out_time IS NULL
  ORDER BY ci.check_in_time DESC
  LIMIT 1;

  IF active_checkin_id IS NULL THEN
    -- CHECK-IN: Validate before allowing
    SELECT public.validate_checkin(_user_id, _schedule_id) INTO validation_result;
    
    IF NOT (validation_result->>'valid')::boolean THEN
      -- Return validation error
      check_in_id := null;
      user_id := _user_id;
      status := 'error';
      check_in_time := null;
      check_out_time := null;
      message := validation_result->>'message';
      RETURN NEXT;
      RETURN;
    END IF;
    
    -- Validation passed, create check-in
    BEGIN
      INSERT INTO public.check_ins (user_id, schedule_id, status, check_in_time)
      VALUES (_user_id, _schedule_id, 'checked_in', now())
      RETURNING id, status, check_in_time, check_out_time
      INTO result_id, result_status, result_check_in_time, result_check_out_time;
      
      check_in_id := result_id;
      user_id := _user_id;
      status := result_status;
      check_in_time := result_check_in_time;
      check_out_time := result_check_out_time;
      message := 'User successfully checked in';
      
    EXCEPTION WHEN OTHERS THEN
      check_in_id := null;
      user_id := _user_id;
      status := 'error';
      check_in_time := null;
      check_out_time := null;
      message := 'Database error: ' || SQLERRM;
    END;
  ELSE
    -- CHECK-OUT: Update existing check-in
    BEGIN
      UPDATE public.check_ins
      SET status = 'checked_out',
          check_out_time = now()
      WHERE id = active_checkin_id
      RETURNING id, status, check_in_time, check_out_time
      INTO result_id, result_status, result_check_in_time, result_check_out_time;
      
      check_in_id := result_id;
      user_id := _user_id;
      status := result_status;
      check_in_time := result_check_in_time;
      check_out_time := result_check_out_time;
      message := 'User successfully checked out';
      
    EXCEPTION WHEN OTHERS THEN
      check_in_id := active_checkin_id;
      user_id := _user_id;
      status := 'error';
      check_in_time := null;
      check_out_time := null;
      message := 'Database error during checkout: ' || SQLERRM;
    END;
  END IF;

  RETURN NEXT;
END;
$function$;

-- 2. CREATE VALIDATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_checkin(
  p_user_id uuid,
  p_schedule_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_role text;
  v_user_status text;
  v_schedule record;
  v_current_capacity integer;
  v_current_day integer;
  v_current_time time;
  v_existing_checkin_id uuid;
BEGIN
  -- Get user profile
  SELECT role, status INTO v_user_role, v_user_status
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'User profile not found'
    );
  END IF;
  
  -- Check user status
  IF v_user_status != 'active' THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Account must be active to check in. Current status: ' || v_user_status
    );
  END IF;
  
  -- Check for existing active check-in
  SELECT id INTO v_existing_checkin_id
  FROM public.check_ins
  WHERE user_id = p_user_id 
    AND status = 'checked_in'
    AND check_out_time IS NULL
  LIMIT 1;
  
  IF v_existing_checkin_id IS NOT NULL THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'User is already checked in',
      'existing_checkin_id', v_existing_checkin_id
    );
  END IF;
  
  -- If schedule_id provided, validate schedule access
  IF p_schedule_id IS NOT NULL THEN
    SELECT * INTO v_schedule
    FROM public.pool_schedules
    WHERE id = p_schedule_id AND is_active = true;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'valid', false,
        'message', 'Schedule not found or inactive'
      );
    END IF;
    
    -- Check if user role is allowed
    IF NOT (v_user_role = ANY(v_schedule.allowed_roles)) THEN
      RETURN json_build_object(
        'valid', false,
        'message', 'Your role (' || v_user_role || ') is not allowed during this schedule'
      );
    END IF;
    
    -- Check day of week
    v_current_day := EXTRACT(ISODOW FROM CURRENT_DATE);
    IF NOT (v_current_day = ANY(v_schedule.days_of_week)) THEN
      RETURN json_build_object(
        'valid', false,
        'message', 'Pool is not open today according to this schedule'
      );
    END IF;
    
    -- Check time
    v_current_time := CURRENT_TIME;
    IF v_current_time < v_schedule.start_time OR v_current_time > v_schedule.end_time THEN
      RETURN json_build_object(
        'valid', false,
        'message', 'Check-in is outside of scheduled hours (' || 
                   v_schedule.start_time || ' - ' || v_schedule.end_time || ')'
      );
    END IF;
    
    -- Check capacity
    SELECT COUNT(*) INTO v_current_capacity
    FROM public.check_ins
    WHERE status = 'checked_in' 
      AND check_out_time IS NULL;
    
    IF v_current_capacity >= v_schedule.capacity_limit THEN
      RETURN json_build_object(
        'valid', false,
        'message', 'Pool is at maximum capacity (' || v_schedule.capacity_limit || ')'
      );
    END IF;
  END IF;
  
  -- All validations passed
  RETURN json_build_object(
    'valid', true,
    'message', 'Check-in validation passed',
    'user_role', v_user_role
  );
END;
$function$;

-- 3. FIX SECURITY: Add search_path to trigger functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_profile_checkin_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'checked_in' AND (OLD IS NULL OR OLD.status != 'checked_in') THEN
    UPDATE public.profiles
    SET 
      check_in_status = 'Checked In',
      check_in_at = NEW.check_in_time,
      check_out_at = NULL
    WHERE user_id = NEW.user_id;
  END IF;
  
  IF NEW.status = 'checked_out' AND OLD.status = 'checked_in' THEN
    UPDATE public.profiles
    SET 
      check_in_status = 'Checked Out',
      check_out_at = NEW.check_out_time
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_message_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.messages
  SET updated_at = now()
  WHERE id = NEW.message_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.distribute_role_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.recipient_id IS NULL AND NEW.recipient_role IS NOT NULL THEN
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
      AND p.user_id != NEW.sender_id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_visitor_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.payment_status = 'Paid' AND OLD.payment_status != 'Paid' THEN
    UPDATE public.visitors
    SET 
      payment_status = 'Paid',
      receipt_url = 'https://receipts.rcmrd.org/receipt/' || NEW.id::text
    WHERE id = NEW.visitor_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_checkin_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'checked_in' AND (OLD IS NULL OR OLD.status != 'checked_in') THEN
    NEW.check_in_time = now();
    NEW.check_out_time = NULL;
  END IF;
  
  IF NEW.status = 'checked_out' AND (OLD IS NULL OR OLD.status != 'checked_out') THEN
    NEW.check_out_time = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_equipment_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.equipment
    SET quantity_available = quantity_available - NEW.quantity_borrowed
    WHERE id = NEW.equipment_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'returned' THEN
    UPDATE public.equipment
    SET quantity_available = quantity_available + NEW.quantity_borrowed
    WHERE id = NEW.equipment_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_link_resident_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  existing_user_id uuid;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    NEW.user_id := existing_user_id;
    
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, status)
    VALUES (
      existing_user_id,
      NEW.email,
      split_part(NEW.full_name, ' ', 1),
      substring(NEW.full_name from position(' ' in NEW.full_name) + 1),
      'resident',
      'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      role = 'resident',
      status = 'active',
      updated_at = now();
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_user_id, 'resident'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. CLEANUP FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_checkins()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE public.check_ins
  SET 
    status = 'checked_out',
    check_out_time = check_in_time + INTERVAL '24 hours',
    notes = COALESCE(notes || ' | ', '') || 'Auto-checked-out after 24 hours'
  WHERE status = 'checked_in' 
    AND check_in_time < NOW() - INTERVAL '24 hours'
    AND check_out_time IS NULL;
    
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$function$;

-- 5. ADD DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION public.validate_checkin IS 'Validates check-in based on schedule, capacity, role permissions, and user status';
COMMENT ON FUNCTION public.toggle_checkin_for_user IS 'Enhanced check-in/out with validation including schedule access and capacity limits';
COMMENT ON FUNCTION public.cleanup_old_checkins IS 'Auto-checks-out users who have been checked in for more than 24 hours';
