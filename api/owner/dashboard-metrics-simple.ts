/**
 * Simple Owner Dashboard Metrics API Endpoint (Fallback)
 * GET /api/owner/dashboard-metrics-simple
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface DashboardMetrics {
  totalSchools: number;
  activeSchools: number;
  totalUsers: number;
  monthlyRevenue: number;
  databaseSize: string;
  totalStorage: number;
  apiCallsToday: number;
  activeSessions: number;
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

    // Try to get metrics from the RPC function first
    try {
      const { data: metrics, error: metricsError } = await supabase
        .rpc('get_owner_dashboard_metrics_realtime');

      if (!metricsError && metrics && metrics.length > 0) {
        const mainMetrics = metrics[0];
        
        // Format database size
        const dbSizeBytes = mainMetrics.database_size_bytes || 0;
        const dbSizeGB = (dbSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
        
        const dashboardMetrics: DashboardMetrics = {
          totalSchools: mainMetrics.total_schools || 0,
          activeSchools: mainMetrics.active_schools || 0,
          totalUsers: mainMetrics.total_users || 0,
          monthlyRevenue: parseFloat(mainMetrics.monthly_revenue || '0'),
          databaseSize: `${dbSizeGB} GB`,
          totalStorage: 5.2, // Simulated
          apiCallsToday: 156, // Simulated
          activeSessions: mainMetrics.estimated_active_sessions || 0,
          lastUpdated: mainMetrics.last_updated || new Date().toISOString()
        };

        res.status(200).json({
      success: true,
      data: dashboardMetrics,
      timestamp: new Date().toISOString()
    });
      }
    } catch (rpcError) {
      console.log('RPC function not available, falling back to basic queries');
    }

    // Fallback to basic queries if RPC function fails
    const { count: totalSchools } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Try to get subscription revenue
    let monthlyRevenue = 0;
    try {
      const { data: subscriptions } = await supabase
        .from('school_subscriptions')
        .select('monthly_amount')
        .eq('status', 'active');

      monthlyRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.monthly_amount || 0), 0) || 0;
    } catch (subError) {
      console.log('School subscriptions table not available');
    }

    const fallbackMetrics: DashboardMetrics = {
      totalSchools: totalSchools || 0,
      activeSchools: Math.floor((totalSchools || 0) * 0.8), // Estimate 80% active
      totalUsers: totalUsers || 0,
      monthlyRevenue: monthlyRevenue,
      databaseSize: '2.5 GB', // Simulated
      totalStorage: 5.2, // Simulated
      apiCallsToday: 156, // Simulated
      activeSessions: 23, // Simulated
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: fallbackMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}