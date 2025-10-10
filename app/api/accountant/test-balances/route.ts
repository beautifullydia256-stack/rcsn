import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
    
    const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
    const school_id = u?.school_id as string | undefined;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    // Query student_balances with real-time data
    const { data: balancesData, error } = await supabase
      .from('student_balances')
      .select(`
        balance_id,
        student_id,
        total_fees,
        total_paid,
        balance,
        students!inner(name, admission_number),
        classes!inner(class_name)
      `)
      .eq('school_id', school_id)
      .limit(3);
    
    if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 });

    // Transform and filter data
    const rows = (balancesData || []).map((b: any) => ({
      original_student_id: b.student_id,
      mapped_student_id: b.students?.admission_number || 'N/A',
      name: b.students?.name || 'Unknown',
      current_class: b.classes?.class_name || 'N/A',
      expected_amount: b.total_fees,
      total_paid: b.total_paid,
      balance: b.balance,
      raw_students_data: b.students,
      raw_classes_data: b.classes
    }));

    return NextResponse.json({ 
      success: true, 
      school_id,
      total_records: rows.length,
      data: rows 
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', details: e }, { status: 500 });
  }
}

