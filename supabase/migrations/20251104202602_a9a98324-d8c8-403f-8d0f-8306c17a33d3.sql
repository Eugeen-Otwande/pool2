-- Update auto_create_visitor_payment function to calculate amount based on number of guests
CREATE OR REPLACE FUNCTION public.auto_create_visitor_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if visitor was just approved or checked in
  IF (NEW.check_in_status = 'Checked In' OR NEW.payment_status = 'Paid') 
     AND (OLD.check_in_status != 'Checked In' OR OLD.payment_status != 'Paid') THEN
    
    -- Check if payment already exists for this visitor today
    IF NOT EXISTS (
      SELECT 1 
      FROM public.payments 
      WHERE visitor_id = NEW.id 
      AND DATE(created_at) = CURRENT_DATE
    ) THEN
      -- Create payment record with amount = num_guests * 400
      INSERT INTO public.payments (visitor_id, amount, payment_status, created_at)
      VALUES (NEW.id, NEW.num_guests * 400.00, 'Pending', NOW());
      
      -- Update visitor payment status if not already set
      IF NEW.payment_status != 'Paid' THEN
        NEW.payment_status := 'Pending';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;