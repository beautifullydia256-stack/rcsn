/**
 * Repo-local smoke check: A-Level RPC is 13-arg in migration; app call sites include p_paper_code / p_paper_number.
 * Does not call Supabase. Run: node scripts/check-secondary-exam-rpc-signatures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const migration = path.join(
  root,
  'supabase/migrations/20260526120000_exam_results_line_keys_uace_papers.sql'
);

const src = fs.readFileSync(migration, 'utf8');
const grantMatch = src.match(
  /GRANT EXECUTE ON FUNCTION public\.teacher_upsert_exam_result_alevel\(\s*([\s\S]*?)\)\s*TO authenticated/s
);
if (!grantMatch) {
  console.error('FAIL: Could not find GRANT for teacher_upsert_exam_result_alevel in migration.');
  process.exit(1);
}
const argLine = grantMatch[1].replace(/\s+/g, ' ').trim();
const types = argLine.split(',').map((t) => t.trim()).filter(Boolean);
if (types.length !== 13) {
  console.error(`FAIL: Expected 13 argument types on teacher_upsert_exam_result_alevel GRANT, got ${types.length}:`, types);
  process.exit(1);
}

const walkTsx = (dir, acc = []) => {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === '.git') continue;
      walkTsx(p, acc);
    } else if (/\.(tsx|ts)$/.test(name.name)) acc.push(p);
  }
  return acc;
};

const files = [
  ...walkTsx(path.join(root, 'app')),
  ...walkTsx(path.join(root, 'src')),
];
const needle = "rpc('teacher_upsert_exam_result_alevel'";
let ok = true;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  if (!t.includes(needle)) continue;
  if (!t.includes('p_paper_code')) {
    console.error(`FAIL: ${path.relative(root, f)} calls teacher_upsert_exam_result_alevel but missing p_paper_code`);
    ok = false;
  }
  if (!t.includes('p_paper_number')) {
    console.error(`FAIL: ${path.relative(root, f)} calls teacher_upsert_exam_result_alevel but missing p_paper_number`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('OK: teacher_upsert_exam_result_alevel GRANT has 13 types; TS call sites reference p_paper_code / p_paper_number.');
console.log('PostgREST: if RPC 404 after deploy, reload schema / restart API in Supabase dashboard.');
