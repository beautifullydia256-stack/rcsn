/**
 * Read-only audit: load exam_results (+ exam_sets) for a student by admission number.
 * Usage: node scripts/audit-student-exam-results.mjs ADM-2026-2815
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

const admission = process.argv[2]?.trim();
if (!admission) {
  console.error('Usage: node scripts/audit-student-exam-results.mjs <admission_number>');
  process.exit(1);
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: students, error: e1 } = await supabase
  .from('students')
  .select('student_id, name, admission_number, current_class, school_id')
  .eq('admission_number', admission)
  .limit(5);

if (e1) throw e1;
if (!students?.length) {
  console.log(JSON.stringify({ ok: false, reason: 'no_student', admission }, null, 2));
  process.exit(0);
}

const student = students[0];
const sid = student.student_id;

const { data: rows, error: e2 } = await supabase
  .from('exam_results')
  .select(
    [
      'id',
      'exam_set_id',
      'class_name',
      'subject',
      'marks_obtained',
      'total_marks',
      'grade',
      'remarks',
      'activity_score',
      'descriptor',
      'formative_score',
      'exam_score',
      'final_score',
      'overall_remark',
      'teacher_initials',
      'topic',
      'paper_code',
      'paper_number',
      'exam_topic_key',
      'exam_paper_key',
      'updated_at',
      'exam_sets(name, term, year, created_at)',
    ].join(','),
  )
  .eq('student_id', sid)
  .order('updated_at', { ascending: false })
  .limit(80);

if (e2) throw e2;

const summary = (rows || []).map((r) => ({
  subject: r.subject,
  exam: r.exam_sets?.name,
  term: r.exam_sets?.term,
  year: r.exam_sets?.year,
  class_name: r.class_name,
  activity_score: r.activity_score,
  descriptor: r.descriptor,
  formative_score: r.formative_score,
  exam_score: r.exam_score,
  final_score: r.final_score,
  grade: r.grade,
  overall_remark: r.overall_remark,
  teacher_initials: r.teacher_initials,
  topic: r.topic,
  exam_topic_key: r.exam_topic_key,
  exam_paper_key: r.exam_paper_key,
  remarks: r.remarks,
}));

const { data: sets, error: e3 } = await supabase
  .from('exam_sets')
  .select('id, name, term, year, created_at')
  .eq('school_id', student.school_id)
  .eq('term', 1)
  .eq('year', 2026)
  .order('created_at', { ascending: true });

if (e3) throw e3;

console.log(
  JSON.stringify(
    {
      ok: true,
      student: {
        student_id: student.student_id,
        name: student.name,
        admission_number: student.admission_number,
        current_class: student.current_class,
        school_id: student.school_id,
      },
      term1_2026_exam_sets: sets || [],
      rowCount: summary.length,
      rows: summary,
    },
    null,
    2,
  ),
);
