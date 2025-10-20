import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const status = {};

    // Check each table
    const tables = [
      'schools',
      'students', 
      'exam_sets',
      'exam_results',
      'processed_primary_exam_results',
      'teacher_comment_rules',
      'student_attendance',
      'student_fees'
    ];

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        status[table] = {
          exists: !error,
          count: count || 0,
          error: error?.message || null
        };
      } catch (err) {
        status[table] = {
          exists: false,
          count: 0,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      success: true,
      database_status: status,
      summary: {
        total_tables_checked: tables.length,
        tables_with_data: Object.values(status).filter((s: any) => s.count > 0).length,
        tables_with_errors: Object.values(status).filter((s: any) => s.error).length
      }
    });

  } catch (error) {
    console.error('Error checking database status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
