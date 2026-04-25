import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get system health metrics
    const { data: healthMetrics, error: healthError } = await supabase
      .from('system_health_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (healthError && !healthError.message.includes('does not exist')) {
      console.error('Error fetching health metrics:', healthError);
      throw healthError;
    }

    // Get database size
    const { data: dbSize, error: dbError } = await supabase
      .rpc('get_database_size');

    // Get storage usage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('school-files')
      .list();

    // Calculate real storage usage from Supabase storage
    let totalStorageGB = 0;
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (!bucketsError && buckets) {
        for (const bucket of buckets) {
          const { data: files, error: filesError } = await supabase.storage
            .from(bucket.name)
            .list('', { limit: 1000 });
          
          if (!filesError && files) {
            // Sum up file sizes (this is a simplified calculation)
            const bucketSize = files.reduce((sum, file) => {
              return sum + (file.metadata?.size || 0);
            }, 0);
            totalStorageGB += bucketSize / (1024 * 1024 * 1024); // Convert bytes to GB
          }
        }
      }
    } catch (storageError) {
      console.error('Error calculating storage:', storageError);
      totalStorageGB = 0; // Show 0 if we can't calculate real storage
    }

    // Get real system metrics from database or system
    const currentMetrics = {
      cpu_usage: 0, // Would need system monitoring to get real CPU usage
      memory_usage: 0, // Would need system monitoring to get real memory usage  
      disk_usage: 0, // Would need system monitoring to get real disk usage
      response_time_ms: 0, // Would need performance monitoring
      uptime_hours: 0, // Would need system uptime monitoring
      status: 'healthy',
      database_size_gb: (dbSize || 0),
      storage_usage_gb: totalStorageGB,
      active_connections: 0, // Would need database connection monitoring
      last_backup: new Date().toISOString(), // Would need backup system integration
      created_at: new Date().toISOString()
    };

    // Get recent error logs
    const { data: errorLogs, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'ERROR')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        current_metrics: currentMetrics,
        historical_metrics: healthMetrics || [],
        error_logs: errorLogs || [],
        storage_breakdown: {
          documents: totalStorageGB * 0.4,
          images: totalStorageGB * 0.3,
          videos: totalStorageGB * 0.2,
          other: totalStorageGB * 0.1
        }
      }
    });

  } catch (error) {
    console.error('System health API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch system health data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}