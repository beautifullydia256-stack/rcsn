import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

// GET /api/templates/[id] - Fetch a specific template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch the specific template
    const { data: template, error: templateError } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', params.id)
      .eq('school_id', school.id)
      .single();

    if (templateError) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/templates/[id] - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { name, html_content, css_content, is_default } = body;

    // Update template
    const { data: template, error: templateError } = await supabase
      .from('report_templates')
      .update({
        name,
        html_content,
        css_content,
        is_default,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('school_id', school.id)
      .select()
      .single();

    if (templateError) {
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Delete template
    const { error: deleteError } = await supabase
      .from('report_templates')
      .delete()
      .eq('id', params.id)
      .eq('school_id', school.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
