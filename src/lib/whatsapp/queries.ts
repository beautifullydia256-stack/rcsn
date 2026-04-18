import type { SupabaseClient } from '@supabase/supabase-js';
import { loadStudentBalanceAggAllTerms } from '../adminFinanceTerm';
import { studentAttendanceRowIsPresent } from '../studentAttendanceRow';

export async function getParentFeeSummary(
  client: SupabaseClient,
  schoolId: string,
  studentId: string
): Promise<string> {
  const agg = await loadStudentBalanceAggAllTerms(client, schoolId, studentId);
  const bal = Math.max(0, Number(agg.balance || 0));
  const paid = Math.max(0, Number(agg.total_paid || 0));
  const fees = Math.max(0, Number(agg.total_fees || 0));
  const fmt = (n: number) => `UGX ${Math.round(n).toLocaleString('en-UG')}`;
  return (
    `Fees summary\n` +
    `Total fees (all terms): ${fmt(fees)}\n` +
    `Paid: ${fmt(paid)}\n` +
    `Outstanding: ${fmt(bal)}`
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

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const x = new Date(d);
  x.setDate(d.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export async function getParentAttendanceSummary(
  client: SupabaseClient,
  schoolId: string,
  studentId: string,
  kind: 'today' | 'week' | 'date',
  dateIso?: string
): Promise<string> {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  let start = iso(today);
  let end = start;
  if (kind === 'week') {
    start = iso(startOfWeekMonday(today));
    end = iso(endOfWeekSunday(today));
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

export async function getStaffAttendanceStats(
  client: SupabaseClient,
  schoolId: string,
  dateIso: string,
  scope: AttendanceScope,
  classNames: string[] | null
): Promise<{ present: number; absent: number; absentNames: string[] }> {
  let studentIds: string[] | null = null;
  if (scope === 'classes' && classNames && classNames.length > 0) {
    const { data: studs } = await client
      .from('students')
      .select('student_id, name, current_class')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .in('current_class', classNames);
    studentIds = (studs || []).map((s: { student_id: string }) => s.student_id);
    if (studentIds.length === 0) return { present: 0, absent: 0, absentNames: [] };
  }

  let q = client
    .from('student_attendance')
    .select('student_id, present, status')
    .eq('school_id', schoolId)
    .eq('attendance_date', dateIso);

  if (studentIds) q = q.in('student_id', studentIds);
  const { data: rows } = await q;

  const list = (rows || []) as { student_id: string; present?: boolean; status?: string }[];
  let present = 0;
  let absent = 0;
  const absentIds: string[] = [];
  for (const r of list) {
    if (studentAttendanceRowIsPresent(r)) {
      present++;
    } else {
      absent++;
      absentIds.push(r.student_id);
    }
  }

  let absentNames: string[] = [];
  if (absentIds.length > 0 && absentIds.length <= 40) {
    const { data: names } = await client
      .from('students')
      .select('student_id, name')
      .eq('school_id', schoolId)
      .in('student_id', absentIds);
    absentNames = (names || []).map((x: { name: string }) => x.name).filter(Boolean);
  }
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
