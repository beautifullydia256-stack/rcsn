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
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User school not found' }, { status: 404 });
    }

    // Fetch both global default templates and school-specific templates
    const { data: templates, error: templatesError } = await supabase
      .from('report_templates')
      .select('*')
      .or(`school_id.is.null,school_id.eq.${userData.school_id}`)
      .order('school_id', { ascending: false }) // School templates first, then defaults
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
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User school not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, html_content, css_content, is_default = false } = body;

    if (!name || !html_content) {
      return NextResponse.json({ error: 'Name and HTML content are required' }, { status: 400 });
    }

    // Check if this is editing a default template (by checking if a template with this name exists as global default)
    const { data: existingDefault } = await supabase
      .from('report_templates')
      .select('id')
      .eq('name', name)
      .is('school_id', null)
      .single();

    // If editing a default template, create a school-specific copy
    const templateData = {
      school_id: userData.school_id,
      name: existingDefault ? `${name} (Custom)` : name, // Add "(Custom)" suffix for default template copies
      html_content,
      css_content: css_content || '',
      is_default: false // School-specific templates are never marked as default
    };

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('report_templates')
      .insert(templateData)
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
