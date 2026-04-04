import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { resolveCurrentSchoolTerm } from '@/src/lib/adminFinanceTerm';

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

    const todayIso = new Date().toISOString().slice(0, 10);
    const resolved = await resolveCurrentSchoolTerm(supabase, schoolId, todayIso);
    if (!resolved?.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'No school term is configured for this school, or terms have no dates.',
          updated: 0,
        },
        { status: 200 }
      );
    }

    const termId = resolved.id;
    const termYear = resolved.year ?? new Date().getFullYear();
    const termNum = resolved.term ?? 1;

    // Map class_name -> tuition_amount (day tuition from fee structure)
    const feeMap = new Map<string, number>();
    feeStructure.forEach((fee: { class_name: string; tuition_amount?: number }) => {
      feeMap.set(fee.class_name, Number(fee.tuition_amount || 0));
    });

    let updatedCount = 0;
    let balancesCreated = 0;

    for (const student of students) {
      const tuitionAmount = feeMap.get(student.current_class) ?? 0;

      // Update students.expected_fee_amount when fee structure has a value
      if (tuitionAmount > 0 && student.expected_fee_amount !== tuitionAmount) {
        const { error: updateError } = await supabase
          .from('students')
          .update({ expected_fee_amount: tuitionAmount })
          .eq('student_id', student.student_id);
        if (!updateError) updatedCount++;
      }

      // Sync student_balances for current term (schema: student_id, term_id, school_id, year, term, total_fees, total_paid, balance, updated_at — no class_id, no last_payment_date)
      if (!termId) continue;

      const { data: payments } = await supabase
        .from('student_payments')
        .select('amount_paid')
        .eq('student_id', student.student_id)
        .eq('term_id', termId);

      const totalPaid = payments?.reduce((sum: number, p: { amount_paid?: number }) => sum + Number(p?.amount_paid || 0), 0) ?? 0;
      const balance = tuitionAmount - totalPaid;

      const { data: existingBalance } = await supabase
        .from('student_balances')
        .select('balance_id')
        .eq('student_id', student.student_id)
        .eq('term_id', termId)
        .maybeSingle();

      const row = {
        student_id: student.student_id,
        school_id: schoolId,
        term_id: termId,
        year: termYear,
        term: termNum,
        total_fees: tuitionAmount,
        total_paid: totalPaid,
        balance,
        updated_at: new Date().toISOString(),
      };

      if (existingBalance) {
        await supabase
          .from('student_balances')
          .update({
            total_fees: row.total_fees,
            total_paid: row.total_paid,
            balance: row.balance,
            updated_at: row.updated_at,
          })
          .eq('balance_id', existingBalance.balance_id);
      } else {
        const { error: balanceError } = await supabase
          .from('student_balances')
          .insert(row);
        if (!balanceError) balancesCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced balances for ${updatedCount} students`,
      updated: updatedCount,
      balancesCreated: balancesCreated,
      totalStudents: students.length,
      termId,
      termYear,
      termNum,
    });

  } catch (error: any) {
    console.error('Error syncing student balances:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to sync student balances' 
    }, { status: 500 });
  }
}

