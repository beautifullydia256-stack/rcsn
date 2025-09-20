import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { teacher_id, new_password } = await request.json();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // List users and match by metadata teacher_id
    let users = { users: [] as any[] };
    try {
      const result = await supabaseAdmin.auth.admin.listUsers();
      if (result.data) users = result.data as any;
    } catch (listError) {
      return NextResponse.json({ error: 'Unable to access user database' }, { status: 500 });
    }

    const user = users.users.find(u => u.raw_user_meta_data?.teacher_id === teacher_id);
    if (!user) {
      return NextResponse.json({ error: 'Teacher login not found. Please create login first.' }, { status: 404 });
    }

    const passwordToSet = new_password || 'ChangeMe123';

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: passwordToSet }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Password reset successfully.` });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


