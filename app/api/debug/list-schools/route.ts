import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data: schools, error } = await supabase
      .from('schools')
      .select('school_id, name, type, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch schools', details: error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schools: schools || []
    });
  } catch (error) {
    console.error('Error listing schools:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
