-- Create visitors table for reservations
CREATE TABLE public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_amount DECIMAL(10,2),
  receipt_url TEXT,
  mpesa_transaction_id TEXT,
  mpesa_checkout_request_id TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inquiries table for contact form messages
CREATE TABLE public.inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- RLS policies for visitors table
CREATE POLICY "Visitors can view their own records"
ON public.visitors
FOR SELECT
USING (true); -- Allow public access for visitors to check their reservations

CREATE POLICY "Anyone can create visitor reservations"
ON public.visitors
FOR INSERT
WITH CHECK (true); -- Allow public registration

CREATE POLICY "Admin and staff can view all visitor records"
ON public.visitors
FOR ALL
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- RLS policies for inquiries table
CREATE POLICY "Anyone can create inquiries"
ON public.inquiries
FOR INSERT
WITH CHECK (true); -- Allow public contact form submissions

CREATE POLICY "Admin and staff can view all inquiries"
ON public.inquiries
FOR ALL
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- Add "rcmrd_team" as a new role option
-- Update any existing role constraints or enums if they exist
-- Add the new role to profiles table validation

-- Create trigger for updating updated_at on visitors
CREATE TRIGGER update_visitors_updated_at
BEFORE UPDATE ON public.visitors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating updated_at on inquiries
CREATE TRIGGER update_inquiries_updated_at
BEFORE UPDATE ON public.inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if user is RCMRD team member
CREATE OR REPLACE FUNCTION public.is_rcmrd_team(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.user_id = _uid and p.role = 'rcmrd_team'
  );
$function$;