-- System Diagnostic & Repair Migration (Part 2)
-- Fixes critical database issues preventing proper functionality

-- 1. Fix user_roles foreign key - should reference profiles.user_id instead of auth.users
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- 2. Ensure all security definer functions have proper search_path
CREATE OR REPLACE FUNCTION public.update_residents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
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

CREATE OR REPLACE FUNCTION public.visitor_checkin_checkout(visitor_id uuid, action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF action = 'check_in' THEN
    UPDATE public.visitors
    SET 
      check_in_status = 'Checked In',
      check_in_time = now()
    WHERE id = visitor_id;
  ELSIF action = 'check_out' THEN
    UPDATE public.visitors
    SET 
      check_in_status = 'Checked Out',
      check_out_time = now()
    WHERE id = visitor_id;
  END IF;
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

-- 3. Add indexes for better performance on frequent queries
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON public.check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_status ON public.check_ins(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_equipment_loans_user_id ON public.equipment_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_loans_status ON public.equipment_loans(status);