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

    // Test basic connection with admin client
    const { data: testData, error: testError } = await supabaseAdmin
      .from('exam_results')
      .select('*')
      .limit(1);

    if (testError) {
      return NextResponse.json({ 
        error: 'Admin database connection error', 
        details: testError,
        message: 'Cannot connect to exam_results table with admin client'
      }, { status: 500 });
    }

    // Test count without filters
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('exam_results')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ 
        error: 'Admin count query error', 
        details: countError 
      }, { status: 500 });
    }

    // Test with school_id filter
    const { count: schoolCount, error: schoolCountError } = await supabaseAdmin
      .from('exam_results')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

    if (schoolCountError) {
      return NextResponse.json({ 
        error: 'Admin school count query error', 
        details: schoolCountError 
      }, { status: 500 });
    }

    // Get sample data
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('exam_results')
      .select('*')
      .eq('school_id', '406bf29b-d7fd-457c-aa56-e29b9ef1a16d')
      .limit(3);

    return NextResponse.json({
      success: true,
      admin_connection_test: {
        can_connect: !testError,
        total_exam_results: totalCount,
        school_exam_results: schoolCount,
        test_data: testData,
        sample_data: sampleData,
        errors: {
          test: testError?.message,
          count: countError?.message,
          school_count: schoolCountError?.message,
          sample: sampleError?.message
        }
      }
    });

  } catch (error) {
    console.error('Error testing admin connection:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
