import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// GET /api/class-template-settings - Fetch class template settings for the current school
export async function GET(request: NextRequest) {
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
    const { data: school, error: schoolError } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Fetch class template settings with template details
    const { data: settings, error: settingsError } = await supabase
      .from('class_template_settings')
      .select(`
        *,
        template:report_templates(
          id,
          name,
          school_id
        )
      `)
      .eq('school_id', school.school_id)
      .order('class_name');

    if (settingsError) {
      return NextResponse.json({ error: 'Failed to fetch class template settings' }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching class template settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/class-template-settings - Create or update class template settings
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
    const { data: school, error: schoolError } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { class_name, template_id, is_o_level, class_teacher_id } = body;

    if (!class_name || !template_id) {
      return NextResponse.json({ error: 'Class name and template ID are required' }, { status: 400 });
    }

    // Create or update class template setting
    const { data: setting, error: settingError } = await supabase
      .from('class_template_settings')
      .upsert({
        school_id: school.school_id,
        class_name,
        template_id,
        is_o_level: is_o_level || false,
        class_teacher_id: class_teacher_id || null
      })
      .select(`
        *,
        template:report_templates(
          id,
          name,
          school_id
        )
      `)
      .single();

    if (settingError) {
      return NextResponse.json({ error: 'Failed to save class template setting' }, { status: 500 });
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Error saving class template setting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    }



    // Get school ID for the user

    const { data: school, error: schoolError } = await supabase

      .from('users')

      .select('school_id')

      .eq('user_id', user.id)

      .single();



    if (schoolError || !school) {

      return NextResponse.json({ error: 'School not found' }, { status: 404 });

    }



    // Parse request body

    const body = await request.json();

    const { class_name, template_id, is_o_level } = body;



    if (!class_name || !template_id) {

      return NextResponse.json({ error: 'Class name and template ID are required' }, { status: 400 });

    }



    // Create or update class template setting

    const { data: setting, error: settingError } = await supabase

      .from('class_template_settings')

      .upsert({

        school_id: school.school_id,

        class_name,

        template_id,

        is_o_level: is_o_level || false

      })

      .select(`

        *,

        template:report_templates(

          id,

          name,

          school_id

        )

      `)

      .single();



    if (settingError) {

      return NextResponse.json({ error: 'Failed to save class template setting' }, { status: 500 });

    }



    return NextResponse.json({ setting });

  } catch (error) {

    console.error('Error saving class template setting:', error);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  }

}


