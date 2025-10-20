import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('exam_results')
      .select('*')
      .limit(1);

    if (testError) {
      return NextResponse.json({ 
        error: 'Database connection error', 
        details: testError,
        message: 'Cannot connect to exam_results table'
      }, { status: 500 });
    }

    // Test count without filters
    const { count: totalCount, error: countError } = await supabase
      .from('exam_results')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ 
        error: 'Count query error', 
        details: countError 
      }, { status: 500 });
    }

    // Test with school_id filter
    const { count: schoolCount, error: schoolCountError } = await supabase
      .from('exam_results')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', '406bf29b-d7fd-457c-aa56-e29b9ef1a16d');

    if (schoolCountError) {
      return NextResponse.json({ 
        error: 'School count query error', 
        details: schoolCountError 
      }, { status: 500 });
    }

    // Test raw query
    const { data: rawData, error: rawError } = await supabase
      .rpc('get_exam_results_count');

    return NextResponse.json({
      success: true,
      connection_test: {
        can_connect: !testError,
        total_exam_results: totalCount,
        school_exam_results: schoolCount,
        test_data: testData,
        raw_query_result: rawData,
        errors: {
          test: testError?.message,
          count: countError?.message,
          school_count: schoolCountError?.message,
          raw: rawError?.message
        }
      }
    });

  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
