/**
 * Owner Dashboard Metrics API Endpoint
 * GET /api/owner/dashboard-metrics
 * 
 * Returns key platform metrics for the owner dashboard
 */

import { NextApiResponse } from 'next';
import { withOwnerReadAuth, SecureOwnerApiRequest } from '../../lib/ownerSecureMiddleware';
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

async function handler(req: SecureOwnerApiRequest, res: NextApiResponse) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get total schools count
    const { count: totalSchools } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    // Get active schools (activity in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeSchools } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })
      .gte('last_activity', thirtyDaysAgo.toISOString());

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get monthly revenue from active subscriptions
    const { data: subscriptions } = await supabase
      .from('school_subscriptions')
      .select('monthly_amount')
      .eq('status', 'active');

    const monthlyRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.monthly_amount || 0), 0) || 0;

    // Get database size (simplified - in production use pg_database_size)
    const { data: dbStats } = await supabase
      .rpc('get_database_stats')
      .single();

    // Get storage usage (simplified)
    const { data: storageStats } = await supabase
      .from('storage_usage')
      .select('total_size')
      .single();

    // Get API calls today (simplified - would need actual API monitoring)
    const today = new Date().toISOString().split('T')[0];
    const { count: apiCallsToday } = await supabase
      .from('api_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Get active sessions (simplified)
    const { count: activeSessions } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString());

    const metrics: DashboardMetrics = {
      totalSchools: totalSchools || 0,
      activeSchools: activeSchools || 0,
      totalUsers: totalUsers || 0,
      monthlyRevenue: monthlyRevenue,
      databaseSize: dbStats?.size || '0 MB',
      totalStorage: storageStats?.total_size || 0,
      apiCallsToday: apiCallsToday || 0,
      activeSessions: activeSessions || 0,
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json(metrics);

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard metrics',
      message: 'An error occurred while retrieving platform metrics'
    });
  }
}

export default withOwnerReadAuth(handler);