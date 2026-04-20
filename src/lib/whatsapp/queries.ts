import type { SupabaseClient } from '@supabase/supabase-js';
import { loadStudentBalanceAggAllTerms } from '../adminFinanceTerm';
import { studentAttendanceRowIsPresent } from '../studentAttendanceRow';
import { schoolCalendarTodayIso, schoolCalendarWeekRangeIso } from '../schoolCalendarDate';

export type ParentFeeBalanceMetrics = {
  total_fees: number;
  paid: number;
  outstanding: number;
};

export async function getParentFeeBalanceMetrics(
  client: SupabaseClient,
  schoolId: string,
  studentId: string
): Promise<ParentFeeBalanceMetrics> {
  const agg = await loadStudentBalanceAggAllTerms(client, schoolId, studentId);
  return {
    total_fees: Math.max(0, Number(agg.total_fees || 0)),
    paid: Math.max(0, Number(agg.total_paid || 0)),
    outstanding: Math.max(0, Number(agg.balance || 0)),
  };
}

export async function getParentFeeSummary(
  client: SupabaseClient,
  schoolId: string,
  studentId: string
): Promise<string> {
  const { total_fees, paid, outstanding } = await getParentFeeBalanceMetrics(client, schoolId, studentId);
  const fmt = (n: number) => `UGX ${Math.round(n).toLocaleString('en-UG')}`;
  return (
    `Fees summary\n` +
    `Total fees (all terms): ${fmt(total_fees)}\n` +
    `Paid: ${fmt(paid)}\n` +
    `Outstanding: ${fmt(outstanding)}`
  );
}

export async function getLatestReportPdfForStudent(
  client: SupabaseClient,
  schoolId: string,
  studentId: string
): Promise<{ url: string | null; label: string }> {
  const { data: reps } = await client
    .from('generated_reports')
    .select('id, pdf_url, generated_at, snapshot_id')
    .eq('student_id', studentId)
    .order('generated_at', { ascending: false })
    .limit(1);
  const row = (reps || [])[0] as { pdf_url?: string | null; snapshot_id?: string } | undefined;
  if (!row?.pdf_url) return { url: null, label: 'No published report card found yet.' };

  const { data: snap } = await client
    .from('report_snapshots')
    .select('term, year, exam_set_id')
    .eq('id', row.snapshot_id)
    .maybeSingle();
  const sn = snap as { term?: number; year?: number } | null;
  const label = sn ? `Term ${sn.term ?? '—'} · ${sn.year ?? '—'}` : 'Report';

  return { url: row.pdf_url, label };
}

export async function getParentAttendanceSummary(
  client: SupabaseClient,
  schoolId: string,
  studentId: string,
  kind: 'today' | 'week' | 'date',
  dateIso?: string
): Promise<string> {
  let start = schoolCalendarTodayIso();
  let end = start;
  if (kind === 'week') {
    const w = schoolCalendarWeekRangeIso();
    start = w.monday;
    end = w.sunday;
  } else if (kind === 'date' && dateIso) {
    start = dateIso;
    end = dateIso;
  }

  const { data: rows } = await client
    .from('student_attendance')
    .select('attendance_date, present, status')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .gte('attendance_date', start)
    .lte('attendance_date', end)
    .order('attendance_date', { ascending: true });

  const list = (rows || []) as { attendance_date: string; present?: boolean; status?: string }[];
  if (list.length === 0) return `No attendance records for ${start === end ? start : `${start} – ${end}`}.`;

  const lines = list.map((r) => {
    const st = studentAttendanceRowIsPresent(r) ? 'Present' : 'Absent';
    return `${r.attendance_date}: ${st}`;
  });
  return lines.join('\n');
}

export type AttendanceScope = 'whole_school' | 'classes';

/** Monday = 0 … Sunday = 6 (matches `TeacherTimetablePage` / `timetables.day_of_week`). */
export function timetableDayIndexFromDate(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

const TIMETABLE_DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function timetableDayLabel(dayIndex: number): string {
  return TIMETABLE_DAY_LABELS[dayIndex] ?? `Day ${dayIndex}`;
}

export type TimetableRowWhatsapp = {
  class_name: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
};

export async function getTeacherTimetableRows(
  client: SupabaseClient,
  schoolId: string,
  teacherId: string | null
): Promise<TimetableRowWhatsapp[]> {
  if (!teacherId) return [];
  const { data, error } = await client
    .from('timetables')
    .select('class_name, subject, day_of_week, start_time, end_time, room')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId)
    .order('day_of_week')
    .order('start_time');
  if (error) throw new Error(error.message);
  return (data || []) as TimetableRowWhatsapp[];
}

/** Distinct class names this teacher has on the school timetable (may exceed `teachers.classes`). */
export async function getDistinctClassNamesFromTimetableForTeacher(
  client: SupabaseClient,
  schoolId: string,
  teacherId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('timetables')
    .select('class_name')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const r of data || []) {
    const c = ((r as { class_name?: string }).class_name || '').trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Same class union as the teacher web dashboard (`class_teachers` + `teacher_class_subjects` +
 * `timetables` + `teachers.classes`) so WhatsApp matches KPIs like "You teach 5 classes".
 */
export async function getMergedTeacherClassNames(
  client: SupabaseClient,
  schoolId: string,
  teacherId: string
): Promise<string[]> {
  const set = new Set<string>();

  const { data: tFull, error: tErr } = await client
    .from('teachers')
    .select('classes')
    .eq('teacher_id', teacherId)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  const profileClasses = (tFull as { classes?: string[] } | null)?.classes;
  if (Array.isArray(profileClasses)) {
    for (const c of profileClasses) {
      const x = (String(c) || '').trim();
      if (x) set.add(x);
    }
  }

  for (const c of await getDistinctClassNamesFromTimetableForTeacher(client, schoolId, teacherId)) {
    set.add(c);
  }

  const { data: ctRows, error: ctErr } = await client
    .from('class_teachers')
    .select('class_name')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);
  if (ctErr) throw new Error(ctErr.message);
  for (const r of ctRows || []) {
    const c = ((r as { class_name?: string }).class_name || '').trim();
    if (c) set.add(c);
  }

  const { data: tcsRows, error: tcsErr } = await client
    .from('teacher_class_subjects')
    .select('class_name')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);
  if (tcsErr) throw new Error(tcsErr.message);
  for (const r of tcsRows || []) {
    const c = ((r as { class_name?: string }).class_name || '').trim();
    if (c) set.add(c);
  }

  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function getDistinctActiveClassNames(
  client: SupabaseClient,
  schoolId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('students')
    .select('current_class')
    .eq('school_id', schoolId)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const r of data || []) {
    const c = ((r as { current_class?: string }).current_class || '').trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export type ClassAttendanceBreakdown = {
  class_name: string;
  present: number;
  absent: number;
  absentNames: string[];
};

export async function getAttendanceBreakdownByClasses(
  client: SupabaseClient,
  schoolId: string,
  dateIso: string,
  classNames: string[]
): Promise<ClassAttendanceBreakdown[]> {
  const out: ClassAttendanceBreakdown[] = [];
  for (const cn of classNames) {
    const stats = await getStaffAttendanceStats(client, schoolId, dateIso, 'classes', [cn]);
    out.push({
      class_name: cn,
      present: stats.present,
      absent: stats.absent,
      absentNames: stats.absentNames,
    });
  }
  return out;
}

export type InAppNotificationRow = { title: string; body: string; created_at: string };

export async function getRecentInAppNotificationsForUser(
  client: SupabaseClient,
  schoolId: string,
  userId: string,
  limit = 8
): Promise<InAppNotificationRow[]> {
  const { data, error } = await client
    .from('user_in_app_notifications')
    .select('title, body, created_at')
    .eq('school_id', schoolId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as InAppNotificationRow[];
}

function fmtTimeHm(t: string): string {
  if (!t || typeof t !== 'string') return '—';
  return t.length >= 5 ? t.slice(0, 5) : t;
}

/** Plain-text week view for WhatsApp (truncated if very long). */
export function formatTimetableRowsForWhatsapp(rows: TimetableRowWhatsapp[], maxChars = 3600): string {
  if (rows.length === 0) return 'No timetable entries yet. Your admin can add your schedule in school settings.';
  const byDay = new Map<number, TimetableRowWhatsapp[]>();
  for (const r of rows) {
    const d = r.day_of_week;
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(r);
  }
  let s = '';
  for (let d = 0; d <= 6; d++) {
    const list = byDay.get(d);
    if (!list?.length) continue;
    s += `*${timetableDayLabel(d)}*\n`;
    for (const r of list) {
      s +=
        `· ${fmtTimeHm(r.start_time)}–${fmtTimeHm(r.end_time)} · ${r.class_name} · ${r.subject}` +
        (r.room ? ` · ${r.room}` : '') +
        '\n';
    }
    s += '\n';
  }
  const out = s.trim();
  if (out.length <= maxChars) return out;
  return `${out.slice(0, maxChars - 40)}\n… (open PwezaCore for the full timetable)`;
}

export async function getStaffAttendanceStats(
  client: SupabaseClient,
  schoolId: string,
  dateIso: string,
  scope: AttendanceScope,
  classNames: string[] | null
): Promise<{ present: number; absent: number; absentNames: string[] }> {
  const classScoped = scope === 'classes' && classNames && classNames.length > 0;
  const studsQuery = client
    .from('students')
    .select('student_id, name')
    .eq('school_id', schoolId)
    .eq('status', 'active');
  const { data: studs } = classScoped
    ? await studsQuery.in('current_class', classNames)
    : await studsQuery;

  const roster = (studs || []) as { student_id: string; name?: string | null }[];
  if (roster.length === 0) return { present: 0, absent: 0, absentNames: [] };

  const studentIds = roster.map((s) => s.student_id);
  const { data: rows } = await client
    .from('student_attendance')
    .select('student_id, present, status')
    .eq('school_id', schoolId)
    .eq('attendance_date', dateIso)
    .in('student_id', studentIds);

  const byStudent = new Map<string, { present?: boolean | null; status?: string | null }>();
  for (const r of rows || []) {
    const sid = (r as { student_id: string }).student_id;
    if (sid) byStudent.set(sid, r as { present?: boolean | null; status?: string | null });
  }

  let present = 0;
  const absentNamesAll: string[] = [];
  for (const s of roster) {
    const row = byStudent.get(s.student_id);
    const isPresent = row ? studentAttendanceRowIsPresent(row) : false;
    if (isPresent) present++;
    else {
      const n = String(s.name || '').trim();
      if (n) absentNamesAll.push(n);
    }
  }
  absentNamesAll.sort((a, b) => a.localeCompare(b));

  const MAX_ABSENT_NAMES = 40;
  const absentNames =
    absentNamesAll.length <= MAX_ABSENT_NAMES
      ? absentNamesAll
      : absentNamesAll.slice(0, MAX_ABSENT_NAMES);

  const absent = roster.length - present;
  return { present, absent, absentNames };
}

export async function verifyReceiptByRef(
  client: SupabaseClient,
  schoolId: string,
  ref: string
): Promise<string | null> {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  const { data: byPayment } = await client
    .from('student_payments')
    .select(
      'payment_id, student_id, amount_paid, receipt_number, payment_date, payment_method, reversed_at'
    )
    .eq('school_id', schoolId)
    .eq('payment_id', trimmed)
    .maybeSingle();

  if (byPayment) {
    const p = byPayment as {
      payment_id: string;
      student_id: string;
      amount_paid: number;
      receipt_number: string | null;
      payment_date: string | null;
      payment_method: string | null;
      reversed_at: string | null;
    };
    const { data: st } = await client.from('students').select('name, current_class').eq('student_id', p.student_id).maybeSingle();
    const name = (st as { name?: string; current_class?: string } | null)?.name || '—';
    const rev = p.reversed_at ? ' (REVERSED)' : '';
    return (
      `Receipt / payment\n` +
      `Ref: ${p.receipt_number || p.payment_id}\n` +
      `Amount: UGX ${Math.round(Number(p.amount_paid || 0)).toLocaleString('en-UG')}\n` +
      `Date: ${p.payment_date || '—'}\n` +
      `Method: ${(p.payment_method || '—').replace(/_/g, ' ')}\n` +
      `Student: ${name}${rev}`
    );
  }

  const { data: byReceipt } = await client
    .from('student_payments')
    .select(
      'payment_id, student_id, amount_paid, receipt_number, payment_date, payment_method, reversed_at'
    )
    .eq('school_id', schoolId)
    .ilike('receipt_number', trimmed)
    .limit(5);

  const rows = (byReceipt || []) as {
    payment_id: string;
    student_id: string;
    amount_paid: number;
    receipt_number: string | null;
    payment_date: string | null;
    payment_method: string | null;
    reversed_at: string | null;
  }[];
  const exact = rows.find((r) => (r.receipt_number || '').toLowerCase() === trimmed.toLowerCase()) || rows[0];
  if (!exact) return null;

  const { data: st } = await client.from('students').select('name, current_class').eq('student_id', exact.student_id).maybeSingle();
  const name = (st as { name?: string } | null)?.name || '—';
  const rev = exact.reversed_at ? ' (REVERSED)' : '';
  return (
    `Receipt / payment\n` +
    `Ref: ${exact.receipt_number || exact.payment_id}\n` +
    `Amount: UGX ${Math.round(Number(exact.amount_paid || 0)).toLocaleString('en-UG')}\n` +
    `Date: ${exact.payment_date || '—'}\n` +
    `Method: ${(exact.payment_method || '—').replace(/_/g, ' ')}\n` +
    `Student: ${name}${rev}`
  );
}
