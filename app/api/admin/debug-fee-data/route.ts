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

    const { school_id, student_id } = await request.json();

    if (!school_id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    const debug = {
      school_id,
      student_id: student_id || 'all',
      timestamp: new Date().toISOString(),
      data: {} as any
    };

    // 1. Check fee structure
    const { data: feeStructure, error: feeError } = await supabaseAdmin
      .from('school_fee_structure')
      .select('*')
      .eq('school_id', school_id);

    debug.data.fee_structure = {
      count: feeStructure?.length || 0,
      data: feeStructure,
      error: feeError?.message
    };

    // 2. Check students
    let studentsQuery = supabaseAdmin
      .from('students')
      .select('student_id, name, current_class, boarding_type, expected_fee_amount, status')
      .eq('school_id', school_id)
      .eq('status', 'active');

    if (student_id) {
      studentsQuery = studentsQuery.eq('student_id', student_id);
    }

    const { data: students, error: studentsError } = await studentsQuery;

    debug.data.students = {
      count: students?.length || 0,
      data: students,
      error: studentsError?.message
    };

    // 3. Check payments
    if (students && students.length > 0) {
      const studentIds = students.map(s => s.student_id);
      const { data: payments, error: paymentsError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .in('student_id', studentIds)
        .eq('school_id', school_id);

      debug.data.payments = {
        count: payments?.length || 0,
        data: payments,
        error: paymentsError?.message
      };

      // 4. Calculate balances for each student
      const studentBalances = students.map(student => {
        const studentPayments = payments?.filter(p => p.student_id === student.student_id) || [];
        const approvedPayments = studentPayments
          .filter(p => p.status === 'Approved')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
        
        const expectedFee = Number(student.expected_fee_amount || 0);
        const balance = Math.max(0, expectedFee - approvedPayments);
        const hasPending = expectedFee > approvedPayments;

        return {
          student_id: student.student_id,
          name: student.name,
          class: student.current_class,
          boarding_type: student.boarding_type,
          expected_fee_amount: expectedFee,
          approved_payments: approvedPayments,
          balance: balance,
          has_pending: hasPending,
          payment_count: studentPayments.length
        };
      });

      debug.data.student_balances = studentBalances;
    }

    // 5. Check outstanding balances page logic
    if (students && students.length > 0) {
      const studentIds = students.map(s => s.student_id);
      const { data: pays } = await supabaseAdmin
        .from('payments')
        .select('student_id, amount, status')
        .in('student_id', studentIds)
        .eq('school_id', school_id)
        .eq('status', 'Approved');

      const paidByStudent: Record<string, number> = {};
      (pays || []).forEach((p: any) => {
        if (studentIds.includes(p.student_id)) {
          const amt = Number(p.amount || 0);
          paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + amt;
        }
      });

      const outstandingRows = students.map((s: any) => {
        const amountPaid = paidByStudent[s.student_id] || 0;
        const balance = Math.max(0, (Number(s.expected_fee_amount || 0)) - amountPaid);
        const hasPending = (Number(s.expected_fee_amount || 0)) > amountPaid;

        return {
          student_id: s.student_id,
          name: s.name,
          class: s.current_class,
          boarding_type: s.boarding_type,
          expected_fee_amount: Number(s.expected_fee_amount || 0),
          amount_paid: amountPaid,
          balance: balance,
          has_pending: hasPending
        };
      });

      debug.data.outstanding_calculation = {
        total_students: outstandingRows.length,
        students_with_pending: outstandingRows.filter(r => r.has_pending).length,
        rows: outstandingRows
      };
    }

    return NextResponse.json({
      success: true,
      debug
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
