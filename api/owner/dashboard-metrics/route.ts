import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get dashboard metrics using the function we created
    const { data: metricsData, error: metricsError } = await supabase
      .rpc('get_owner_dashboard_metrics');

    if (metricsError) {
      console.error('Error fetching dashboard metrics:', metricsError);
      throw metricsError;
    }

    // Get active sessions count
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('session_id', { count: 'exact' })
      .gte('expires_at', new Date().toISOString())
      .eq('is_active', true);

    // Get real API calls from audit logs or monitoring system
    const { data: apiCallsData, error: apiError } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    const apiCallsToday = apiCallsData?.length || 0;

    // Format the response
    const dashboardMetrics = {
      totalSchools: metricsData?.total_schools || 0,
      activeSchools: metricsData?.active_schools || 0,
      totalUsers: metricsData?.total_users || 0,
      monthlyRevenue: metricsData?.monthly_revenue || 0,
      databaseSize: `${(metricsData?.database_size_mb || 0) / 1024}`.substring(0, 4) + ' GB',
      totalStorage: parseFloat((metricsData?.storage_usage_gb || 0).toString()),
      apiCallsToday: apiCallsToday,
      activeSessions: sessionsData?.length || 0,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: dashboardMetrics
    });

  } catch (error) {
    console.error('Dashboard metrics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}