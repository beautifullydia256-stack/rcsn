import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const results = [];

    // First, let's check what we have
    const { data: existingSchools } = await supabase.from('schools').select('*').limit(1);
    const { data: existingStudents } = await supabase.from('students').select('*').limit(1);
    const { data: existingExamSets } = await supabase.from('exam_sets').select('*').limit(1);
    const { data: existingExamResults } = await supabase.from('exam_results').select('*').limit(1);

    results.push(`Current state: ${existingSchools?.length || 0} schools, ${existingStudents?.length || 0} students, ${existingExamSets?.length || 0} exam sets, ${existingExamResults?.length || 0} exam results`);

    // If we already have data, just populate processed results
    if (existingSchools && existingSchools.length > 0) {
      const school = existingSchools[0];
      results.push(`Using existing school: ${school.name} (${school.school_id})`);

      // Get all exam results for this school
      const { data: examResults, error: examResultsError } = await supabase
        .from('exam_results')
        .select(`
          *,
          students!inner(name, admission_number, current_class),
          exam_sets!inner(name, year, term)
        `)
        .eq('school_id', school.school_id);

      if (examResultsError) {
        results.push(`Error fetching exam results: ${examResultsError.message}`);
      } else if (examResults && examResults.length > 0) {
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
          processed_at: new Date().toISOString()
        }));

        const { data: insertedResults, error: insertError } = await supabase
          .from('processed_primary_exam_results')
          .upsert(processedResults, { 
            onConflict: 'school_id,student_id,exam_set_id,subject',
            ignoreDuplicates: false 
          })
          .select();

        if (insertError) {
          results.push(`Error inserting processed results: ${insertError.message}`);
        } else {
          results.push(`Successfully processed ${processedResults.length} exam results`);
        }
      } else {
        results.push('No exam results found to process');
      }

      return NextResponse.json({
        success: true,
        message: 'Database fix completed',
        results: results,
        school: {
          id: school.school_id,
          name: school.name
        }
      });
    }

    // If no data exists, we need to create it manually through SQL
    results.push('No existing data found. You need to manually create data through the UI or SQL.');

    return NextResponse.json({
      success: false,
      message: 'No existing data found. Please create data through the UI first.',
      results: results,
      instructions: [
        '1. Go to your admin dashboard',
        '2. Create a school if none exists',
        '3. Add students to the school',
        '4. Create exam sets (Mid Term, End of Term)',
        '5. Add exam results for students',
        '6. Then run this endpoint again to process the data'
      ]
    });

  } catch (error) {
    console.error('Error fixing database:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
