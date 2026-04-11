/**
 * Read-only: all exam_sets for a school + exam_results row counts per set.
 * Usage: node scripts/audit-school-exam-sets-and-results.mjs <school_id_uuid>
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) throw new Error('Missing .env.local');
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const schoolId = process.argv[2]?.trim();
if (!schoolId) {
  console.error('Usage: node scripts/audit-school-exam-sets-and-results.mjs <school_id_uuid>');
  process.exit(1);
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: school, error: e0 } = await supabase
  .from('schools')
  .select('school_id, name')
  .eq('school_id', schoolId)
  .maybeSingle();
if (e0) throw e0;

const { data: sets, error: e1 } = await supabase
  .from('exam_sets')
  .select('id, name, term, year, created_at')
  .eq('school_id', schoolId)
  .order('year', { ascending: true })
  .order('term', { ascending: true })
  .order('created_at', { ascending: true });
if (e1) throw e1;

const setIds = (sets || []).map((s) => s.id);
const countsBySet = new Map();

if (setIds.length) {
  const { data: agg, error: e2 } = await supabase
    .from('exam_results')
    .select('exam_set_id')
    .eq('school_id', schoolId)
    .in('exam_set_id', setIds);
  if (e2) throw e2;
  for (const row of agg || []) {
    const id = row.exam_set_id;
    countsBySet.set(id, (countsBySet.get(id) || 0) + 1);
  }
}

let orphanResults = 0;
const { data: allRes, error: e4 } = await supabase
  .from('exam_results')
  .select('exam_set_id')
  .eq('school_id', schoolId);
if (e4) throw e4;
const setIdSet = new Set(setIds);
for (const r of allRes || []) {
  if (!r.exam_set_id || !setIdSet.has(r.exam_set_id)) orphanResults++;
}

const rows = (sets || []).map((s) => ({
  id: s.id,
  name: s.name,
  term: s.term,
  year: s.year,
  created_at: s.created_at,
  exam_results_rows: countsBySet.get(s.id) ?? 0,
}));

const totalSets = rows.length;
const setsWithNoResults = rows.filter((r) => r.exam_results_rows === 0);
const setsWithResults = rows.filter((r) => r.exam_results_rows > 0);

console.log(
  JSON.stringify(
    {
      ok: true,
      school: school || { school_id: schoolId, name: '(not found)' },
      summary: {
        total_exam_sets: totalSets,
        sets_with_at_least_one_result: setsWithResults.length,
        sets_with_zero_results: setsWithNoResults.length,
        exam_results_rows_pointing_to_unknown_set: orphanResults,
      },
      sets_with_zero_results: setsWithNoResults,
      all_sets: rows,
    },
    null,
    2,
  ),
);
