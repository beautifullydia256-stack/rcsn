import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { exam_set_id, class_name } = body || {};
    
    if (!exam_set_id || !class_name) {
      return NextResponse.json({ error: 'exam_set_id and class_name are required' }, { status: 400 });
    }

    // Get user's school
    const { data: userRow } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();
    
    if (!userRow?.school_id) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    const school_id = userRow.school_id;

    // Get exam set details
    const { data: examSet } = await supabase
      .from('exam_sets')
      .select('name, term, year')
      .eq('id', exam_set_id)
      .eq('school_id', school_id)
      .single();

    if (!examSet) {
      return NextResponse.json({ error: 'Exam set not found' }, { status: 404 });
    }

    // Get all exam results for this exam set and class
    const { data: examResults } = await supabase
      .from('exam_results')
      .select(`
        *,
        students!inner(student_name, admission_number),
        exam_sets!inner(name, term, year)
      `)
      .eq('school_id', school_id)
      .eq('exam_set_id', exam_set_id)
      .eq('class_name', class_name);

    if (!examResults || examResults.length === 0) {
      return NextResponse.json({ error: 'No exam results found' }, { status: 404 });
    }

    // Get teacher remarks settings for all subjects
    const subjects = [...new Set(examResults.map(r => r.subject))];
    const teacherRemarksSettings: Record<string, Array<{ min_percent: number; max_percent: number; comment_text: string }>> = {};
    
    for (const subject of subjects) {
      const { data: settings } = await supabase
        .from('teacher_remarks_settings')
        .select('min_percent, max_percent, comment_text')
        .eq('school_id', school_id)
        .eq('subject', subject)
        .order('min_percent');
      
      teacherRemarksSettings[subject] = settings || [];
    }

    // Helper function to get teacher remark based on percentage
    const getTeacherRemark = (subject: string, marks: number, totalMarks: number) => {
      const percentage = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
      const settings = teacherRemarksSettings[subject] || [];
      
      const matchingRange = settings.find(range => 
        percentage >= range.min_percent && percentage <= range.max_percent
      );
      
      return matchingRange?.comment_text || '';
    };

    // Group results by student
    const studentResults: Record<string, any[]> = {};
    examResults.forEach(result => {
      const studentId = result.student_id;
      if (!studentResults[studentId]) {
        studentResults[studentId] = [];
      }
      studentResults[studentId].push(result);
    });

    // Calculate class teacher comments for each student
    const studentAverages: Record<string, number> = {};
    Object.entries(studentResults).forEach(([studentId, results]) => {
      const totalMarks = results.reduce((sum, r) => sum + (r.marks_obtained || 0), 0);
      const totalPossible = results.reduce((sum, r) => sum + (r.total_marks || 100), 0);
      const average = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
      studentAverages[studentId] = average;
    });

    // Get class teacher comments settings
    const { data: classTeacherComments } = await supabase
      .from('class_teacher_comments_settings')
      .select('min_percent, max_percent, comment_text')
      .eq('school_id', school_id)
      .eq('class_name', class_name)
      .order('min_percent');

    // Helper function to get class teacher comment
    const getClassTeacherComment = (average: number) => {
      if (!classTeacherComments || classTeacherComments.length === 0) {
        // Default comments if no settings
        if (average >= 81) return 'Excellent performance! Keep up the good work.';
        if (average >= 61) return 'Good work! Continue to improve.';
        if (average >= 41) return 'Fair performance. Work harder next time.';
        return 'Needs more effort. Try harder next time.';
      }
      
      const matchingRange = classTeacherComments.find(range => 
        average >= range.min_percent && average <= range.max_percent
      );
      
      return matchingRange?.comment_text || '';
    };

    // Prepare processed data
    const processedData = examResults.map(result => {
      const student = result.students;
      const examSet = result.exam_sets;
      const average = studentAverages[result.student_id] || 0;
      
      return {
        school_id,
        student_id: result.student_id,
        exam_set_id: result.exam_set_id,
        year: examSet.year,
        term: examSet.term,
        exam_set_name: examSet.name,
        student_name: student.student_name,
        class_name: result.class_name,
        admission_number: student.admission_number,
        subject: result.subject,
        marks_obtained: result.marks_obtained,
        total_marks: result.total_marks || 100,
        grade: result.grade,
        teacher_remark: getTeacherRemark(result.subject, result.marks_obtained, result.total_marks || 100),
        teacher_initials: result.teacher_initials,
        class_teacher_comment: getClassTeacherComment(average),
        processed_by: user.id
      };
    });

    // Clear existing processed data for this exam set and class
    await supabase
      .from('processed_primary_exam_results')
      .delete()
      .eq('school_id', school_id)
      .eq('exam_set_id', exam_set_id)
      .eq('class_name', class_name);

    // Insert new processed data
    const { error } = await supabase
      .from('processed_primary_exam_results')
      .insert(processedData);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      processed_count: processedData.length,
      exam_set: examSet.name,
      class: class_name
    });

  } catch (error) {
    console.error('Error processing exam results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const exam_set_id = searchParams.get('exam_set_id');
    const class_name = searchParams.get('class_name');

    // Get user's school
    const { data: userRow } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();
    
    if (!userRow?.school_id) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    const school_id = userRow.school_id;

    let query = supabase
      .from('processed_primary_exam_results')
      .select('*')
      .eq('school_id', school_id)
      .order('student_name, subject');

    if (exam_set_id) {
      query = query.eq('exam_set_id', exam_set_id);
    }
    
    if (class_name) {
      query = query.eq('class_name', class_name);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data || [] });

  } catch (error) {
    console.error('Error fetching processed exam results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
