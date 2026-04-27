-- FIX 2: Fix function search_path for sync_referral_use_count
-- Set search_path to prevent role mutable security issue

DROP FUNCTION IF EXISTS public.sync_referral_use_count() CASCADE;

CREATE FUNCTION public.sync_referral_use_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referral_codes
  SET use_count = (
    SELECT COUNT(*)
    FROM public.affiliate_clicks
    WHERE referral_code_id = referral_codes.id
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER sync_referral_use_count_trigger
AFTER INSERT OR DELETE ON public.affiliate_clicks
FOR EACH ROW
EXECUTE FUNCTION public.sync_referral_use_count();
