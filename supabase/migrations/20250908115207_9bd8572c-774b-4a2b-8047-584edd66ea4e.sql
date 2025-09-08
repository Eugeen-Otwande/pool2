-- Create user profiles table with role-based access
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('system_admin', 'pool_admin', 'staff', 'student', 'member', 'resident', 'visitor')),
  phone TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  subscription_type TEXT,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('system_admin', 'pool_admin')
  )
);

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('system_admin', 'pool_admin')
  )
);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('system_admin', 'pool_admin')
  )
);

-- Create pool schedules table
CREATE TABLE public.pool_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL, -- 0=Sunday, 1=Monday, etc.
  allowed_roles TEXT[] NOT NULL,
  capacity_limit INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for schedules
ALTER TABLE public.pool_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for schedules
CREATE POLICY "Everyone can view active schedules" 
ON public.pool_schedules 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage schedules" 
ON public.pool_schedules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('system_admin', 'pool_admin')
  )
);

-- Create check-ins table for access control
CREATE TABLE public.check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  schedule_id UUID REFERENCES public.pool_schedules(id),
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'checked_out', 'overtime')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for check-ins
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Create policies for check-ins
CREATE POLICY "Users can view their own check-ins" 
ON public.check_ins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check-ins" 
ON public.check_ins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins" 
ON public.check_ins 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all check-ins" 
ON public.check_ins 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('system_admin', 'pool_admin', 'staff')
  )
);

CREATE POLICY "Staff can manage all check-ins" 
ON public.check_ins 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('system_admin', 'pool_admin', 'staff')
  )
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  barcode TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'maintenance', 'lost', 'damaged')),
  replacement_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for equipment
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment
CREATE POLICY "Everyone can view available equipment" 
ON public.equipment 
FOR SELECT 
USING (status = 'available');

CREATE POLICY "Staff can manage equipment" 
ON public.equipment 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('system_admin', 'pool_admin', 'staff')
  )
);

-- Create equipment loans table
CREATE TABLE public.equipment_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  loaned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_back_at TIMESTAMP WITH TIME ZONE NOT NULL,
  returned_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue', 'lost', 'damaged')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for equipment loans
ALTER TABLE public.equipment_loans ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment loans
CREATE POLICY "Users can view their own loans" 
ON public.equipment_loans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all loans" 
ON public.equipment_loans 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('system_admin', 'pool_admin', 'staff')
  )
);

CREATE POLICY "Staff can manage loans" 
ON public.equipment_loans 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('system_admin', 'pool_admin', 'staff')
  )
);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.pool_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pool schedules
INSERT INTO public.pool_schedules (title, description, start_time, end_time, days_of_week, allowed_roles, capacity_limit) VALUES
('Early Morning Lap Swimming', 'Reserved for serious swimmers', '06:00', '08:00', ARRAY[1,2,3,4,5], ARRAY['member', 'resident', 'staff'], 20),
('Student Recreation', 'Open swimming for students', '12:00', '16:00', ARRAY[1,2,3,4,5], ARRAY['student'], 50),
('Evening Open Swimming', 'Open to all members', '17:00', '21:00', ARRAY[1,2,3,4,5,6,7], ARRAY['student', 'member', 'resident', 'visitor'], 75),
('Weekend Family Time', 'Family-friendly swimming', '10:00', '18:00', ARRAY[6,7], ARRAY['member', 'resident', 'visitor'], 100);

-- Insert sample equipment
INSERT INTO public.equipment (name, category, description, barcode, replacement_cost) VALUES
('Pool Noodle - Blue', 'Swimming Aid', 'Flexible foam swimming aid', 'PN001', 15.99),
('Kickboard - Standard', 'Swimming Aid', 'Foam kickboard for training', 'KB001', 25.50),
('Goggles - Adult', 'Swimming Gear', 'Anti-fog swimming goggles', 'GG001', 35.00),
('Life Jacket - Medium', 'Safety Equipment', 'Coast Guard approved life jacket', 'LJ001', 89.99),
('Pool Vacuum', 'Maintenance', 'Automatic pool cleaning vacuum', 'PV001', 299.99);