-- reconcile_term_invoice_payments UPDATEs student_invoices (status, amount_paid), which
-- fired sync_balance_on_invoice_activation again → infinite recursion → "stack depth limit exceeded".

CREATE OR REPLACE FUNCTION public.sync_balance_on_invoice_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('issued', 'partial', 'paid') THEN
    RETURN NEW;
  END IF;

  PERFORM public.reconcile_term_invoice_payments(NEW.student_id, NEW.term_id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_balance_on_invoice_activation() IS
  'Runs reconcile when an invoice is activated; skips nested calls (trigger depth > 1) to avoid recursion.';
