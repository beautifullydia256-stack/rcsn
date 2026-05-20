/**
 * Supabase Prometheus metrics fetcher and parser.
 * Endpoint: https://<project>.supabase.co/customer/v1/privileged/metrics
 * Auth: HTTP Basic with username "service_role" and service role key as password.
 */

export interface SupabaseMetrics {
  dbSizeBytes: number;
  dbSizeFormatted: string;
  activeConnections: number;
  cacheHitRate: number;
  committedTransactions: number;
  rolledBackTransactions: number;
  lastFetched: string;
}

type MetricEntry = { labels: Record<string, string>; value: number };

function parsePrometheusText(text: string): Map<string, MetricEntry[]> {
  const result = new Map<string, MetricEntry[]>();

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // metric_name{k="v",...} value [timestamp]
    const match = trimmed.match(
      /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+([-+]?(?:[0-9]*\.)?[0-9]+(?:[eE][-+]?[0-9]+)?|NaN|[-+]?Inf)/
    );
    if (!match) continue;

    const name = match[1];
    const labelsStr = match[3] ?? '';
    const value = parseFloat(match[4]);
    if (isNaN(value)) continue;

    const labels: Record<string, string> = {};
    for (const m of labelsStr.matchAll(/(\w+)="([^"]*)"/g)) {
      labels[m[1]] = m[2];
    }

    const bucket = result.get(name) ?? [];
    bucket.push({ labels, value });
    result.set(name, bucket);
  }

  return result;
}

function getMetric(
  map: Map<string, MetricEntry[]>,
  name: string,
  filter?: Record<string, string>
): number {
  const entries = map.get(name) ?? [];
  if (!filter) return entries.reduce((s, e) => s + e.value, 0);
  return entries
    .filter(e => Object.entries(filter).every(([k, v]) => e.labels[k] === v))
    .reduce((s, e) => s + e.value, 0);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export async function fetchSupabaseMetrics(): Promise<SupabaseMetrics | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return null;

  try {
    const credentials = Buffer.from(`service_role:${serviceKey}`).toString('base64');
    const res = await fetch(`${supabaseUrl}/customer/v1/privileged/metrics`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'text/plain',
      },
      // Next.js cache: refresh at most every 60 seconds
      next: { revalidate: 60 },
    } as RequestInit);

    if (!res.ok) return null;

    const text = await res.text();
    const map = parsePrometheusText(text);

    // Supabase uses "postgres" as the primary database name
    const db = 'postgres';

    const blksHit = getMetric(map, 'pg_stat_database_blks_hit', { datname: db });
    const blksRead = getMetric(map, 'pg_stat_database_blks_read', { datname: db });
    const cacheHitRate =
      blksHit + blksRead > 0
        ? Math.round((blksHit / (blksHit + blksRead)) * 10000) / 100
        : 0;

    const dbSizeBytes = getMetric(map, 'pg_database_size_bytes', { datname: db });

    // Try both possible connection metric names
    const activeConnections =
      getMetric(map, 'pg_stat_activity_count', { datname: db, state: 'active' }) ||
      getMetric(map, 'pg_stat_database_numbackends', { datname: db }) ||
      getMetric(map, 'pg_stat_activity_count');

    const committedTransactions = getMetric(map, 'pg_stat_database_xact_commit', { datname: db });
    const rolledBackTransactions = getMetric(map, 'pg_stat_database_xact_rollback', { datname: db });

    return {
      dbSizeBytes,
      dbSizeFormatted: formatBytes(dbSizeBytes),
      activeConnections: Math.round(activeConnections),
      cacheHitRate,
      committedTransactions,
      rolledBackTransactions,
      lastFetched: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
