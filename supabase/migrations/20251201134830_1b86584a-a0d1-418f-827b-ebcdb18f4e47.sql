-- Create enum types for document requests
CREATE TYPE document_type AS ENUM ('zone_clearance', 'indigency', 'clearance');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE marital_status AS ENUM ('single', 'married', 'widowed', 'separated');

-- Create zones table for Barangay zones
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_number INTEGER NOT NULL UNIQUE,
  zone_name TEXT NOT NULL,
  zone_leader TEXT,
  leader_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default zones for Barangay Bayabas
INSERT INTO public.zones (zone_number, zone_name, zone_leader, leader_contact) VALUES
  (1, 'Zone 1 - Purok 1', 'Juan Dela Cruz', '09171234567'),
  (2, 'Zone 2 - Purok 2', 'Maria Santos', '09181234568'),
  (3, 'Zone 3 - Purok 3', 'Pedro Reyes', '09191234569'),
  (4, 'Zone 4 - Purok 4', 'Ana Garcia', '09201234570'),
  (5, 'Zone 5 - Purok 5', 'Jose Ramos', '09211234571');

-- Create document_requests table
CREATE TABLE public.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  birth_date DATE NOT NULL,
  address TEXT NOT NULL,
  zone_id UUID REFERENCES public.zones(id),
  contact TEXT NOT NULL,
  email TEXT,
  marital_status marital_status NOT NULL,
  document_type document_type NOT NULL,
  purpose TEXT NOT NULL,
  status request_status DEFAULT 'pending',
  has_zone_clearance BOOLEAN DEFAULT FALSE,
  zone_clearance_id UUID REFERENCES public.document_requests(id),
  rejection_reason TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  request_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'resident',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin roles table (separate for security)
CREATE TYPE app_role AS ENUM ('admin', 'staff', 'resident');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'resident',
  UNIQUE(user_id, role)
);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'resident');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zones (public read)
CREATE POLICY "Zones are viewable by everyone"
  ON public.zones FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify zones"
  ON public.zones FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for document_requests
CREATE POLICY "Anyone can create document requests"
  ON public.document_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view their own requests"
  ON public.document_requests FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR true);

CREATE POLICY "Admins and staff can view all requests"
  ON public.document_requests FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins and staff can update requests"
  ON public.document_requests FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Profiles are insertable by owner"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles are updatable by owner"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "User roles viewable by owner"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_document_requests_updated_at
  BEFORE UPDATE ON public.document_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();