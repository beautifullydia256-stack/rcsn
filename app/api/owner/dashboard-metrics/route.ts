import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchSupabaseMetrics } from '../../../../lib/supabaseMetrics';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Run DB queries and Prometheus metrics fetch in parallel
    const [rpcResult, sessionsResult, apiCallsResult, prometheusMetrics] = await Promise.allSettled([
      supabase.rpc('get_owner_dashboard_metrics'),
      supabase
        .from('user_sessions')
        .select('session_id', { count: 'exact', head: true })
        .gte('expires_at', new Date().toISOString())
        .eq('is_active', true),
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      fetchSupabaseMetrics(),
    ]);

    const metricsData =
      rpcResult.status === 'fulfilled' && !rpcResult.value.error
        ? rpcResult.value.data
        : null;

    const activeSessions =
      sessionsResult.status === 'fulfilled' ? (sessionsResult.value.count ?? 0) : 0;

    const apiCallsToday =
      apiCallsResult.status === 'fulfilled' ? (apiCallsResult.value.count ?? 0) : 0;

    const prom = prometheusMetrics.status === 'fulfilled' ? prometheusMetrics.value : null;

    // Database size: prefer real Prometheus value, fall back to RPC
    let databaseSize = 'N/A';
    if (prom && prom.dbSizeBytes > 0) {
      databaseSize = prom.dbSizeFormatted;
    } else if (metricsData?.database_size_mb) {
      const gb = metricsData.database_size_mb / 1024;
      databaseSize = `${gb.toFixed(2)} GB`;
    }

    // Storage: from RPC if available, Prometheus doesn't expose Supabase Storage objects size
    const totalStorage = parseFloat(metricsData?.storage_usage_gb ?? '0');

    const dashboardMetrics = {
      totalSchools: metricsData?.total_schools ?? 0,
      activeSchools: metricsData?.active_schools ?? 0,
      totalUsers: metricsData?.total_users ?? 0,
      monthlyRevenue: metricsData?.monthly_revenue ?? 0,
      databaseSize,
      totalStorage,
      apiCallsToday,
      activeSessions,
      // Real database health from Prometheus
      cacheHitRate: prom?.cacheHitRate ?? null,
      activeDbConnections: prom?.activeConnections ?? null,
      committedTransactions: prom?.committedTransactions ?? null,
      rolledBackTransactions: prom?.rolledBackTransactions ?? null,
      prometheusAvailable: prom !== null,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: dashboardMetrics });
  } catch (error) {
    console.error('Dashboard metrics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
