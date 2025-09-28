import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

// GET /api/templates - Fetch templates for the current school
export async function GET(request: NextRequest) {
  try {
    // Use the imported supabase client
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get school ID for the user
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Fetch templates for the school
    const { data: templates, error: templatesError } = await supabase
      .from('report_templates')
      .select('*')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false });

    if (templatesError) {
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    // Use the imported supabase client
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get school ID for the user
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, html_content, css_content, is_default = false } = body;

    if (!name || !html_content) {
      return NextResponse.json({ error: 'Name and HTML content are required' }, { status: 400 });
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('report_templates')
      .insert({
        school_id: school.id,
        name,
        html_content,
        css_content: css_content || '',
        is_default
      })
      .select()
      .single();

    if (templateError) {
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
