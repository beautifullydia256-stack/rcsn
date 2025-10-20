import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id') || '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';

    // Check schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .eq('school_id', schoolId);

    // Check students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId);

    // Check exam sets
    const { data: examSets, error: examSetsError } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('school_id', schoolId);

    // Check exam results
    const { data: examResults, error: examResultsError } = await supabase
      .from('exam_results')
      .select('*')
      .eq('school_id', schoolId);

    // Check processed results
    const { data: processedResults, error: processedError } = await supabase
      .from('processed_primary_exam_results')
      .select('*')
      .eq('school_id', schoolId);

    return NextResponse.json({
      success: true,
      school_id: schoolId,
      data: {
        schools: {
          count: schools?.length || 0,
          data: schools,
          error: schoolsError?.message
        },
        students: {
          count: students?.length || 0,
          data: students,
          error: studentsError?.message
        },
        exam_sets: {
          count: examSets?.length || 0,
          data: examSets,
          error: examSetsError?.message
        },
        exam_results: {
          count: examResults?.length || 0,
          data: examResults,
          error: examResultsError?.message
        },
        processed_results: {
          count: processedResults?.length || 0,
          data: processedResults,
          error: processedError?.message
        }
      }
    });

  } catch (error) {
    console.error('Error checking school data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
