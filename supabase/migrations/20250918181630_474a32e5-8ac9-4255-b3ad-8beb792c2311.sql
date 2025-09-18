-- Drop existing visitors table to recreate with correct structure
DROP TABLE IF EXISTS public.visitors CASCADE;

-- Create visitors table with correct structure matching requirements
CREATE TABLE public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_visit DATE NOT NULL,
  time_of_visit TIME NOT NULL,
  num_guests INTEGER NOT NULL DEFAULT 1,
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed')),
  check_in_status TEXT NOT NULL DEFAULT 'Not Checked In' CHECK (check_in_status IN ('Not Checked In', 'Checked In', 'Checked Out')),
  receipt_url TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create residents table  
CREATE TABLE IF NOT EXISTS public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Resident' CHECK (role IN ('Resident', 'Staff', 'Student', 'RCMRD Team')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pool_visits table
CREATE TABLE IF NOT EXISTS public.pool_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  activity TEXT NOT NULL CHECK (activity IN ('Swim', 'Training', 'Event')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.pool_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can create visitor reservations" ON public.visitors;
DROP POLICY IF EXISTS "Admin and staff can view all visitors" ON public.visitors;
DROP POLICY IF EXISTS "Admin and staff can update visitors" ON public.visitors;

-- RLS Policies for visitors
CREATE POLICY "Anyone can create visitor reservations" ON public.visitors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin and staff can view all visitors" ON public.visitors  
  FOR SELECT USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Admin and staff can update visitors" ON public.visitors
  FOR UPDATE USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- RLS Policies for payments
CREATE POLICY "Admin and staff can manage payments" ON public.payments
  FOR ALL USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- RLS Policies for residents
CREATE POLICY "Residents can view their own data" ON public.residents
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admin and staff can view all residents" ON public.residents
  FOR SELECT USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Admin can manage residents" ON public.residents
  FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for pool_visits  
CREATE POLICY "Residents can view their own visits" ON public.pool_visits
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.residents 
    WHERE residents.id = pool_visits.resident_id 
    AND residents.id::text = auth.uid()::text
  ));

CREATE POLICY "Admin and staff can view all visits" ON public.pool_visits
  FOR SELECT USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Admin and staff can manage visits" ON public.pool_visits
  FOR ALL USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- Function to update visitor payment status when payment is marked as paid
CREATE OR REPLACE FUNCTION public.update_visitor_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment status becomes 'Paid', update visitor and generate receipt URL
  IF NEW.payment_status = 'Paid' AND OLD.payment_status != 'Paid' THEN
    UPDATE public.visitors
    SET 
      payment_status = 'Paid',
      receipt_url = 'https://receipts.rcmrd.org/receipt/' || NEW.id::text
    WHERE id = NEW.visitor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for payment status updates
DROP TRIGGER IF EXISTS payment_status_trigger ON public.payments;
CREATE TRIGGER payment_status_trigger
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_visitor_payment_status();

-- Function for visitor check-in/check-out
CREATE OR REPLACE FUNCTION public.visitor_checkin_checkout(
  visitor_id UUID,
  action TEXT
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;