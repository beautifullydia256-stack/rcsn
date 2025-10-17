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
    const { class_name, teacher_id } = body || {};
    if (!class_name || !teacher_id) {
      return NextResponse.json({ error: 'class_name and teacher_id are required' }, { status: 400 });
    }

    // Resolve school_id of caller
    const { data: urow, error: uerr } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (uerr || !urow?.school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    const school_id = urow.school_id as string;

    // Ensure the teacher belongs to same school
    const { data: trow, error: terr } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('teacher_id', teacher_id)
      .eq('school_id', school_id)
      .maybeSingle();
    if (terr || !trow) return NextResponse.json({ error: 'Teacher not found in this school' }, { status: 400 });

    // Ensure report template exists (avoid template_id null violation later)
    let templateId: string | null = null;
    {
      const { data: defaultTemplate } = await supabase
        .from('report_templates')
        .select('id')
        .eq('school_id', school_id)
        .eq('is_default', true)
        .maybeSingle();
      templateId = (defaultTemplate as any)?.id || null;
      if (!templateId) {
        const { data: anyTemplate } = await supabase
          .from('report_templates')
          .select('id')
          .eq('school_id', school_id)
          .limit(1)
          .maybeSingle();
        templateId = (anyTemplate as any)?.id || null;
      }
      // If still none, create a minimal default template row
      if (!templateId) {
      const { data: created, error: createErr } = await supabase
          .from('report_templates')
          .insert({ 
            school_id, 
            name: 'Default Template', 
            is_default: true,
            html_content: '<div class="report-template"><h1>Default Report Template</h1><p>This is a default template created automatically.</p></div>',
            css_content: '.report-template { font-family: Arial, sans-serif; margin: 20px; } .report-template h1 { color: #333; } .report-template p { color: #666; }'
          })
          .select('id')
          .maybeSingle();
        if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
        templateId = (created as any)?.id || null;
      }
    }

    // Check if class template setting exists
    const { data: existing } = await supabase
      .from('class_template_settings')
      .select('*')
      .eq('school_id', school_id)
      .eq('class_name', class_name)
      .maybeSingle();

    let setting;
    if (existing) {
      // Ensure non-null template
      if (!existing.template_id) {
        const { error: upTplErr } = await supabase
          .from('class_template_settings')
          .update({ template_id: templateId })
          .eq('school_id', school_id)
          .eq('class_name', class_name);
        if (upTplErr) return NextResponse.json({ error: upTplErr.message }, { status: 500 });
      }
      // Re-read a single record for return (avoid .single errors if duplicates exist)
      const { data: reread } = await supabase
        .from('class_template_settings')
        .select('*')
        .eq('school_id', school_id)
        .eq('class_name', class_name)
        .limit(1)
        .maybeSingle();
      setting = reread || existing;
    } else {
      // Create new record with guaranteed template
      const { data, error: insErr } = await supabase
        .from('class_template_settings')
        .insert({ 
          school_id, 
          class_name, 
          template_id: templateId,
          is_o_level: false
        })
        .select('*')
        .maybeSingle();
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
      setting = data;
    }

    // Record appointment in class_teachers table (allows multiple)
    const { error: linkErr } = await supabase
      .from('class_teachers')
      .insert({ school_id, class_name, teacher_id })
      .select('id')
      .maybeSingle();
    if (linkErr && !/duplicate key|unique/.test(linkErr.message)) {
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    console.error('Assign class teacher error:', error);
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

    const { data: urow } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const school_id = urow?.school_id;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    // Return classes with their class teachers (multiple)
    const { data, error } = await supabase
      .from('class_teachers')
      .select('class_name, teacher_id')
      .eq('school_id', school_id)
      .order('class_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ classes: data || [] });
  } catch (error) {
    console.error('List class teachers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


