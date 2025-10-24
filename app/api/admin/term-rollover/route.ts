import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// Term 3 rollover status checking:
// - Check if rollover has been completed automatically
// - Show status and results
// - Allow manual trigger if needed (but prevent duplicates)

export async function POST(request: NextRequest) {
  try {
    const { school_id } = await request.json();
    if (!school_id) return NextResponse.json({ error: 'Missing school_id' }, { status: 400 });

    // Check rollover status using the database function
    const { data: statusData, error: statusError } = await supabase
      .rpc('check_rollover_status_api', { p_school_id: school_id });

    if (statusError) {
      console.error('Status check error:', statusError);
      return NextResponse.json({ error: 'Failed to check rollover status' }, { status: 500 });
    }

    const status = statusData[0];

    // If rollover is already completed, return status
    if (status.rollover_completed) {
      return NextResponse.json({
        success: true,
        rollover_completed: true,
        message: status.message,
        rollover_date: status.rollover_date,
        students_graduated: status.students_graduated,
        students_promoted: status.students_promoted,
        academic_year: status.academic_year
      });
    }

    // If rollover can be run manually (Term 3 ended but not completed)
    if (status.can_run_rollover && !status.rollover_completed) {
      // Trigger manual rollover
      const { data: rolloverResult, error: rolloverError } = await supabase
        .rpc('automatic_term3_rollover');

      if (rolloverError) {
        console.error('Manual rollover error:', rolloverError);
        return NextResponse.json({ error: 'Failed to run manual rollover' }, { status: 500 });
      }

      // Check status again after manual rollover
      const { data: newStatusData } = await supabase
        .rpc('check_rollover_status_api', { p_school_id: school_id });

      const newStatus = newStatusData[0];

      return NextResponse.json({
        success: true,
        rollover_completed: newStatus.rollover_completed,
        message: newStatus.message,
        rollover_date: newStatus.rollover_date,
        students_graduated: newStatus.students_graduated,
        students_promoted: newStatus.students_promoted,
        academic_year: newStatus.academic_year,
        manually_triggered: true
      });
    }

    // Term 3 hasn't ended yet
    return NextResponse.json({
      success: false,
      rollover_completed: false,
      message: status.message,
      can_run_rollover: false,
      term3_ended: status.term3_ended
    });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to check rollover status' }, { status: 500 });
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}


