import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('school_id, role')
      .eq('user_id', caller.id)
      .single();

    if (!callerProfile?.school_id || !['admin', 'owner', 'head_teacher'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { teacher_id } = (await request.json()) as { teacher_id?: string };
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id is required' }, { status: 400 });
    }

    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('teacher_id, name, email')
      .eq('teacher_id', teacher_id)
      .eq('school_id', callerProfile.school_id)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Capture linked user accounts BEFORE delete (FK is SET NULL on teacher delete)
    const { data: linkedUsers } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('linked_teacher_id', teacher_id);

    // attendance.teacher_id is nullable + NO ACTION — null it out first
    await supabaseAdmin
      .from('attendance')
      .update({ teacher_id: null })
      .eq('teacher_id', teacher_id);

    // Delete teacher — cascades: assignments, class_teachers, teacher_attendance_logs,
    //   teacher_class_subjects, teacher_documents, timetable_periods, timetables
    //   SET NULL: class_template_settings, grades, school_expenses, student_attendance, users.linked_teacher_id
    const { error: deleteErr } = await supabaseAdmin
      .from('teachers')
      .delete()
      .eq('teacher_id', teacher_id)
      .eq('school_id', callerProfile.school_id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    // Delete auth accounts for all linked users
    if (linkedUsers && linkedUsers.length > 0) {
      for (const u of linkedUsers) {
        await supabaseAdmin.from('users').delete().eq('user_id', u.user_id);
        await supabaseAdmin.auth.admin.deleteUser(u.user_id);
      }
    }

    return NextResponse.json({ success: true, deleted: teacher.name });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Delete failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
