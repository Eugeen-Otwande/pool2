-- Add quantity fields to equipment table
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS quantity_total integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_available integer DEFAULT 0;

-- Add quantity field to equipment_loans table
ALTER TABLE public.equipment_loans
ADD COLUMN IF NOT EXISTS quantity_borrowed integer DEFAULT 1;

-- Update equipment_loans RLS policies
DROP POLICY IF EXISTS "Users can view their own loans" ON public.equipment_loans;
DROP POLICY IF EXISTS "Basic loan access" ON public.equipment_loans;

CREATE POLICY "Users can view their own loans"
ON public.equipment_loans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin and staff can view all loans"
ON public.equipment_loans
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

CREATE POLICY "Admin and staff can manage loans"
ON public.equipment_loans
FOR ALL
TO authenticated
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- Update equipment RLS policies
DROP POLICY IF EXISTS "Everyone can view available equipment" ON public.equipment;
DROP POLICY IF EXISTS "Basic equipment view" ON public.equipment;

CREATE POLICY "Everyone can view equipment"
ON public.equipment
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin and staff can manage equipment"
ON public.equipment
FOR ALL
TO authenticated
USING (is_admin(auth.uid()) OR is_staff(auth.uid()));

-- Create function to update equipment quantity when issuing/returning
CREATE OR REPLACE FUNCTION public.update_equipment_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Decrease available quantity when equipment is issued
    UPDATE public.equipment
    SET quantity_available = quantity_available - NEW.quantity_borrowed
    WHERE id = NEW.equipment_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'returned' THEN
    -- Increase available quantity when equipment is returned
    UPDATE public.equipment
    SET quantity_available = quantity_available + NEW.quantity_borrowed
    WHERE id = NEW.equipment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic quantity updates
DROP TRIGGER IF EXISTS equipment_quantity_trigger ON public.equipment_loans;
CREATE TRIGGER equipment_quantity_trigger
AFTER INSERT OR UPDATE ON public.equipment_loans
FOR EACH ROW
EXECUTE FUNCTION public.update_equipment_quantity();