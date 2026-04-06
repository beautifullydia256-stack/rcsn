import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { calendarDateIsoInTimeZone } from '@/lib/schoolCalendarDate';

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

    const { data: userRow } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRow?.school_id) {
      return NextResponse.json({ error: 'School not found' }, { status: 400 });
    }

    // Only admin and head_teacher can approve expenses
    if (userRow.role !== 'admin' && userRow.role !== 'head_teacher') {
      return NextResponse.json({ error: 'Access denied. Only admin or head teacher can approve expenses.' }, { status: 403 });
    }

    const body = await request.json();
    const { expense_id, action, notes } = body;

    // Validation
    if (!expense_id || !action) {
      return NextResponse.json({ error: 'Missing expense_id or action' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updatePayload: {
      status: string;
      approved_by: string;
      approved_at: string;
      approval_notes: string | null;
      expense_date?: string;
    } = {
      status: newStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: notes || null,
    };
    if (action === 'approve') {
      updatePayload.expense_date = calendarDateIsoInTimeZone(new Date());
    }

    // Update expense
    const { data: expense, error: updateError } = await supabase
      .from('school_expenses')
      .update(updatePayload)
      .eq('expense_id', expense_id)
      .eq('school_id', userRow.school_id)
      .eq('status', 'pending') // Only update if still pending
      .select()
      .single();

    if (updateError) {
      console.error('Error updating expense:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!expense) {
      return NextResponse.json({ 
        error: 'Expense not found or already processed' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      expense: expense,
      message: `Expense ${action}d successfully`
    });

  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

