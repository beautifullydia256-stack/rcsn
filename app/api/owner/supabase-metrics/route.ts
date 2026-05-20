import { NextResponse } from 'next/server';
import { fetchSupabaseMetrics } from '../../../../lib/supabaseMetrics';

export async function GET() {
  const metrics = await fetchSupabaseMetrics();

  if (!metrics) {
    return NextResponse.json(
      { success: false, error: 'Unable to fetch Supabase metrics' },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, data: metrics });
}
