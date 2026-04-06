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

    // Only accountant and admin can record expenses
    if (userRow.role !== 'accountant' && userRow.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      category_name,
      description,
      amount,
      payment_method,
      reference_number,
      term_id
    } = body;

    const expense_date = calendarDateIsoInTimeZone(new Date());

    // Validation
    if (!category_name || !description || !amount || !payment_method) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get or generate reference number
    let finalReferenceNumber = reference_number;
    if (!finalReferenceNumber) {
      const { data: refData, error: refError } = await supabase.rpc('generate_expense_reference', {
        p_school_id: userRow.school_id,
        p_expense_date: expense_date,
        p_category_name: category_name
      });
      
      if (refError) {
        console.error('Error generating reference:', refError);
        return NextResponse.json({ error: 'Failed to generate reference number' }, { status: 500 });
      }
      
      finalReferenceNumber = refData as string;
    }

    // Get category_id if it exists
    const { data: categoryData } = await supabase
      .from('expense_categories')
      .select('category_id')
      .eq('school_id', userRow.school_id)
      .eq('category_name', category_name)
      .single();

    // Insert expense
    const { data: expense, error: insertError } = await supabase
      .from('school_expenses')
      .insert({
        school_id: userRow.school_id,
        term_id: term_id || null,
        category_id: categoryData?.category_id || null,
        category_name: category_name,
        description: description,
        amount: parseFloat(amount),
        payment_method: payment_method,
        expense_date: expense_date,
        reference_number: finalReferenceNumber,
        status: 'pending',
        recorded_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting expense:', insertError);
      return NextResponse.json({ 
        error: insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expense: expense,
      message: 'Expense recorded successfully. Awaiting approval.'
    });

  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

