-- Add reference_number and zone_clearance_file_url columns to document_requests
ALTER TABLE public.document_requests 
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS zone_clearance_file_url text;

-- Create storage bucket for zone clearances
INSERT INTO storage.buckets (id, name, public) 
VALUES ('zone-clearances', 'zone-clearances', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy for users to upload their own zone clearance files
CREATE POLICY "Users can upload zone clearance files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'zone-clearances' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to view their own zone clearance files
CREATE POLICY "Users can view their own zone clearance files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'zone-clearances' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for admins/staff to view all zone clearance files
CREATE POLICY "Admins and staff can view all zone clearance files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'zone-clearances' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

-- Function to generate reference number
CREATE OR REPLACE FUNCTION public.generate_reference_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ref_number text;
  ref_exists boolean;
BEGIN
  LOOP
    -- Generate reference number: BRGY-YYYYMMDD-XXXX (XXXX is random 4 digits)
    new_ref_number := 'BRGY-' || 
                      TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                      LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    -- Check if this reference number already exists
    SELECT EXISTS(
      SELECT 1 FROM public.document_requests 
      WHERE reference_number = new_ref_number
    ) INTO ref_exists;
    
    -- If it doesn't exist, we can use it
    EXIT WHEN NOT ref_exists;
  END LOOP;
  
  RETURN new_ref_number;
END;
$$;

-- Trigger to automatically set reference number when status changes to approved
CREATE OR REPLACE FUNCTION public.set_reference_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status changed to approved and no reference number exists
  IF NEW.status = 'approved' AND NEW.reference_number IS NULL THEN
    NEW.reference_number := public.generate_reference_number();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on document_requests
DROP TRIGGER IF EXISTS trigger_set_reference_number ON public.document_requests;
CREATE TRIGGER trigger_set_reference_number
BEFORE UPDATE ON public.document_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_reference_number();