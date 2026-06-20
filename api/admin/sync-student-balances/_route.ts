import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { schoolId, studentIds } = await request.json();

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // If specific student IDs provided, sync only those students
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      let successCount = 0;
      let errorCount = 0;

      for (const studentId of studentIds) {
        try {
          // Get student details
          const { data: student, error: studentError } = await supabase
            .from('students')
            .select('student_id, current_class, boarding_type')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .single();

          if (studentError || !student) {
            errorCount++;
            continue;
          }

          // Get current term
          const { data: termData } = await supabase.rpc('resolve_current_school_term_id', {
            p_school_id: schoolId,
            p_date: new Date().toISOString().split('T')[0]
          });

          if (!termData) {
            errorCount++;
            continue;
          }

          // Get fee structure
          const { data: feeStructure } = await supabase
            .from('school_fee_structure')
            .select('tuition_amount, boarding_tuition_amount')
            .eq('school_id', schoolId)
            .eq('class_name', student.current_class)
            .single();

          if (!feeStructure) {
            errorCount++;
            continue;
          }

          const feeAmount = student.boarding_type === 'Boarding' 
            ? feeStructure.boarding_tuition_amount 
            : feeStructure.tuition_amount;

          if (!feeAmount || feeAmount <= 0) {
            errorCount++;
            continue;
          }

          // Check if invoice already exists
          const { data: existingInvoice } = await supabase
            .from('student_invoices')
            .select('invoice_id')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .eq('term_id', termData)
            .eq('is_supplementary', false)
            .neq('status', 'cancelled')
            .single();

          if (existingInvoice) {
            // Update existing invoice
            await supabase
              .from('student_invoices')
              .update({
                total_amount: feeAmount,
                balance: feeAmount - (existingInvoice.amount_paid || 0),
                updated_at: new Date().toISOString()
              })
              .eq('invoice_id', existingInvoice.invoice_id);
          } else {
            // Create new invoice
            const { data: invoiceNumber } = await supabase.rpc('get_next_invoice_number', {
              p_school_id: schoolId
            });

            await supabase
              .from('student_invoices')
              .insert({
                school_id: schoolId,
                student_id: studentId,
                term_id: termData,
                invoice_number: invoiceNumber || `INV-${Date.now()}`,
                total_amount: feeAmount,
                amount_paid: 0,
                balance: feeAmount,
                status: 'issued',
                is_supplementary: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
          }

          successCount++;
        } catch (error) {
          console.error(`Error syncing student ${studentId}:`, error);
          errorCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${successCount} students successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        successCount,
        errorCount
      });
    }

    // Original bulk sync logic for all students
    const { data, error } = await supabase.rpc('sync_all_student_balances', {
      p_school_id: schoolId
    });

    if (error) {
      console.error('Sync error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced student balances`,
      data
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}