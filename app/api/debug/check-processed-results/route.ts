import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    const studentId = searchParams.get('student_id');
    const examSetId = searchParams.get('exam_set_id');

    if (!schoolId) {
      return NextResponse.json({ error: 'school_id is required' }, { status: 400 });
    }

    // Check if processed_primary_exam_results table has data
    let query = supabase
      .from('processed_primary_exam_results')
      .select('*')
      .eq('school_id', schoolId);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (examSetId) {
      query = query.eq('exam_set_id', examSetId);
    }

    const { data: processedResults, error: processedError } = await query.limit(10);

    // Also check the main exam_results table
    let examQuery = supabase
      .from('exam_results')
      .select('*')
      .eq('school_id', schoolId);

    if (studentId) {
      examQuery = examQuery.eq('student_id', studentId);
    }

    if (examSetId) {
      examQuery = examQuery.eq('exam_set_id', examSetId);
    }

    const { data: examResults, error: examError } = await examQuery.limit(10);

    // Check exam sets
    const { data: examSets, error: examSetsError } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    return NextResponse.json({
      success: true,
      data: {
        processedResults: {
          count: processedResults?.length || 0,
          data: processedResults,
          error: processedError
        },
        examResults: {
          count: examResults?.length || 0,
          data: examResults,
          error: examError
        },
        examSets: {
          count: examSets?.length || 0,
          data: examSets,
          error: examSetsError
        }
      }
    });
  } catch (error) {
    console.error('Error checking processed results:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
