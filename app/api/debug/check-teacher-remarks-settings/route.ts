import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Admin client not available', 
        message: 'SUPABASE_SERVICE_ROLE_KEY not configured'
      }, { status: 500 });
    }

    const schoolId = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';

    // Check if teacher_remarks_settings table exists and has data
    const { data: teacherRemarksSettings, error: trsError } = await supabaseAdmin
      .from('teacher_remarks_settings')
      .select('*')
      .eq('school_id', schoolId)
      .order('subject, min_percent');

    if (trsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch teacher_remarks_settings', 
        details: trsError,
        message: 'teacher_remarks_settings table might not exist or have RLS issues'
      }, { status: 500 });
    }

    // Group by subject for better display
    const groupedBySubject = (teacherRemarksSettings || []).reduce((acc: any, setting: any) => {
      if (!acc[setting.subject]) {
        acc[setting.subject] = [];
      }
      acc[setting.subject].push({
        min_percent: setting.min_percent,
        max_percent: setting.max_percent,
        comment_text: setting.comment_text
      });
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      teacher_remarks_settings: {
        total_count: teacherRemarksSettings?.length || 0,
        school_id: schoolId,
        data: teacherRemarksSettings || [],
        grouped_by_subject: groupedBySubject
      }
    });

  } catch (error) {
    console.error('Error checking teacher remarks settings:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
