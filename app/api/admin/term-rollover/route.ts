import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Year rollover: when we enter a new calendar year, rollover runs automatically (once per year).
// This API is called on admin dashboard load to ensure rollover has run for the previous year.
// No manual button; no double rollover.

export async function POST(request: NextRequest) {
  try {
    const { school_id } = await request.json();
    if (!school_id) return NextResponse.json({ error: 'Missing school_id' }, { status: 400 });

    // Ensure rollover for previous year has run (runs only once per year for all schools)
    const { error: rolloverError } = await supabase.rpc('automatic_term3_rollover');
    if (rolloverError) {
      console.error('Rollover ensure error:', rolloverError);
      return NextResponse.json({ error: 'Failed to ensure rollover' }, { status: 500 });
    }

    // Return status for this school
    const { data: statusData, error: statusError } = await supabase
      .rpc('check_rollover_status_api', { p_school_id: school_id });

    if (statusError) {
      console.error('Status check error:', statusError);
      return NextResponse.json({ error: 'Failed to check rollover status' }, { status: 500 });
    }

    const status = statusData[0];
    return NextResponse.json({
      success: true,
      rollover_completed: status.rollover_completed,
      message: status.message,
      rollover_date: status.rollover_date,
      students_graduated: status.students_graduated,
      students_promoted: status.students_promoted,
      academic_year: status.academic_year
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to ensure rollover' }, { status: 500 });
  }
}


