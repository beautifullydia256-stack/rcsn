import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { teacher_id, email } = await request.json();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });

    const result = await supabaseAdmin.auth.admin.listUsers();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });

    const users = result.data?.users || [];
    const byTeacherId = teacher_id ? users.find(u => u.raw_user_meta_data?.teacher_id === teacher_id) : null;
    const byEmail = email ? users.find(u => (u.email || '').toLowerCase() === String(email).toLowerCase()) : null;
    const found = byTeacherId || byEmail || null;

    if (!found) return NextResponse.json({ exists: false });

    return NextResponse.json({
      exists: true,
      id: found.id,
      email: found.email,
      confirmed_at: found.email_confirmed_at,
      last_sign_in_at: found.last_sign_in_at,
      role: found.raw_user_meta_data?.role,
      teacher_id: found.raw_user_meta_data?.teacher_id
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


