import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Admin client not available', 
        message: 'SUPABASE_SERVICE_ROLE_KEY not configured'
      }, { status: 500 });
    }

    const schoolId = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
    const results = [];

    // Get exam results directly using admin client (bypassing RLS issues)
    const { data: examResults, error: examResultsError } = await supabaseAdmin
      .from('exam_results')
      .select(`
        *,
        students!inner(name, admission_number, current_class),
        exam_sets!inner(name, year, term)
      `)
      .eq('school_id', schoolId);

    if (examResultsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch exam results', 
        details: examResultsError,
        message: 'RLS or connection issue'
      }, { status: 500 });
    }

    results.push(`Found ${examResults?.length || 0} exam results`);

    if (!examResults || examResults.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No exam results found',
        results: results
      });
    }

    // Process and insert into processed_primary_exam_results
    const processedResults = examResults.map(result => ({
      school_id: result.school_id,
      student_id: result.student_id,
      exam_set_id: result.exam_set_id,
      year: result.exam_sets.year,
      term: result.exam_sets.term.toString(),
      exam_set_name: result.exam_sets.name,
      student_name: result.students.name,
      class_name: result.students.current_class,
      admission_number: result.students.admission_number,
      subject: result.subject,
      marks_obtained: result.marks_obtained,
      total_marks: result.total_marks,
      grade: result.grade,
      teacher_remark: result.remarks || '',
      teacher_initials: 'T.C',
      class_teacher_comment: '',
      nursery_skill_performance: result.nursery_skill_performance || {},
      processed_at: new Date().toISOString()
    }));

    // Insert processed results using admin client
    const { data: insertedResults, error: insertError } = await supabaseAdmin
      .from('processed_primary_exam_results')
      .upsert(processedResults, { 
        onConflict: 'school_id,student_id,exam_set_id,subject',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to insert processed results', 
        details: insertError 
      }, { status: 500 });
    }

    results.push(`Successfully processed ${processedResults.length} exam results`);

    return NextResponse.json({
      success: true,
      message: 'Exam results processed successfully',
      results: results,
      summary: {
        examResultsFound: examResults.length,
        processedResults: processedResults.length,
        insertedResults: insertedResults?.length || 0
      }
    });

  } catch (error) {
    console.error('Error processing results directly:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
