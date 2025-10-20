import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { school_id } = await request.json();

    if (!school_id) {
      return NextResponse.json({ error: 'school_id is required' }, { status: 400 });
    }

    // First, check if school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('school_id', school_id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get students for this school
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', school_id)
      .eq('status', 'active')
      .limit(10);

    if (studentsError || !students || students.length === 0) {
      return NextResponse.json({ error: 'No active students found for this school' }, { status: 404 });
    }

    const results = [];

    // Create exam sets for current year and term
    const currentYear = new Date().getFullYear();
    const currentTerm = 1; // Assuming Term 1

    // Create Mid Term exam set
    const { data: midTermExamSet, error: midTermError } = await supabase
      .from('exam_sets')
      .insert({
        school_id: school_id,
        name: 'Mid Term',
        description: 'Mid Term Examinations',
        year: currentYear,
        term: currentTerm,
        is_active: true
      })
      .select()
      .single();

    if (midTermError) {
      return NextResponse.json({ error: 'Failed to create Mid Term exam set', details: midTermError }, { status: 500 });
    }

    results.push(`Created Mid Term exam set: ${midTermExamSet.id}`);

    // Create End of Term exam set
    const { data: endTermExamSet, error: endTermError } = await supabase
      .from('exam_sets')
      .insert({
        school_id: school_id,
        name: 'End of Term',
        description: 'End of Term Examinations',
        year: currentYear,
        term: currentTerm,
        is_active: true
      })
      .select()
      .single();

    if (endTermError) {
      return NextResponse.json({ error: 'Failed to create End of Term exam set', details: endTermError }, { status: 500 });
    }

    results.push(`Created End of Term exam set: ${endTermExamSet.id}`);

    // Create sample exam results for each student
    const subjects = ['Mathematics', 'English', 'Science', 'Social Studies'];
    const examSets = [midTermExamSet, endTermExamSet];
    
    let examResultsCreated = 0;

    for (const student of students) {
      for (const examSet of examSets) {
        for (const subject of subjects) {
          // Generate random marks between 40-95
          const marks = Math.floor(Math.random() * 56) + 40; // 40-95
          const grade = marks >= 80 ? 'A' : marks >= 70 ? 'B' : marks >= 60 ? 'C' : marks >= 50 ? 'D' : 'E';
          
          const { error: examResultError } = await supabase
            .from('exam_results')
            .insert({
              school_id: school_id,
              exam_set_id: examSet.id,
              student_id: student.student_id,
              class_name: student.current_class,
              subject: subject,
              marks_obtained: marks,
              total_marks: 100,
              grade: grade,
              remarks: marks >= 80 ? 'Excellent work!' : marks >= 60 ? 'Good work' : 'Needs improvement'
            });

          if (examResultError) {
            console.error(`Failed to create exam result for ${student.name} - ${subject}:`, examResultError);
          } else {
            examResultsCreated++;
          }
        }
      }
    }

    results.push(`Created ${examResultsCreated} exam results`);

    // Now populate the processed_primary_exam_results table
    const { data: examResults, error: examResultsError } = await supabase
      .from('exam_results')
      .select(`
        *,
        students!inner(name, admission_number, current_class),
        exam_sets!inner(name, year, term)
      `)
      .eq('school_id', school_id);

    if (examResultsError) {
      return NextResponse.json({ error: 'Failed to fetch exam results for processing', details: examResultsError }, { status: 500 });
    }

    if (examResults && examResults.length > 0) {
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
        teacher_initials: 'T.C', // Sample initials
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
        return NextResponse.json({ error: 'Failed to insert processed results', details: insertError }, { status: 500 });
      }

      results.push(`Processed ${processedResults.length} results into processed_primary_exam_results table`);
    }

    return NextResponse.json({
      success: true,
      message: 'Sample data setup completed successfully',
      results: results,
      summary: {
        examSetsCreated: 2,
        examResultsCreated: examResultsCreated,
        studentsProcessed: students.length,
        subjectsPerStudent: subjects.length * 2 // 2 exam sets
      }
    });

  } catch (error) {
    console.error('Error setting up sample data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
