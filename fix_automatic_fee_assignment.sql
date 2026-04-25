-- Fix automatic fee assignment for new students
-- This script updates the auto_initialize_student_balance trigger to work with the current schema
-- and adds a trigger to handle boarding type changes

-- First, let's create a function that properly assigns fees based on current_class and boarding_type
CREATE OR REPLACE FUNCTION public.auto_initialize_student_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term_id UUID;
  v_year INT;
  v_term_num INT;
  v_class_fees NUMERIC(12, 2) := 0;
  v_today DATE := CURRENT_DATE;
  v_inv_num TEXT;
BEGIN
  -- Get current term for this school
  v_term_id := public.resolve_current_school_term_id(NEW.school_id, v_today);

  IF v_term_id IS NOT NULL THEN
    SELECT st.year, st.term
    INTO v_year, v_term_num
    FROM public.school_terms st
    WHERE st.id = v_term_id;
  END IF;

  -- If no current term found, skip fee assignment
  IF v_term_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get fee amount based on class and boarding type from school_fee_structure
  IF NEW.current_class IS NOT NULL THEN
    IF NEW.boarding_type = 'Boarding' THEN
      -- Get boarding fee
      SELECT sfs.boarding_tuition_amount INTO v_class_fees
      FROM public.school_fee_structure sfs
      WHERE sfs.school_id = NEW.school_id
        AND sfs.class_name = NEW.current_class;
    ELSE
      -- Get day scholar fee (regular tuition)
      SELECT sfs.tuition_amount INTO v_class_fees
      FROM public.school_fee_structure sfs
      WHERE sfs.school_id = NEW.school_id
        AND sfs.class_name = NEW.current_class;
    END IF;
  END IF;

  -- Fallback to expected_fee_amount if no fee structure found
  v_class_fees := COALESCE(v_class_fees, NEW.expected_fee_amount, 0);

  -- Create invoice if fees > 0
  IF v_class_fees > 0 THEN
    -- Check if invoice already exists for this student and term
    IF NOT EXISTS (
      SELECT 1
      FROM public.student_invoices si
      WHERE si.school_id = NEW.school_id
        AND si.student_id = NEW.student_id
        AND si.term_id = v_term_id
        AND si.is_supplementary = false
        AND si.status != 'cancelled'
    ) THEN
      -- Get next invoice number
      BEGIN
        SELECT public.get_next_invoice_number(NEW.school_id) INTO v_inv_num;
      EXCEPTION WHEN OTHERS THEN
        v_inv_num := 'INV-' || EXTRACT(YEAR FROM v_today) || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
      END;

      -- Create the invoice
      INSERT INTO public.student_invoices (
        school_id,
        student_id,
        term_id,
        invoice_number,
        total_amount,
        amount_paid,
        balance,
        status,
        is_supplementary,
        created_by,
        updated_at
      )
      VALUES (
        NEW.school_id,
        NEW.student_id,
        v_term_id,
        v_inv_num,
        v_class_fees,
        0,
        v_class_fees,
        'issued',
        false,
        NULL,
        NOW()
      );
    END IF;
  ELSE
    -- Create zero balance entry if no fees
    INSERT INTO public.student_balances (
      student_id,
      school_id,
      term_id,
      year,
      term,
      total_fees,
      total_paid,
      balance,
      updated_at
    )
    VALUES (
      NEW.student_id,
      NEW.school_id,
      v_term_id,
      COALESCE(v_year, EXTRACT(YEAR FROM v_today)::INT),
      COALESCE(v_term_num, 1),
      0,
      0,
      0,
      NOW()
    )
    ON CONFLICT (student_id, term_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_initialize_student_balance() IS
  'Automatically creates invoices/balances for new students based on their class and boarding type from school_fee_structure';

-- Function to handle boarding type changes and update fees accordingly
CREATE OR REPLACE FUNCTION public.update_student_fees_on_boarding_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term_id UUID;
  v_old_fees NUMERIC(12, 2) := 0;
  v_new_fees NUMERIC(12, 2) := 0;
  v_today DATE := CURRENT_DATE;
  v_invoice_id UUID;
BEGIN
  -- Only proceed if boarding_type or current_class changed
  IF (OLD.boarding_type = NEW.boarding_type AND OLD.current_class = NEW.current_class) THEN
    RETURN NEW;
  END IF;

  -- Get current term for this school
  v_term_id := public.resolve_current_school_term_id(NEW.school_id, v_today);
  
  IF v_term_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get old fee amount
  IF OLD.current_class IS NOT NULL THEN
    IF OLD.boarding_type = 'Boarding' THEN
      SELECT sfs.boarding_tuition_amount INTO v_old_fees
      FROM public.school_fee_structure sfs
      WHERE sfs.school_id = OLD.school_id AND sfs.class_name = OLD.current_class;
    ELSE
      SELECT sfs.tuition_amount INTO v_old_fees
      FROM public.school_fee_structure sfs
      WHERE sfs.school_id = OLD.school_id AND sfs.class_name = OLD.current_class;
    END IF;
  END IF;

  -- Get new fee amount
  IF NEW.current_class IS NOT NULL THEN
    IF NEW.boarding_type = 'Boarding' THEN
      SELECT sfs.boarding_tuition_amount INTO v_new_fees
      FROM public.school_fee_structure sfs
      WHERE sfs.school_id = NEW.school_id AND sfs.class_name = NEW.current_class;
    ELSE
      SELECT sfs.tuition_amount INTO v_new_fees
      FROM public.school_fee_structure sfs
      WHERE sfs.school_id = NEW.school_id AND sfs.class_name = NEW.current_class;
    END IF;
  END IF;

  v_old_fees := COALESCE(v_old_fees, 0);
  v_new_fees := COALESCE(v_new_fees, 0);

  -- Update existing invoice for current term if fees changed
  IF v_old_fees != v_new_fees THEN
    SELECT si.invoice_id INTO v_invoice_id
    FROM public.student_invoices si
    WHERE si.school_id = NEW.school_id
      AND si.student_id = NEW.student_id
      AND si.term_id = v_term_id
      AND si.is_supplementary = false
      AND si.status != 'cancelled'
    LIMIT 1;

    IF v_invoice_id IS NOT NULL THEN
      -- Update the existing invoice
      UPDATE public.student_invoices
      SET 
        total_amount = v_new_fees,
        balance = v_new_fees - amount_paid,
        updated_at = NOW()
      WHERE invoice_id = v_invoice_id;
      
      RAISE NOTICE 'Updated student % fees from % to % due to boarding type/class change', 
        NEW.student_id, v_old_fees, v_new_fees;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_student_fees_on_boarding_change() IS
  'Updates student fees when boarding type or class changes';

-- Ensure the triggers are attached to the students table
DROP TRIGGER IF EXISTS trigger_auto_initialize_student_balance ON public.students;
CREATE TRIGGER trigger_auto_initialize_student_balance
  AFTER INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_initialize_student_balance();

DROP TRIGGER IF EXISTS trigger_update_student_fees_on_change ON public.students;
CREATE TRIGGER trigger_update_student_fees_on_change
  AFTER UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_fees_on_boarding_change();

COMMENT ON TRIGGER trigger_auto_initialize_student_balance ON public.students IS
  'Automatically assigns fees to new students based on their class and boarding type';

COMMENT ON TRIGGER trigger_update_student_fees_on_change ON public.students IS
  'Updates student fees when boarding type or class changes';

-- Now let's fix the existing imported students who don't have fees assigned
-- This will create invoices for all students who don't have any invoices but should have fees

DO $$
DECLARE
  student_record RECORD;
  v_term_id UUID;
  v_class_fees NUMERIC(12, 2) := 0;
  v_inv_num TEXT;
  v_today DATE := CURRENT_DATE;
  students_fixed INT := 0;
BEGIN
  -- Loop through all students who don't have invoices
  FOR student_record IN
    SELECT DISTINCT s.student_id, s.school_id, s.current_class, s.boarding_type, s.expected_fee_amount
    FROM public.students s
    WHERE s.status = 'active'
      AND NOT EXISTS (
        SELECT 1 
        FROM public.student_invoices si 
        WHERE si.student_id = s.student_id 
          AND si.is_supplementary = false
          AND si.status != 'cancelled'
      )
  LOOP
    -- Get current term for this school
    v_term_id := public.resolve_current_school_term_id(student_record.school_id, v_today);
    
    IF v_term_id IS NOT NULL THEN
      -- Get fee amount based on class and boarding type
      v_class_fees := 0;
      
      IF student_record.current_class IS NOT NULL THEN
        IF student_record.boarding_type = 'Boarding' THEN
          -- Get boarding fee
          SELECT sfs.boarding_tuition_amount INTO v_class_fees
          FROM public.school_fee_structure sfs
          WHERE sfs.school_id = student_record.school_id
            AND sfs.class_name = student_record.current_class;
        ELSE
          -- Get day scholar fee
          SELECT sfs.tuition_amount INTO v_class_fees
          FROM public.school_fee_structure sfs
          WHERE sfs.school_id = student_record.school_id
            AND sfs.class_name = student_record.current_class;
        END IF;
      END IF;

      -- Fallback to expected_fee_amount
      v_class_fees := COALESCE(v_class_fees, student_record.expected_fee_amount, 0);

      -- Create invoice if fees > 0
      IF v_class_fees > 0 THEN
        -- Get next invoice number
        BEGIN
          SELECT public.get_next_invoice_number(student_record.school_id) INTO v_inv_num;
        EXCEPTION WHEN OTHERS THEN
          v_inv_num := 'INV-' || EXTRACT(YEAR FROM v_today) || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
        END;

        -- Create the invoice
        INSERT INTO public.student_invoices (
          school_id,
          student_id,
          term_id,
          invoice_number,
          total_amount,
          amount_paid,
          balance,
          status,
          is_supplementary,
          created_by,
          updated_at
        )
        VALUES (
          student_record.school_id,
          student_record.student_id,
          v_term_id,
          v_inv_num,
          v_class_fees,
          0,
          v_class_fees,
          'issued',
          false,
          NULL,
          NOW()
        );
        
        students_fixed := students_fixed + 1;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Fixed fee assignment for % students', students_fixed;
END;
$$;