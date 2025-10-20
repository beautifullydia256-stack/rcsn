import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { school_id, student_id, exam_set_id } = await request.json();

    if (!school_id) {
      return NextResponse.json({ error: 'school_id is required' }, { status: 400 });
    }

    // Get exam results from the main table
    let examQuery = supabase
      .from('exam_results')
      .select(`
        *,
        students!inner(name, admission_number, current_class),
        exam_sets!inner(name, year, term)
      `)
      .eq('school_id', school_id);

    if (student_id) {
      examQuery = examQuery.eq('student_id', student_id);
    }

    if (exam_set_id) {
      examQuery = examQuery.eq('exam_set_id', exam_set_id);
    }

    const { data: examResults, error: examError } = await examQuery;

    if (examError) {
      return NextResponse.json({ error: 'Failed to fetch exam results', details: examError }, { status: 500 });
    }

    if (!examResults || examResults.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No exam results found to process',
        processed: 0 
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
      teacher_initials: '',
      class_teacher_comment: '',
      processed_at: new Date().toISOString()
    }));

    // Insert processed results (use upsert to avoid duplicates)
    const { data: insertedResults, error: insertError } = await supabase
      .from('processed_primary_exam_results')
      .upsert(processedResults, { 
        onConflict: 'school_id,student_id,exam_set_id,subject',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to insert processed results', details: insertError }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedResults.length} exam results`,
      processed: processedResults.length,
      data: insertedResults
    });

  } catch (error) {
    console.error('Error populating processed results:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
