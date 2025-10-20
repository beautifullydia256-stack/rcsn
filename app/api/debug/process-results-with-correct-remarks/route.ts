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

    // Get exam results with basic info only
    const { data: examResults, error: examResultsError } = await supabaseAdmin
      .from('exam_results')
      .select(`
        *,
        students!inner(name, current_class),
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

    // Get teacher remarks settings (the CORRECT table!)
    const { data: teacherRemarksSettings, error: trsError } = await supabaseAdmin
      .from('teacher_remarks_settings')
      .select('*')
      .eq('school_id', schoolId)
      .order('subject, min_percent');

    if (trsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch teacher_remarks_settings', 
        details: trsError 
      }, { status: 500 });
    }

    results.push(`Found ${teacherRemarksSettings?.length || 0} teacher remarks settings`);

    // Helper function to get teacher remark based on percentage and subject
    const getTeacherRemark = (percentage: number, subject: string, existingRemark: string) => {
      // If there's an existing remark, use it (it was manually set by teacher)
      if (existingRemark && existingRemark.trim() !== '') {
        return existingRemark;
      }

      // Otherwise, use the teacher remarks settings
      const subjectSettings = teacherRemarksSettings?.filter(setting => setting.subject === subject) || [];
      const matchingSetting = subjectSettings.find(setting => 
        percentage >= setting.min_percent && percentage <= setting.max_percent
      );
      
      return matchingSetting?.comment_text || 'No comment available';
    };

    // Process and insert into processed_primary_exam_results with proper teacher remarks
    const processedResults = examResults.map(result => {
      const percentage = (result.marks_obtained / result.total_marks) * 100;
      const teacherRemark = getTeacherRemark(percentage, result.subject, result.remarks || '');
      
      return {
        school_id: result.school_id,
        student_id: result.student_id,
        exam_set_id: result.exam_set_id,
        year: result.exam_sets.year,
        term: result.exam_sets.term.toString(),
        exam_set_name: result.exam_sets.name,
        student_name: result.students.name,
        class_name: result.students.current_class,
        admission_number: 'N/A', // Default value since we don't have this field
        subject: result.subject,
        marks_obtained: result.marks_obtained,
        total_marks: result.total_marks,
        grade: result.grade,
        teacher_remark: teacherRemark,
        teacher_initials: 'T.C',
        class_teacher_comment: '',
        processed_at: new Date().toISOString()
      };
    });

    // Insert processed results
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

    results.push(`Successfully processed ${processedResults.length} exam results with correct teacher remarks`);

    // Show sample of processed remarks
    const sampleRemarks = processedResults.slice(0, 5).map(r => ({
      student: r.student_name,
      subject: r.subject,
      marks: r.marks_obtained,
      percentage: Math.round((r.marks_obtained / r.total_marks) * 100),
      remark: r.teacher_remark
    }));

    return NextResponse.json({
      success: true,
      message: 'Exam results processed successfully with correct teacher remarks from teacher_remarks_settings',
      results: results,
      summary: {
        examResultsFound: examResults.length,
        processedResults: processedResults.length,
        insertedResults: insertedResults?.length || 0,
        teacherRemarksSettingsFound: teacherRemarksSettings?.length || 0
      },
      sampleRemarks: sampleRemarks
    });

  } catch (error) {
    console.error('Error processing results with correct remarks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
