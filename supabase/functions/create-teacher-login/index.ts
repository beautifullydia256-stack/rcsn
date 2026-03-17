import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

type CreateTeacherLoginBody = {
  email: string;
  password: string;
  teacher_id: string;
  name?: string;
  school_id: string;
};

const ALLOWED_ROLES = ['owner', 'admin', 'head_teacher'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as CreateTeacherLoginBody;
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const teacherId = String(body.teacher_id ?? '');
    const schoolId = String(body.school_id ?? '');
    const name = body.name ? String(body.name) : 'Teacher User';

    if (!email || !password || !teacherId || !schoolId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Caller-scoped client (validates JWT + reads caller profile)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerId = userData.user.id;
    const { data: callerProfile, error: callerProfileErr } = await callerClient
      .from('users')
      .select('role, school_id')
      .eq('user_id', callerId)
      .maybeSingle();
    if (callerProfileErr || !callerProfile?.role) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerRole = String(callerProfile.role);
    const callerSchoolId = callerProfile.school_id ? String(callerProfile.school_id) : null;
    if (!ALLOWED_ROLES.includes(callerRole)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (callerRole !== 'owner' && callerSchoolId !== schoolId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client (service role) to create auth user + upsert profile
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingUser } = await adminClient.from('users').select('user_id').eq('email', email).maybeSingle();
    if (existingUser?.user_id) {
      return new Response(JSON.stringify({ error: 'An account with this email already exists. Please use a different email address.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        teacher_id: teacherId,
        role: 'teacher',
        name,
        school_id: schoolId,
        email,
        created_by: callerId,
      },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message || 'Failed to create user';
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await adminClient
      .from('users')
      .upsert(
        { user_id: created.user.id, email, role: 'teacher', name, school_id: schoolId },
        { onConflict: 'user_id' },
      );

    return new Response(JSON.stringify({ success: true, user_id: created.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

