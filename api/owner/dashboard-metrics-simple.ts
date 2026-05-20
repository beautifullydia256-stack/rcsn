/**
 * Simple Owner Dashboard Metrics API Endpoint (Fallback)
 * GET /api/owner/dashboard-metrics-simple
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { fetchSupabaseMetrics } from '../../lib/supabaseMetrics';

interface DashboardMetrics {
  totalSchools: number;
  activeSchools: number;
  totalUsers: number;
  monthlyRevenue: number;
  databaseSize: string;
  totalStorage: number;
  apiCallsToday: number;
  activeSessions: number;
  cacheHitRate: number | null;
  activeDbConnections: number | null;
  prometheusAvailable: boolean;
  lastUpdated: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Prometheus metrics and DB counts in parallel
    const [rpcResult, schoolsResult, usersResult, sessionsResult, apiCallsResult, promResult] =
      await Promise.allSettled([
        supabase.rpc('get_owner_dashboard_metrics_realtime'),
        supabase.from('schools').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
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

    const rpcData =
      rpcResult.status === 'fulfilled' && !rpcResult.value.error && rpcResult.value.data?.length > 0
        ? rpcResult.value.data[0]
        : null;

    const totalSchools =
      rpcData?.total_schools ??
      (schoolsResult.status === 'fulfilled' ? (schoolsResult.value.count ?? 0) : 0);

    const totalUsers =
      rpcData?.total_users ??
      (usersResult.status === 'fulfilled' ? (usersResult.value.count ?? 0) : 0);

    const activeSessions =
      sessionsResult.status === 'fulfilled' ? (sessionsResult.value.count ?? 0) : 0;

    const apiCallsToday =
      apiCallsResult.status === 'fulfilled' ? (apiCallsResult.value.count ?? 0) : 0;

    const prom = promResult.status === 'fulfilled' ? promResult.value : null;

    // Database size: real Prometheus value or RPC value
    let databaseSize = 'N/A';
    if (prom && prom.dbSizeBytes > 0) {
      databaseSize = prom.dbSizeFormatted;
    } else if (rpcData?.database_size_bytes) {
      const gb = rpcData.database_size_bytes / (1024 ** 3);
      databaseSize = `${gb.toFixed(2)} GB`;
    } else if (rpcData?.database_size_mb) {
      databaseSize = `${(rpcData.database_size_mb / 1024).toFixed(2)} GB`;
    }

    // Monthly revenue from subscriptions table if RPC unavailable
    let monthlyRevenue = parseFloat(rpcData?.monthly_revenue ?? '0');
    if (!rpcData) {
      try {
        const { data: subs } = await supabase
          .from('school_subscriptions')
          .select('monthly_amount')
          .eq('status', 'active');
        monthlyRevenue = subs?.reduce((sum, s) => sum + (s.monthly_amount ?? 0), 0) ?? 0;
      } catch {
        // ignore — subscriptions table may not exist
      }
    }

    const metrics: DashboardMetrics = {
      totalSchools,
      activeSchools: rpcData?.active_schools ?? Math.round(totalSchools * 0.8),
      totalUsers,
      monthlyRevenue,
      databaseSize,
      totalStorage: parseFloat(rpcData?.storage_usage_gb ?? '0'),
      apiCallsToday,
      activeSessions,
      cacheHitRate: prom?.cacheHitRate ?? null,
      activeDbConnections: prom?.activeConnections ?? null,
      prometheusAvailable: prom !== null,
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json({ success: true, data: metrics, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
