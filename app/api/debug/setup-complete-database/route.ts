import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const results = [];

    // Create a sample school
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: 'Sample Primary School',
        location: 'Kampala, Uganda',
        type: 'Nursery/Primary',
        subscription_plan: 'Free (0-20)',
        student_count: 0
      })
      .select()
      .single();

    if (schoolError) {
      return NextResponse.json({ error: 'Failed to create school', details: schoolError }, { status: 500 });
    }

    results.push(`Created school: ${school.name} (ID: ${school.school_id})`);

    // Create sample students
    const students = [
      { name: 'John Doe', current_class: 'Primary 2', admission_number: 'P2024001' },
      { name: 'Jane Smith', current_class: 'Primary 2', admission_number: 'P2024002' },
      { name: 'Peter Johnson', current_class: 'Primary 3', admission_number: 'P2024003' },
      { name: 'Mary Brown', current_class: 'Primary 3', admission_number: 'P2024004' },
      { name: 'David Wilson', current_class: 'Primary 4', admission_number: 'P2024005' }
    ];

    const createdStudents = [];
    for (const studentData of students) {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          school_id: school.school_id,
          name: studentData.name,
          current_class: studentData.current_class,
          status: 'active',
          admission_number: studentData.admission_number,
          first_name: studentData.name.split(' ')[0],
          last_name: studentData.name.split(' ')[1] || '',
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          date_of_birth: '2010-01-01',
          nationality: 'Ugandan',
          address: 'Kampala, Uganda',
          city: 'Kampala',
          country: 'Uganda',
          guardian_name: `${studentData.name.split(' ')[0]} Parent`,
          guardian_relationship: 'Parent',
          guardian_phone: '0700000000',
          admission_date: '2024-01-15',
          boarding_type: 'Day Scholar',
          payment_status: 'Paid',
          expected_fee_amount: 500000
        })
        .select()
        .single();

      if (studentError) {
        console.error(`Failed to create student ${studentData.name}:`, studentError);
      } else {
        createdStudents.push(student);
      }
    }

    results.push(`Created ${createdStudents.length} students`);

    // Create exam sets
    const currentYear = new Date().getFullYear();
    const currentTerm = 1;

    const examSets = [
      { name: 'Mid Term', description: 'Mid Term Examinations' },
      { name: 'End of Term', description: 'End of Term Examinations' }
    ];

    const createdExamSets = [];
    for (const examSetData of examSets) {
      const { data: examSet, error: examSetError } = await supabase
        .from('exam_sets')
        .insert({
          school_id: school.school_id,
          name: examSetData.name,
          description: examSetData.description,
          year: currentYear,
          term: currentTerm,
          is_active: true
        })
        .select()
        .single();

      if (examSetError) {
        console.error(`Failed to create exam set ${examSetData.name}:`, examSetError);
      } else {
        createdExamSets.push(examSet);
      }
    }

    results.push(`Created ${createdExamSets.length} exam sets`);

    // Create exam results
    const subjects = ['Mathematics', 'English', 'Science', 'Social Studies'];
    let examResultsCreated = 0;

    for (const student of createdStudents) {
      for (const examSet of createdExamSets) {
        for (const subject of subjects) {
          // Generate random marks between 40-95
          const marks = Math.floor(Math.random() * 56) + 40; // 40-95
          const grade = marks >= 80 ? 'A' : marks >= 70 ? 'B' : marks >= 60 ? 'C' : marks >= 50 ? 'D' : 'E';
          
          const { error: examResultError } = await supabase
            .from('exam_results')
            .insert({
              school_id: school.school_id,
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

    // Create processed results
    const { data: examResults, error: examResultsError } = await supabase
      .from('exam_results')
      .select(`
        *,
        students!inner(name, admission_number, current_class),
        exam_sets!inner(name, year, term)
      `)
      .eq('school_id', school.school_id);

    if (examResultsError) {
      return NextResponse.json({ error: 'Failed to fetch exam results for processing', details: examResultsError }, { status: 500 });
    }

    if (examResults && examResults.length > 0) {
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
        return NextResponse.json({ error: 'Failed to insert processed results', details: insertError }, { status: 500 });
      }

      results.push(`Processed ${processedResults.length} results into processed_primary_exam_results table`);
    }

    return NextResponse.json({
      success: true,
      message: 'Complete database setup completed successfully',
      results: results,
      school: {
        id: school.school_id,
        name: school.name,
        type: school.type
      },
      summary: {
        schoolCreated: 1,
        studentsCreated: createdStudents.length,
        examSetsCreated: createdExamSets.length,
        examResultsCreated: examResultsCreated,
        subjectsPerStudent: subjects.length * createdExamSets.length
      }
    });

  } catch (error) {
    console.error('Error setting up complete database:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
