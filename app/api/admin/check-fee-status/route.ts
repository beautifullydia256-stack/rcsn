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

    // Analyze the data
    const analysis = {
      total_students: students?.length || 0,
      students_with_zero_fees: 0,
      students_with_correct_fees: 0,
      students_with_incorrect_fees: 0,
      missing_fee_structures: new Set<string>(),
      fee_structure_summary: {} as any,
      student_summary: [] as any[]
    };

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
      
      // Build fee structure summary
      if (!analysis.fee_structure_summary[fee.class_name]) {
        analysis.fee_structure_summary[fee.class_name] = {
          day_fee: fee.tuition_amount,
          boarding_fee: fee.boarding_tuition_amount
        };
      }
    });

    // Analyze each student
    for (const student of students || []) {
      const currentExpectedFee = student.expected_fee_amount || 0;
      let correctFee = 0;

      // Determine the correct fee based on boarding type and class
      if (student.boarding_type === 'Boarding') {
        correctFee = boardingFees.get(student.current_class) || 0;
      } else {
        correctFee = dayFees.get(student.current_class) || 0;
      }

      const studentAnalysis = {
        student_name: student.name,
        class: student.current_class,
        boarding_type: student.boarding_type,
        current_expected_fee: currentExpectedFee,
        correct_fee: correctFee,
        status: 'unknown'
      };

      if (currentExpectedFee === 0) {
        analysis.students_with_zero_fees++;
        studentAnalysis.status = 'zero_fee';
      } else if (currentExpectedFee === correctFee) {
        analysis.students_with_correct_fees++;
        studentAnalysis.status = 'correct';
      } else {
        analysis.students_with_incorrect_fees++;
        studentAnalysis.status = 'incorrect';
      }

      // Check if fee structure exists for this class/boarding type
      if (correctFee === 0) {
        const key = `${student.current_class}_${student.boarding_type}`;
        analysis.missing_fee_structures.add(key);
      }

      analysis.student_summary.push(studentAnalysis);
    }

    // Convert Set to Array for JSON serialization
    const missingFeeStructures = Array.from(analysis.missing_fee_structures);

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        missing_fee_structures: missingFeeStructures,
        summary: {
          total_students: analysis.total_students,
          students_with_zero_fees: analysis.students_with_zero_fees,
          students_with_correct_fees: analysis.students_with_correct_fees,
          students_with_incorrect_fees: analysis.students_with_incorrect_fees,
          missing_fee_structures_count: missingFeeStructures.length
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
