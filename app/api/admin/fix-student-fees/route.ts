import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    const { school_id } = await request.json();

    if (!school_id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Get all active students for the school
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('student_id, name, current_class, boarding_type, expected_fee_amount')
      .eq('school_id', school_id)
      .eq('status', 'active');

    if (studentsError) {
      return NextResponse.json(
        { error: `Failed to fetch students: ${studentsError.message}` },
        { status: 500 }
      );
    }

    // Get fee structure for the school
    const { data: feeStructure, error: feeError } = await supabaseAdmin
      .from('school_fee_structure')
      .select('class_name, tuition_amount, boarding_tuition_amount')
      .eq('school_id', school_id);

    if (feeError) {
      return NextResponse.json(
        { error: `Failed to fetch fee structure: ${feeError.message}` },
        { status: 500 }
      );
    }

    // Create fee lookup maps
    const dayFees = new Map<string, number>();
    const boardingFees = new Map<string, number>();

    feeStructure?.forEach(fee => {
      if (fee.tuition_amount > 0) {
        dayFees.set(fee.class_name, fee.tuition_amount);
      }
      if (fee.boarding_tuition_amount > 0) {
        boardingFees.set(fee.class_name, fee.boarding_tuition_amount);
      }
    });

    const results = {
      total: students?.length || 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    // Process each student
    for (const student of students || []) {
      try {
        const currentExpectedFee = student.expected_fee_amount || 0;
        let newExpectedFee = 0;

        // Determine the correct fee based on boarding type and class
        if (student.boarding_type === 'Boarding') {
          newExpectedFee = boardingFees.get(student.current_class) || 0;
        } else {
          newExpectedFee = dayFees.get(student.current_class) || 0;
        }

        // Only update if the fee is different and we found a valid fee
        if (newExpectedFee > 0 && newExpectedFee !== currentExpectedFee) {
          const { error: updateError } = await supabaseAdmin
            .from('students')
            .update({ expected_fee_amount: newExpectedFee })
            .eq('student_id', student.student_id);

          if (updateError) {
            results.errors++;
            results.details.push({
              student_name: student.name,
              class: student.current_class,
              boarding_type: student.boarding_type,
              old_fee: currentExpectedFee,
              new_fee: newExpectedFee,
              error: `Failed to update: ${updateError.message}`
            });
          } else {
            results.updated++;
            results.details.push({
              student_name: student.name,
              class: student.current_class,
              boarding_type: student.boarding_type,
              old_fee: currentExpectedFee,
              new_fee: newExpectedFee,
              action: 'Updated successfully'
            });
          }
        } else if (newExpectedFee === 0) {
          results.skipped++;
          results.details.push({
            student_name: student.name,
            class: student.current_class,
            boarding_type: student.boarding_type,
            old_fee: currentExpectedFee,
            new_fee: newExpectedFee,
            action: 'Skipped - no fee structure found for this class/boarding type'
          });
        } else {
          results.skipped++;
          results.details.push({
            student_name: student.name,
            class: student.current_class,
            boarding_type: student.boarding_type,
            old_fee: currentExpectedFee,
            new_fee: newExpectedFee,
            action: 'Skipped - fee already correct'
          });
        }
      } catch (error: any) {
        results.errors++;
        results.details.push({
          student_name: student.name,
          class: student.current_class,
          boarding_type: student.boarding_type,
          error: `Unexpected error: ${error.message}`
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.updated} students out of ${results.total}`,
      results
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
