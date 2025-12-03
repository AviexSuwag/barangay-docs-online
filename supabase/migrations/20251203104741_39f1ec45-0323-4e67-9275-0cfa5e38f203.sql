-- Add valid_id_file_url column for zone clearance requests
ALTER TABLE public.document_requests 
ADD COLUMN IF NOT EXISTS valid_id_file_url text;