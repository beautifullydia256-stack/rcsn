import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// GET /api/templates - Fetch templates for the current school
export async function GET(request: NextRequest) {
  try {
    // Build per-request Supabase client with Authorization header
    // Get bearer token from Authorization header if present
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const bearerPrefix = 'Bearer ';
    const accessToken = authHeader.startsWith(bearerPrefix) ? authHeader.slice(bearerPrefix.length) : undefined;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    // Prefer Bearer token; otherwise fall back to cookie-based auth
    const supabase = accessToken
      ? createClient(supabaseUrl, supabaseAnon, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
          auth: { persistSession: false, detectSessionInUrl: false },
        })
      : createServerClient(supabaseUrl, supabaseAnon, {
          cookies: {
            get(name: string) {
              return cookies().get(name)?.value;
            },
            set() {},
            remove() {},
          },
        });
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get school ID for the user (optional). If not found, return default templates only.
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let templatesQuery = supabase
      .from('report_templates')
      .select('*')
      .order('school_id', { ascending: false })
      .order('created_at', { ascending: false });

    if (userDataError) {
      // On error, still try to return defaults
      templatesQuery = supabase
        .from('report_templates')
        .select('*')
        .is('school_id', null)
        .order('created_at', { ascending: false });
    } else if (!userData?.school_id) {
      // No school record: only defaults
      templatesQuery = supabase
        .from('report_templates')
        .select('*')
        .is('school_id', null)
        .order('created_at', { ascending: false });
    } else {
      // School found: return school templates and defaults
      templatesQuery = supabase
      .from('report_templates')
      .select('*')
      .or(`school_id.is.null,school_id.eq.${userData.school_id}`)
        .order('school_id', { ascending: false })
      .order('created_at', { ascending: false });
    }

    const { data: templates, error: templatesError } = await templatesQuery;

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
    // Build per-request Supabase client with Authorization header
    // Get bearer token from Authorization header if present
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const bearerPrefix = 'Bearer ';
    const accessToken = authHeader.startsWith(bearerPrefix) ? authHeader.slice(bearerPrefix.length) : undefined;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const supabase = accessToken
      ? createClient(supabaseUrl, supabaseAnon, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
          auth: { persistSession: false, detectSessionInUrl: false },
        })
      : createServerClient(supabaseUrl, supabaseAnon, {
          cookies: {
            get(name: string) {
              return cookies().get(name)?.value;
            },
            set() {},
            remove() {},
          },
        });
    
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

