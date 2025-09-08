-- Enable RLS on the pre_existing_accounts table
ALTER TABLE public.pre_existing_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pre_existing_accounts table
-- Only allow admin users to view and manage pre-existing accounts
CREATE POLICY "Only admins can view pre-existing accounts" 
ON public.pre_existing_accounts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);