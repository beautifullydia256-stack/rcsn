import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get database size and storage usage
    const { data: dbStats, error: dbError } = await supabase
      .rpc('get_database_size');

    if (dbError) {
      console.error('Error getting database size:', dbError);
    }

    // Get storage usage from Supabase storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('school-files')
      .list('', { limit: 1000 });

    let totalStorageBytes = 0;
    if (!storageError && storageData) {
      // Calculate total storage usage
      totalStorageBytes = storageData.reduce((total, file) => {
        return total + (file.metadata?.size || 0);
      }, 0);
    }

    // Get active sessions count
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('session_id', { count: 'exact' })
      .gte('expires_at', new Date().toISOString());

    // Get system metrics
    const { data: metricsData, error: metricsError } = await supabase
      .from('system_health_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    const systemHealth = {
      database_size_mb: dbStats?.size_mb || 0,
      storage_usage_bytes: totalStorageBytes,
      storage_usage_gb: (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2),
      active_sessions: sessionsData?.length || 0,
      cpu_usage: metricsData?.[0]?.cpu_usage || 0,
      memory_usage: metricsData?.[0]?.memory_usage || 0,
      disk_usage: metricsData?.[0]?.disk_usage || 0,
      response_time_ms: metricsData?.[0]?.response_time_ms || 0,
      uptime_hours: metricsData?.[0]?.uptime_hours || 0,
      last_updated: new Date().toISOString()
    };

    return NextResponse.json(systemHealth);

  } catch (error) {
    console.error('System health API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system health data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Insert new system health metric
    const { data, error } = await supabase
      .from('system_health_metrics')
      .insert([{
        cpu_usage: body.cpu_usage || 0,
        memory_usage: body.memory_usage || 0,
        disk_usage: body.disk_usage || 0,
        response_time_ms: body.response_time_ms || 0,
        uptime_hours: body.uptime_hours || 0,
        status: body.status || 'healthy',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting system health metric:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('System health POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to create system health metric' },
      { status: 500 }
    );
  }
}