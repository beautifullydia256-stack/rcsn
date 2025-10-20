import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Admin client not available', 
        message: 'SUPABASE_SERVICE_ROLE_KEY not configured'
      }, { status: 500 });
    }

    // Check if the table exists by trying to select from it
    const { data: tableData, error: tableError } = await supabaseAdmin
      .from('processed_primary_exam_results')
      .select('*')
      .limit(1);

    if (tableError) {
      return NextResponse.json({ 
        error: 'Table access error', 
        details: tableError,
        message: 'processed_primary_exam_results table might not exist or have wrong schema'
      }, { status: 500 });
    }

    // Get table info
    const { data: tableInfo, error: infoError } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'processed_primary_exam_results' });

    return NextResponse.json({
      success: true,
      table_exists: !tableError,
      sample_data: tableData,
      table_info: tableInfo,
      errors: {
        table: tableError?.message,
        info: infoError?.message
      }
    });

  } catch (error) {
    console.error('Error checking table structure:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
