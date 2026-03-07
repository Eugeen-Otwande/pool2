
-- Allow anonymous users to insert bookings
CREATE POLICY "Anyone can book a swim session"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
