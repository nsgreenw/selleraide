-- Fix: set immutable search_path on handle_updated_at trigger function.
-- Without this, the function's name resolution can be influenced by the
-- caller's session search_path, which is a security and correctness risk.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
