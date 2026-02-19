-- ============================================================================
-- FIX FINANCE CONSISTENCY
-- Run this in Supabase SQL Editor. No rows returned is normal.
-- ============================================================================

-- 1. Ensure student_balances.balance is always total_fees - total_paid (trigger + one-time fix)
CREATE OR REPLACE FUNCTION public.auto_calculate_student_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.balance := COALESCE(NEW.total_fees, 0) - COALESCE(NEW.total_paid, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_calculate_balance ON public.student_balances;
CREATE TRIGGER trigger_auto_calculate_balance
  BEFORE INSERT OR UPDATE ON public.student_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_student_balance();

UPDATE public.student_balances
SET balance = COALESCE(total_fees, 0) - COALESCE(total_paid, 0)
WHERE balance IS DISTINCT FROM (COALESCE(total_fees, 0) - COALESCE(total_paid, 0));


-- 2. get_fee_structure_status: work from fee structure when classes table is empty or out of sync
CREATE OR REPLACE FUNCTION public.get_fee_structure_status(p_school_id uuid)
RETURNS json
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_total_from_classes INT;
  v_total_from_fees INT;
  v_total_classes INT;
  v_configured INT;
  v_pending INT;
BEGIN
  SELECT COUNT(*) INTO v_total_from_classes
  FROM public.classes
  WHERE school_id = p_school_id;

  SELECT COUNT(DISTINCT sfs.class_name) INTO v_total_from_fees
  FROM public.school_fee_structure sfs
  WHERE sfs.school_id = p_school_id AND sfs.class_name <> 'ADMISSION';

  v_total_classes := GREATEST(COALESCE(v_total_from_classes, 0), COALESCE(v_total_from_fees, 0));

  SELECT COUNT(DISTINCT sfs.class_name) INTO v_configured
  FROM public.school_fee_structure sfs
  WHERE sfs.school_id = p_school_id
    AND sfs.class_name <> 'ADMISSION'
    AND (COALESCE(sfs.tuition_amount, 0) > 0 OR COALESCE(sfs.boarding_tuition_amount, 0) > 0);

  v_pending := v_total_classes - v_configured;

  IF v_total_classes = 0 THEN
    v_result := json_build_object(
      'status', 'not_setup',
      'message', 'Fee structure not set up',
      'description', 'No fee structure has been created for your school yet.',
      'action', 'Go to Financial Settings to set up your fee structure',
      'total_classes', 0,
      'configured_classes', 0,
      'pending_classes', 0
    );
  ELSIF v_configured = 0 THEN
    v_result := json_build_object(
      'status', 'not_configured',
      'message', 'Fee structure created but not configured',
      'description', 'Fee structure exists but all amounts are set to 0. Please set proper fee amounts.',
      'action', 'Go to Financial Settings to set fee amounts for each class',
      'total_classes', v_total_classes,
      'configured_classes', 0,
      'pending_classes', v_total_classes
    );
  ELSIF v_pending = 0 THEN
    v_result := json_build_object(
      'status', 'fully_configured',
      'message', 'Fee structure fully configured',
      'description', 'All classes have proper fee amounts set. Ready for student registration.',
      'action', 'Fee structure is complete',
      'total_classes', v_total_classes,
      'configured_classes', v_configured,
      'pending_classes', 0
    );
  ELSE
    v_result := json_build_object(
      'status', 'partially_configured',
      'message', 'Fee structure partially configured',
      'description', v_configured || ' out of ' || v_total_classes || ' classes have fee amounts set.',
      'action', 'Go to Financial Settings to complete fee setup for remaining classes',
      'total_classes', v_total_classes,
      'configured_classes', v_configured,
      'pending_classes', v_pending
    );
  END IF;

  RETURN v_result;
END;
$$;


-- 3. student_invoices: keep balance in sync (if column is not generated)
-- Only updates rows where balance is out of sync; safe if balance is a generated column (no-op)
DO $$
BEGIN
  UPDATE public.student_invoices
  SET balance = total_amount - amount_paid
  WHERE balance IS DISTINCT FROM (total_amount - amount_paid);
EXCEPTION
  WHEN OTHERS THEN
    NULL;  -- ignore if balance is generated or read-only
END $$;
