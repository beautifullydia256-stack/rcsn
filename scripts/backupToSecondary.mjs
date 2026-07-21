/**
 * Disaster-recovery backup: mirrors the primary Supabase project (auth + public + storage
 * schemas, plus every Storage bucket's files) into a second, independent Supabase project.
 *
 * Run every cycle so the target fully mirrors the source (no incremental DB diffing needed —
 * the primary DB is small enough that a full dump/restore per run is cheap). Storage files are
 * synced incrementally (only new/changed files copied) since they don't change every cycle.
 *
 * Usage: node scripts/backupToSecondary.mjs
 *
 * Required env vars (see docs/failover-runbook.md for where each one comes from):
 *   SOURCE_DB_URL              Primary project's direct Postgres connection string
 *   TARGET_DB_URL              Backup project's direct Postgres connection string
 *   SOURCE_SUPABASE_URL        Primary project's API URL
 *   SOURCE_SERVICE_ROLE_KEY    Primary project's service role key
 *   TARGET_SUPABASE_URL        Backup project's API URL
 *   TARGET_SERVICE_ROLE_KEY    Backup project's service role key
 */

import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[backup] Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const SOURCE_DB_URL = requireEnv('SOURCE_DB_URL');
const TARGET_DB_URL = requireEnv('TARGET_DB_URL');
const SOURCE_SUPABASE_URL = requireEnv('SOURCE_SUPABASE_URL');
const SOURCE_SERVICE_ROLE_KEY = requireEnv('SOURCE_SERVICE_ROLE_KEY');
const TARGET_SUPABASE_URL = requireEnv('TARGET_SUPABASE_URL');
const TARGET_SERVICE_ROLE_KEY = requireEnv('TARGET_SERVICE_ROLE_KEY');

const BUCKETS = [
  'school-logos',
  'student-photos',
  'school-assets',
  'teacher-documents',
  'school-chat-voice',
  'published-reports',
  'teacher-resources',
  'curriculum-files',
  'educational-library',
  'lesson-evidence',
];

const startedAt = Date.now();
const summary = { dbSchemasRestored: [], filesCopied: 0, filesSkipped: 0, filesFailed: 0, errors: [] };

function run(cmd, args, opts = {}) {
  console.log(`[backup] $ ${cmd} ${args.filter((a) => !a.includes('://')).join(' ')}`);
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], ...opts });
}

// Supabase's own documented migration workaround (see: supabase.com/docs/guides/platform/
// migrating-within-supabase/backup-restore): a plain schema dump of platform-managed schemas
// includes `ALTER ... OWNER TO "supabase_admin"` (etc.) statements that only Supabase's own
// admin role can execute — restoring them as the pooler's `postgres` role fails with
// "permission denied for schema X" (confirmed for both auth and storage). Strip those lines;
// harmless to remove since ownership is already correct on a fresh Supabase-provisioned project.
function stripOwnershipStatements(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const stripped = text
    .split('\n')
    .filter((line) => !/^ALTER .* OWNER TO /i.test(line.trim()))
    .join('\n');
  fs.writeFileSync(filePath, stripped);
}

// Public schema's own objects can depend on extensions (e.g. a GIN index using
// pg_trgm's gin_trgm_ops for text search) that must actually be installed on the target
// before that schema DDL is restored — excluding the `extensions` schema from the DDL
// restore (see below) means those CREATE EXTENSION statements never run there. Query the
// source directly for what's really installed and ensure each exists on the target first.
function ensureExtensions() {
  console.log('[backup] Checking installed extensions on source...');
  const out = run('psql', [SOURCE_DB_URL, '-t', '-A', '-c', "SELECT extname FROM pg_extension WHERE extname <> 'plpgsql'"]);
  const extensions = out.toString('utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  console.log(`[backup] Source extensions: ${extensions.join(', ') || '(none)'}`);
  for (const ext of extensions) {
    run('psql', [TARGET_DB_URL, '-v', 'ON_ERROR_STOP=1', '-c', `CREATE EXTENSION IF NOT EXISTS "${ext}" SCHEMA extensions`]);
  }
}

// ─── 1. Dump auth + public + storage + extensions from source ─────────────────

function dumpAndRestore() {
  const schemaFile = path.join(os.tmpdir(), `pweza-backup-schema-${Date.now()}.sql`);
  const dataFile = path.join(os.tmpdir(), `pweza-backup-data-${Date.now()}.sql`);
  // Schema (DDL) is only dumped/restored for schemas this app actually owns and
  // customizes: `public` plus two custom helper schemas confirmed to exist via direct
  // inspection (`SELECT nspname FROM pg_namespace`) — `private`/`_private` hold app
  // functions referenced from public schema objects (a restore failed with `schema
  // "private" does not exist` before these were added). `auth`, `storage`, and
  // `extensions` are excluded: every Supabase project auto-provisions those identically
  // via Supabase's own managed migrations, and the target's `postgres` role doesn't have
  // permission to alter their structure directly (confirmed: restoring auth's or
  // storage's DDL both fail with "permission denied for schema X" even though reading/
  // dumping them from the source works fine). We still want their *data* (actual user
  // accounts, file metadata), just not their structure — so all three stay in the
  // data-only dump below, not this one.
  const schemasForStructure = 'public,private,_private';
  const schemasForData = 'auth,public,storage,extensions,private,_private';

  // `supabase db dump` only dumps schema (DDL) by default; data needs a separate pass
  // with --data-only. Restore order matters: schema first (creates tables), then data.
  console.log('[backup] Dumping source schema (public, private, _private)...');
  run('npx', ['supabase', 'db', 'dump', '--db-url', SOURCE_DB_URL, '--schema', schemasForStructure, '-f', schemaFile]);
  stripOwnershipStatements(schemaFile);
  console.log(`[backup] Schema dump: ${(fs.statSync(schemaFile).size / 1024).toFixed(1)} KB`);

  console.log('[backup] Dumping source data (including auth users)...');
  run('npx', [
    'supabase', 'db', 'dump', '--db-url', SOURCE_DB_URL,
    '--schema', schemasForData, '--data-only',
    // Per Supabase's own documented cross-project migration process: these two Storage
    // vector-search tables are managed exclusively by supabase_storage_admin and even the
    // postgres role can't touch them (confirmed: truncating storage.buckets_vectors fails
    // with "permission denied for table buckets_vectors").
    '-x', 'storage.buckets_vectors', '-x', 'storage.vector_indexes',
    '-f', dataFile,
  ]);
  stripOwnershipStatements(dataFile);
  console.log(`[backup] Data dump: ${(fs.statSync(dataFile).size / 1024 / 1024).toFixed(2)} MB`);

  ensureExtensions();

  // The CLI's dump makes CREATE TABLE/VIEW/FUNCTION/etc. idempotent (IF NOT EXISTS / OR
  // REPLACE, via sed substitutions it applies internally), but that doesn't cover every
  // object type — materialized views have no such form in Postgres at all, and CREATE
  // POLICY has no IF NOT EXISTS either. Patching idempotency one object type at a time is a
  // losing game (confirmed: hit this for tables, then a materialized view). The robust fix
  // is a true clean slate: drop the entire public schema and recreate it empty before every
  // restore, so there is never any pre-existing object of any kind to conflict with.
  console.log('[backup] Dropping and recreating target public/private/_private schemas (clean slate every cycle)...');
  const resetSchemasSql = `
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
    DROP SCHEMA IF EXISTS private CASCADE;
    CREATE SCHEMA private;
    GRANT ALL ON SCHEMA private TO postgres;
    DROP SCHEMA IF EXISTS _private CASCADE;
    CREATE SCHEMA _private;
    GRANT ALL ON SCHEMA _private TO postgres;
  `;
  run('psql', [TARGET_DB_URL, '-v', 'ON_ERROR_STOP=1', '-c', resetSchemasSql]);

  // --single-transaction: if anything in the schema fails partway through, the whole
  // restore rolls back atomically instead of leaving a half-applied schema in place (e.g.
  // tables created but the RLS-enabling statements further down the file never reached —
  // exactly what happened during earlier debugging of this script, which is why the target
  // showed a wall of "RLS disabled" security warnings even though the source has none).
  console.log('[backup] Restoring schema into target (full mirror, atomic)...');
  run('psql', [TARGET_DB_URL, '--single-transaction', '-v', 'ON_ERROR_STOP=1', '-f', schemaFile]);

  // The data dump is plain INSERTs with no ON CONFLICT/TRUNCATE — re-running it against a
  // target that already has last cycle's rows would fail on every unique-key violation.
  // Truncate first so each cycle is a clean, idempotent full mirror rather than accumulating
  // conflicts. CASCADE handles FK ordering; migration-tracking tables are left alone since
  // the CLI's data dump excludes them too (see dry-run: --exclude-table schema_migrations/...).
  console.log('[backup] Clearing target tables before restore (full mirror, not incremental)...');
  const truncateSql = `
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT schemaname, tablename FROM pg_tables
        WHERE schemaname IN ('auth','public','storage')
          -- buckets_vectors/vector_indexes: managed exclusively by supabase_storage_admin,
          -- not even the postgres role can truncate these (confirmed: "permission denied").
          AND tablename NOT IN ('schema_migrations','migrations','buckets_vectors','vector_indexes')
      LOOP
        EXECUTE format('TRUNCATE TABLE %I.%I CASCADE', r.schemaname, r.tablename);
      END LOOP;
    END $$;
  `;
  run('psql', [TARGET_DB_URL, '-v', 'ON_ERROR_STOP=1', '-c', truncateSql]);

  console.log('[backup] Restoring data into target (atomic)...');
  run('psql', [TARGET_DB_URL, '--single-transaction', '-v', 'ON_ERROR_STOP=1', '-f', dataFile]);

  fs.unlinkSync(schemaFile);
  fs.unlinkSync(dataFile);
  summary.dbSchemasRestored = schemasForData.split(',');
  console.log('[backup] Database restore complete.');
}

// ─── 2. Incrementally sync Storage bucket files ────────────────────────────────

async function listAllObjects(client, bucket, prefix = '') {
  const out = [];
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
  for (const entry of data ?? []) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      // Folder placeholder — recurse.
      out.push(...(await listAllObjects(client, bucket, fullPath)));
    } else {
      out.push({ path: fullPath, updatedAt: entry.updated_at, size: entry.metadata?.size ?? null });
    }
  }
  return out;
}

async function syncBucket(source, target, bucket) {
  console.log(`[backup] Syncing bucket "${bucket}"...`);
  const [sourceObjects, targetObjects] = await Promise.all([
    listAllObjects(source, bucket).catch((e) => {
      console.warn(`[backup]   source list failed (bucket may not exist): ${e.message}`);
      return [];
    }),
    listAllObjects(target, bucket).catch(() => []),
  ]);

  const targetByPath = new Map(targetObjects.map((o) => [o.path, o]));

  for (const obj of sourceObjects) {
    const existing = targetByPath.get(obj.path);
    const unchanged = existing && existing.updatedAt === obj.updatedAt && existing.size === obj.size;
    if (unchanged) {
      summary.filesSkipped++;
      continue;
    }
    try {
      const { data: blob, error: dlErr } = await source.storage.from(bucket).download(obj.path);
      if (dlErr) throw dlErr;
      const arrayBuffer = await blob.arrayBuffer();
      const { error: upErr } = await target.storage
        .from(bucket)
        .upload(obj.path, Buffer.from(arrayBuffer), { upsert: true });
      if (upErr) throw upErr;
      summary.filesCopied++;
    } catch (e) {
      summary.filesFailed++;
      summary.errors.push(`${bucket}/${obj.path}: ${e.message}`);
      console.error(`[backup]   FAILED ${bucket}/${obj.path}: ${e.message}`);
    }
  }
}

async function syncStorage() {
  const source = createClient(SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const target = createClient(TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Ensure every bucket exists on the target (mirroring source's public/private setting).
  const { data: sourceBuckets } = await source.storage.listBuckets();
  const { data: targetBuckets } = await target.storage.listBuckets();
  const targetBucketNames = new Set((targetBuckets ?? []).map((b) => b.name));
  for (const b of sourceBuckets ?? []) {
    if (!targetBucketNames.has(b.name)) {
      console.log(`[backup] Creating missing bucket "${b.name}" on target...`);
      await target.storage.createBucket(b.name, { public: b.public });
    }
  }

  for (const bucket of BUCKETS) {
    await syncBucket(source, target, bucket);
  }
}

// ─── Run ────────────────────────────────────────────────────────────────────────

async function main() {
  dumpAndRestore();
  await syncStorage();

  const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log('\n[backup] ─── Summary ───────────────────────────────');
  console.log(`[backup] Schemas restored: ${summary.dbSchemasRestored.join(', ')}`);
  console.log(`[backup] Files copied:  ${summary.filesCopied}`);
  console.log(`[backup] Files skipped (unchanged): ${summary.filesSkipped}`);
  console.log(`[backup] Files failed:  ${summary.filesFailed}`);
  console.log(`[backup] Duration: ${durationSec}s`);

  if (summary.filesFailed > 0) {
    console.error('\n[backup] Completed with file sync errors:');
    summary.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log('[backup] Done.');
}

main().catch((err) => {
  console.error('[backup] FATAL:', err);
  process.exit(1);
});
