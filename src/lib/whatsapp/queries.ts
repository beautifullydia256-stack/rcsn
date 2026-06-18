import type { SupabaseClient } from '@supabase/supabase-js';
import { loadStudentBalanceAggAllTerms } from '../adminFinanceTerm';
import { studentAttendanceRowIsPresent } from '../studentAttendanceRow';
import { schoolCalendarTodayIso, schoolCalendarWeekRangeIso } from '../schoolCalendarDate';
import { formatTimetableTime, timetableDayNameToIndex } from '../timetableDay';

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
    .from('timetable_periods')
    .select('class_name, subject, day_of_week, start_time, end_time')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);
  if (error) throw new Error(error.message);
  const raw = (data || []) as {
    class_name: string;
    subject: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
  }[];
  const mapped: TimetableRowWhatsapp[] = [];
  for (const r of raw) {
    const dayIx = timetableDayNameToIndex(r.day_of_week);
    if (dayIx === null) continue;
    mapped.push({
      class_name: r.class_name,
      subject: r.subject,
      day_of_week: dayIx,
      start_time: formatTimetableTime(r.start_time),
      end_time: formatTimetableTime(r.end_time),
      room: null,
    });
  }
  mapped.sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  );
  return mapped;
}

/** Distinct class names from Timetable Designer rows (`timetable_periods`) for this teacher. */
export async function getDistinctClassNamesFromTimetableForTeacher(
  client: SupabaseClient,
  schoolId: string,
  teacherId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('timetable_periods')
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

// ── New features ─────────────────────────────────────────────────────────────

export type PaymentHistoryRow = {
  amount: number;
  date: string | null;
  method: string | null;
  reference: string | null;
};

export async function getStudentPaymentHistory(
  client: SupabaseClient,
  schoolId: string,
  studentId: string,
  limit = 10
): Promise<PaymentHistoryRow[]> {
  const { data } = await client
    .from('student_payments')
    .select('amount_paid, payment_date, payment_method, receipt_number')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .is('reversed_at', null)
    .order('payment_date', { ascending: false })
    .limit(limit);
  return (data || []).map((r) => {
    const row = r as { amount_paid?: number; payment_date?: string | null; payment_method?: string | null; receipt_number?: string | null };
    return {
      amount: Math.max(0, Number(row.amount_paid ?? 0)),
      date: row.payment_date ?? null,
      method: row.payment_method ?? null,
      reference: row.receipt_number ?? null,
    };
  });
}

export type StudentTermFeeRow = {
  term: number;
  year: number;
  total_fees: number;
  paid: number;
  outstanding: number;
};

export async function getStudentTermFeeSummary(
  client: SupabaseClient,
  schoolId: string,
  studentId: string
): Promise<StudentTermFeeRow[]> {
  const { data: balRows } = await client
    .from('student_balances')
    .select('term_id, total_fees, total_paid, balance')
    .eq('school_id', schoolId)
    .eq('student_id', studentId);

  if (!balRows?.length) return [];

  const termIds = [
    ...new Set(
      (balRows as { term_id?: string | null }[])
        .map((r) => r.term_id)
        .filter((id): id is string => !!id)
    ),
  ];
  if (!termIds.length) return [];

  const { data: termRows } = await client
    .from('school_terms')
    .select('id, term, year')
    .in('id', termIds);

  const termMap = new Map<string, { term: number; year: number }>();
  for (const t of termRows || []) {
    const tr = t as { id: string; term?: number | null; year?: number | null };
    if (tr.id) termMap.set(tr.id, { term: Number(tr.term ?? 0), year: Number(tr.year ?? 0) });
  }

  const grouped = new Map<string, StudentTermFeeRow>();
  for (const r of balRows) {
    const row = r as { term_id?: string | null; total_fees?: number; total_paid?: number; balance?: number };
    const tid = row.term_id;
    if (!tid) continue;
    const tm = termMap.get(tid);
    if (!tm) continue;
    const cur = grouped.get(tid) ?? { ...tm, total_fees: 0, paid: 0, outstanding: 0 };
    cur.total_fees += Number(row.total_fees ?? 0);
    cur.paid += Number(row.total_paid ?? 0);
    cur.outstanding += Math.max(0, Number(row.balance ?? 0));
    grouped.set(tid, cur);
  }

  return [...grouped.values()].sort((a, b) => a.year - b.year || a.term - b.term);
}

export type ChildBalanceSummary = {
  student_id: string;
  name: string;
  current_class: string;
  total_fees: number;
  paid: number;
  outstanding: number;
};

export async function getAllChildrenBalances(
  client: SupabaseClient,
  schoolId: string,
  students: { student_id: string; name: string; current_class: string }[]
): Promise<ChildBalanceSummary[]> {
  return Promise.all(
    students.map(async (s) => {
      const m = await getParentFeeBalanceMetrics(client, schoolId, s.student_id);
      return { ...s, ...m };
    })
  );
}

export async function getStudentsInClass(
  client: SupabaseClient,
  schoolId: string,
  className: string
): Promise<{ student_id: string; name: string }[]> {
  const { data } = await client
    .from('students')
    .select('student_id, name')
    .eq('school_id', schoolId)
    .eq('current_class', className)
    .eq('status', 'active')
    .order('name', { ascending: true });
  return (data || []) as { student_id: string; name: string }[];
}

export type SchoolFinanceSummary = {
  enrolled: number;
  total_fees: number;
  total_paid: number;
  outstanding: number;
  zero_payers: number;
  today_collected: number;
};

export async function getSchoolFinanceSummary(
  client: SupabaseClient,
  schoolId: string
): Promise<SchoolFinanceSummary> {
  const todayIso = schoolCalendarTodayIso();

  const [studRes, balRes, todayRes] = await Promise.all([
    client
      .from('students')
      .select('student_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active'),
    client
      .from('student_balances')
      .select('student_id, total_fees, total_paid, balance')
      .eq('school_id', schoolId),
    client
      .from('student_payments')
      .select('amount_paid')
      .eq('school_id', schoolId)
      .eq('payment_date', todayIso)
      .is('reversed_at', null),
  ]);

  const enrolled = studRes.count ?? 0;

  const byStudent = new Map<string, { total_fees: number; total_paid: number; outstanding: number }>();
  for (const r of balRes.data || []) {
    const row = r as { student_id: string; total_fees?: number; total_paid?: number; balance?: number };
    if (!row.student_id) continue;
    const cur = byStudent.get(row.student_id) ?? { total_fees: 0, total_paid: 0, outstanding: 0 };
    cur.total_fees += Number(row.total_fees ?? 0);
    cur.total_paid += Number(row.total_paid ?? 0);
    cur.outstanding += Math.max(0, Number(row.balance ?? 0));
    byStudent.set(row.student_id, cur);
  }

  let total_fees = 0, total_paid = 0, outstanding = 0, zero_payers = 0;
  for (const v of byStudent.values()) {
    total_fees += v.total_fees;
    total_paid += v.total_paid;
    outstanding += v.outstanding;
    if (v.total_paid === 0 && v.total_fees > 0) zero_payers++;
  }

  const today_collected = (todayRes.data || []).reduce(
    (sum, r) => sum + Number((r as { amount_paid?: number }).amount_paid ?? 0),
    0
  );

  return { enrolled, total_fees, total_paid, outstanding, zero_payers, today_collected };
}

// ── Accountant-specific queries ───────────────────────────────────────────────

export type TodaysPaymentRow = { student_name: string; amount: number; method: string | null; reference: string | null };

export async function getTodaysPayments(
  client: SupabaseClient,
  schoolId: string
): Promise<TodaysPaymentRow[]> {
  const today = schoolCalendarTodayIso();
  const { data, error } = await client
    .from('student_payments')
    .select('student_id, amount_paid, payment_method, receipt_number')
    .eq('school_id', schoolId)
    .eq('payment_date', today)
    .is('reversed_at', null)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const rows = (data || []) as { student_id: string; amount_paid?: number; payment_method?: string | null; receipt_number?: string | null }[];
  const ids = [...new Set(rows.map((r) => r.student_id).filter(Boolean))];
  const nameMap = new Map<string, string>();
  if (ids.length > 0) {
    const { data: studs } = await client.from('students').select('student_id, name').in('student_id', ids);
    for (const s of studs || []) {
      const row = s as { student_id: string; name?: string };
      nameMap.set(row.student_id, row.name || '—');
    }
  }
  return rows.map((r) => ({
    student_name: nameMap.get(r.student_id) || '—',
    amount: Math.max(0, Number(r.amount_paid ?? 0)),
    method: r.payment_method || null,
    reference: r.receipt_number || null,
  }));
}

export async function getExpensesSummaryThisMonth(
  client: SupabaseClient,
  schoolId: string
): Promise<{ total: number; count: number; month_label: string }> {
  const today = schoolCalendarTodayIso();
  const startOfMonth = today.slice(0, 7) + '-01';
  const month_label = new Date(today + 'T12:00:00Z').toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
  const { data, error } = await client
    .from('school_expenses')
    .select('amount')
    .eq('school_id', schoolId)
    .gte('expense_date', startOfMonth)
    .lte('expense_date', today);
  if (error) throw new Error(error.message);
  const total = (data || []).reduce((s, r) => s + Math.max(0, Number((r as { amount?: number }).amount ?? 0)), 0);
  return { total, count: (data || []).length, month_label };
}

// ── Secretary-specific queries ────────────────────────────────────────────────

export async function getStudentsSummaryByClass(
  client: SupabaseClient,
  schoolId: string
): Promise<{ total: number; byClass: { class_name: string; count: number }[] }> {
  const { data, error } = await client
    .from('students')
    .select('current_class')
    .eq('school_id', schoolId)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
  const classMap = new Map<string, number>();
  for (const r of data || []) {
    const cls = ((r as { current_class?: string }).current_class || 'Unknown').trim();
    classMap.set(cls, (classMap.get(cls) ?? 0) + 1);
  }
  const byClass = [...classMap.entries()]
    .map(([class_name, count]) => ({ class_name, count }))
    .sort((a, b) => a.class_name.localeCompare(b.class_name));
  return { total: byClass.reduce((s, c) => s + c.count, 0), byClass };
}

export async function getClassesWithOutstandingCounts(
  client: SupabaseClient,
  schoolId: string
): Promise<{ class_name: string; count: number }[]> {
  const { data: balRows } = await client
    .from('student_balances')
    .select('student_id, balance')
    .eq('school_id', schoolId);
  const studentBalMap = new Map<string, number>();
  for (const r of balRows || []) {
    const row = r as { student_id: string; balance?: number };
    studentBalMap.set(row.student_id, (studentBalMap.get(row.student_id) ?? 0) + Math.max(0, Number(row.balance ?? 0)));
  }
  const withBalance = [...studentBalMap.entries()].filter(([, b]) => b > 0).map(([id]) => id);
  if (withBalance.length === 0) return [];
  const { data: studs } = await client
    .from('students')
    .select('student_id, current_class')
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .in('student_id', withBalance);
  const classCount = new Map<string, number>();
  for (const s of studs || []) {
    const cls = ((s as { current_class?: string }).current_class || 'Unknown').trim();
    classCount.set(cls, (classCount.get(cls) ?? 0) + 1);
  }
  return [...classCount.entries()]
    .map(([class_name, count]) => ({ class_name, count }))
    .sort((a, b) => a.class_name.localeCompare(b.class_name));
}

export type StudentOutstandingRow = { name: string; outstanding: number };

export async function getStudentsWithOutstandingInClass(
  client: SupabaseClient,
  schoolId: string,
  className: string
): Promise<StudentOutstandingRow[]> {
  const { data: studs } = await client
    .from('students')
    .select('student_id, name')
    .eq('school_id', schoolId)
    .eq('current_class', className)
    .eq('status', 'active');
  if (!studs?.length) return [];
  const rows = studs as { student_id: string; name?: string }[];
  const ids = rows.map((s) => s.student_id);
  const { data: balRows } = await client
    .from('student_balances')
    .select('student_id, balance')
    .eq('school_id', schoolId)
    .in('student_id', ids);
  const balMap = new Map<string, number>();
  for (const r of balRows || []) {
    const b = r as { student_id: string; balance?: number };
    balMap.set(b.student_id, (balMap.get(b.student_id) ?? 0) + Math.max(0, Number(b.balance ?? 0)));
  }
  return rows
    .map((s) => ({ name: s.name || '—', outstanding: balMap.get(s.student_id) ?? 0 }))
    .filter((s) => s.outstanding > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type StaffListRow = { name: string; role: string };

export async function getSchoolStaffList(
  client: SupabaseClient,
  schoolId: string
): Promise<StaffListRow[]> {
  const [{ data: users }, { data: teachers }] = await Promise.all([
    client.from('users').select('name, role, user_id').eq('school_id', schoolId),
    client.from('teachers').select('name, user_id').eq('school_id', schoolId),
  ]);
  const result: StaffListRow[] = [];
  const linkedUserIds = new Set<string>();
  for (const u of users || []) {
    const row = u as { name?: string; role?: string; user_id?: string };
    result.push({ name: row.name || '—', role: row.role || 'staff' });
    if (row.user_id) linkedUserIds.add(row.user_id);
  }
  for (const t of teachers || []) {
    const row = t as { name?: string; user_id?: string };
    if (!row.user_id || !linkedUserIds.has(row.user_id)) {
      result.push({ name: row.name || '—', role: 'teacher' });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export type VisitorLogRow = {
  visitor_name: string;
  purpose: string;
  host_name: string;
  check_in_time: string;
  check_out_time: string | null;
};

export async function getVisitorLogForRange(
  client: SupabaseClient,
  schoolId: string,
  startIso: string,
  endIso: string
): Promise<VisitorLogRow[]> {
  const { data, error } = await client
    .from('visitor_log')
    .select('visitor_name, purpose, host_name, check_in_time, check_out_time')
    .eq('school_id', schoolId)
    .gte('check_in_time', startIso)
    .lte('check_in_time', endIso + 'T23:59:59')
    .order('check_in_time', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []) as VisitorLogRow[];
}
