import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await request.json();

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // Get fee structure for all classes
    const { data: feeStructure, error: feeError } = await supabase
      .from('school_fee_structure')
      .select('*')
      .eq('school_id', schoolId);

    if (feeError) {
      return NextResponse.json({ error: feeError.message }, { status: 500 });
    }

    if (!feeStructure || feeStructure.length === 0) {
      return NextResponse.json({ 
        message: 'No fee structure found. Please set up fees first.',
        updated: 0 
      }, { status: 200 });
    }

    // Get all active students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, current_class, expected_fee_amount, class_id')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ 
        message: 'No students found',
        updated: 0 
      }, { status: 200 });
    }

    // Get current term
    const { data: currentTerm } = await supabase
      .from('school_terms')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: false })
      .limit(1)
      .single();

    const termId = currentTerm?.term_id;

    // Create a map of class to tuition
    const feeMap = new Map();
    feeStructure.forEach(fee => {
      feeMap.set(fee.class_name, fee.tuition_amount || 0);
    });

    let updatedCount = 0;
    let balancesCreated = 0;

    // Update each student
    for (const student of students) {
      const tuitionAmount = feeMap.get(student.current_class) || 0;
      
      // Update expected_fee_amount in students table
      if (tuitionAmount > 0 && student.expected_fee_amount !== tuitionAmount) {
        const { error: updateError } = await supabase
          .from('students')
          .update({ expected_fee_amount: tuitionAmount })
          .eq('student_id', student.student_id);

        if (!updateError) {
          updatedCount++;
        }
      }

      // Update or create balance record for current term
      if (termId && student.class_id) {
        // Get total paid for this student in this term
        const { data: payments } = await supabase
          .from('student_fees')
          .select('amount_paid')
          .eq('student_id', student.student_id)
          .eq('term_id', termId);

        const totalPaid = payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
        const balance = tuitionAmount - totalPaid;

        // Check if balance record exists
        const { data: existingBalance } = await supabase
          .from('student_balances')
          .select('balance_id')
          .eq('student_id', student.student_id)
          .eq('term_id', termId)
          .single();

        if (existingBalance) {
          // Update existing balance
          await supabase
            .from('student_balances')
            .update({
              total_fees: tuitionAmount,
              total_paid: totalPaid,
              balance: balance,
              last_payment_date: payments && payments.length > 0 ? new Date().toISOString() : null
            })
            .eq('balance_id', existingBalance.balance_id);
        } else {
          // Create new balance record
          const { error: balanceError } = await supabase
            .from('student_balances')
            .insert({
              student_id: student.student_id,
              school_id: schoolId,
              term_id: termId,
              class_id: student.class_id,
              total_fees: tuitionAmount,
              total_paid: totalPaid,
              balance: balance,
              last_payment_date: payments && payments.length > 0 ? new Date().toISOString() : null
            });

          if (!balanceError) {
            balancesCreated++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced balances for ${updatedCount} students`,
      updated: updatedCount,
      balancesCreated: balancesCreated,
      totalStudents: students.length
    });

  } catch (error: any) {
    console.error('Error syncing student balances:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to sync student balances' 
    }, { status: 500 });
  }
}

