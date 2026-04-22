import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SchoolPayIngestKind, SchoolPayPaymentRecord } from './types.js';

type BalanceRow = {
  term_id: string;
  term: number;
  year: number;
  total_fees?: number | string | null;
  total_paid?: number | string | null;
  balance?: number | string | null;
};

type OutstandingRow = { term_id: string; term: number; year: number; balance: number };

function termOutstandingFromRow(r: {
  total_fees?: number | string | null;
  total_paid?: number | string | null;
  balance?: number | string | null;
}): number {
  const fees = Number(r.total_fees ?? 0);
  const paid = Number(r.total_paid ?? 0);
  if (Number.isFinite(fees) && Number.isFinite(paid)) {
    return Math.max(0, fees - paid);
  }
  return Math.max(0, Number(r.balance ?? 0));
}

function mergeTermBalanceRows(raw: BalanceRow[]): { term_id: string; term: number; year: number; balance: number }[] {
  const m = new Map<string, { term_id: string; term: number; year: number; balance: number }>();
  for (const r of raw) {
    const bal = termOutstandingFromRow(r);
    if (bal <= 0) continue;
    const ex = m.get(r.term_id);
    if (!ex) {
      m.set(r.term_id, { term_id: r.term_id, term: r.term, year: r.year, balance: bal });
    } else {
      m.set(r.term_id, { ...ex, balance: ex.balance + bal });
    }
  }
  return [...m.values()].sort((a, b) => a.year - b.year || a.term - b.term);
}

function sortOutstandingForPayment(rows: OutstandingRow[]): OutstandingRow[] {
  return [...rows].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.term - b.term));
}

export function parseSchoolPayAmount(raw: string | number | undefined): number {
  if (raw === undefined || raw === null) return NaN;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim());
  return n;
}

export function paymentDateIsoFromSchoolPay(p: SchoolPayPaymentRecord): string {
  const s = p.paymentDateAndTime || p.transactionCompletionDateAndTime || '';
  const d = s.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return new Date().toISOString().slice(0, 10);
}

async function fetchOutstandingForStudent(
  service: SupabaseClient,
  schoolId: string,
  studentId: string
): Promise<OutstandingRow[]> {
  const { data, error } = await service
    .from('student_balances')
    .select('term_id, term, year, total_fees, total_paid, balance')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .order('year', { ascending: true })
    .order('term', { ascending: true });
  if (error) throw error;
  const merged = mergeTermBalanceRows((data || []) as BalanceRow[]);
  return sortOutstandingForPayment(
    merged.map((r) => ({
      term_id: r.term_id,
      term: r.term,
      year: r.year,
      balance: r.balance,
    }))
  );
}

async function resolveTermIdOnDate(
  service: SupabaseClient,
  schoolId: string,
  dateIso: string
): Promise<string | null> {
  const { data: termId, error } = await service.rpc('resolve_current_school_term_id', {
    p_school_id: schoolId,
    p_today: dateIso,
  });
  if (error) return null;
  if (termId && typeof termId === 'string') return termId;
  const { data: fallback } = await service
    .from('school_terms')
    .select('id')
    .eq('school_id', schoolId)
    .lte('start_date', dateIso)
    .gte('end_date', dateIso)
    .maybeSingle();
  return (fallback as { id?: string } | null)?.id ?? null;
}

async function findStudentId(service: SupabaseClient, schoolId: string, codeRaw: string): Promise<string | null> {
  const code = codeRaw.trim();
  if (!code) return null;

  const { data: byExact } = await service
    .from('students')
    .select('student_id')
    .eq('school_id', schoolId)
    .eq('schoolpay_payment_code', code)
    .maybeSingle();
  if (byExact?.student_id) return byExact.student_id as string;

  const { data: withCode } = await service
    .from('students')
    .select('student_id, schoolpay_payment_code')
    .eq('school_id', schoolId)
    .not('schoolpay_payment_code', 'is', null);
  for (const r of withCode || []) {
    const row = r as { student_id: string; schoolpay_payment_code: string | null };
    if (String(row.schoolpay_payment_code ?? '').trim().toLowerCase() === code.toLowerCase()) {
      return row.student_id;
    }
  }

  const { data: byAdm } = await service
    .from('students')
    .select('student_id')
    .eq('school_id', schoolId)
    .ilike('admission_number', code)
    .maybeSingle();
  if (byAdm?.student_id) return byAdm.student_id as string;

  const norm = code.replace(/^0+/, '') || code;
  if (norm !== code) {
    const { data: byAdm2 } = await service
      .from('students')
      .select('student_id')
      .eq('school_id', schoolId)
      .ilike('admission_number', norm)
      .maybeSingle();
    if (byAdm2?.student_id) return byAdm2.student_id as string;
  }

  return null;
}

async function loadInvoiceMap(
  service: SupabaseClient,
  schoolId: string,
  studentId: string,
  termIds: string[]
): Promise<Map<string, string>> {
  if (termIds.length === 0) return new Map();
  const { data: invoices } = await service
    .from('student_invoices')
    .select('term_id, invoice_id')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .in('term_id', termIds)
    .in('status', ['issued', 'partial', 'paid'])
    .order('is_supplementary', { ascending: true })
    .order('created_at', { ascending: true });
  const countByTerm = new Map<string, number>();
  for (const inv of invoices || []) {
    const tid = (inv as { term_id: string }).term_id;
    countByTerm.set(tid, (countByTerm.get(tid) ?? 0) + 1);
  }
  const invoiceByTerm = new Map<string, string>();
  for (const inv of invoices || []) {
    const row = inv as { term_id: string; invoice_id: string };
    if (countByTerm.get(row.term_id) === 1) invoiceByTerm.set(row.term_id, row.invoice_id);
  }
  return invoiceByTerm;
}

export type IngestResult =
  | { ok: true; duplicate?: boolean; paymentIds: string[] }
  | { ok: false; code: string; message?: string };

function payloadHash(payment: SchoolPayPaymentRecord, kind: SchoolPayIngestKind): string {
  return createHash('sha256')
    .update(JSON.stringify({ kind, ...payment }), 'utf8')
    .digest('hex');
}

function isCompleted(p: SchoolPayPaymentRecord): boolean {
  const s = (p.transactionCompletionStatus || '').trim().toLowerCase();
  return !s || s === 'completed';
}

/**
 * Posts SchoolPay funds into student_payments (invoice-driven). Idempotent by receipt number.
 */
export async function ingestSchoolPayPayment(
  service: SupabaseClient,
  opts: {
    schoolId: string;
    kind: SchoolPayIngestKind;
    payment: SchoolPayPaymentRecord;
  }
): Promise<IngestResult> {
  const { schoolId, kind, payment } = opts;
  const receipt = String(payment.schoolpayReceiptNumber ?? '').trim();
  if (!receipt) {
    return { ok: false, code: 'missing_receipt', message: 'schoolpayReceiptNumber required' };
  }
  if (!isCompleted(payment)) {
    return { ok: false, code: 'not_completed', message: payment.transactionCompletionStatus };
  }

  const { data: existing } = await service
    .from('schoolpay_ingested_events')
    .select('id')
    .eq('school_id', schoolId)
    .eq('schoolpay_receipt_number', receipt)
    .maybeSingle();
  if (existing) {
    return { ok: true, duplicate: true, paymentIds: [] };
  }

  const amount = parseSchoolPayAmount(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: 'bad_amount', message: String(payment.amount) };
  }

  const studentPaymentCode = String(payment.studentPaymentCode ?? '').trim();
  const studentId = await findStudentId(service, schoolId, studentPaymentCode);
  if (!studentId) {
    return { ok: false, code: 'student_not_found', message: studentPaymentCode };
  }

  const payDate = paymentDateIsoFromSchoolPay(payment);
  const channel = String(payment.sourcePaymentChannel ?? '').trim();
  const notes = [
    'SchoolPay',
    kind === 'OTHER_FEES' ? `Other fees${payment.supplementaryFeeDescription ? `: ${payment.supplementaryFeeDescription}` : ''}` : 'School fees',
    channel ? channel : null,
    payment.studentName ? `Payer/student name: ${payment.studentName}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const txnRef = String(payment.sourceChannelTransactionId ?? '').trim() || null;
  const hash = payloadHash(payment, kind);

  const { data: claimed, error: claimErr } = await service
    .from('schoolpay_ingested_events')
    .insert({
      school_id: schoolId,
      schoolpay_receipt_number: receipt,
      source_channel_transaction_id: txnRef,
      payload_hash: hash,
    })
    .select('id')
    .single();

  if (claimErr) {
    if (claimErr.code === '23505') {
      return { ok: true, duplicate: true, paymentIds: [] };
    }
    return { ok: false, code: 'claim_failed', message: claimErr.message };
  }

  const ingestedId = (claimed as { id: string }).id;
  if (!ingestedId) {
    return { ok: true, duplicate: true, paymentIds: [] };
  }

  try {
    let allocations: { term_id: string; term: number; year: number; amount: number }[] = [];

    if (kind === 'SCHOOL_FEES') {
      const sorted = await fetchOutstandingForStudent(service, schoolId, studentId);
      if (sorted.length === 0) {
        const termId = await resolveTermIdOnDate(service, schoolId, payDate);
        if (!termId) {
          await service.from('schoolpay_ingested_events').delete().eq('id', ingestedId);
          return { ok: false, code: 'no_term', message: 'No outstanding balance and no term for payment date' };
        }
        const { data: st } = await service.from('school_terms').select('term, year').eq('id', termId).maybeSingle();
        allocations = [{ term_id: termId, term: Number(st?.term ?? 1), year: Number(st?.year ?? new Date().getFullYear()), amount }];
      } else {
        let remaining = amount;
        for (const row of sorted) {
          if (remaining <= 0) break;
          const apply = Math.min(remaining, row.balance);
          if (apply <= 0) continue;
          allocations.push({ term_id: row.term_id, term: row.term, year: row.year, amount: apply });
          remaining -= apply;
        }
        if (remaining > 0.01) {
          const lastRow = sorted[sorted.length - 1];
          if (allocations.length === 0) {
            allocations.push({ term_id: lastRow.term_id, term: lastRow.term, year: lastRow.year, amount });
          } else {
            const lastAlloc = allocations[allocations.length - 1];
            if (lastAlloc.term_id === lastRow.term_id) {
              lastAlloc.amount += remaining;
            } else {
              allocations.push({
                term_id: lastRow.term_id,
                term: lastRow.term,
                year: lastRow.year,
                amount: remaining,
              });
            }
          }
        }
      }
    } else {
      const termId = await resolveTermIdOnDate(service, schoolId, payDate);
      if (!termId) {
        await service.from('schoolpay_ingested_events').delete().eq('id', ingestedId);
        return { ok: false, code: 'no_term', message: 'Could not resolve term for payment date' };
      }
      const { data: st } = await service.from('school_terms').select('term, year').eq('id', termId).maybeSingle();
      allocations = [
        {
          term_id: termId,
          term: Number(st?.term ?? 1),
          year: Number(st?.year ?? new Date().getFullYear()),
          amount,
        },
      ];
    }

    const termIds = [...new Set(allocations.map((a) => a.term_id))];
    const invoiceByTerm = await loadInvoiceMap(service, schoolId, studentId, termIds);

    const sortedBalances = await fetchOutstandingForStudent(service, schoolId, studentId);
    const maxDueNow = sortedBalances.reduce((s, b) => s + b.balance, 0);
    const totalRemaining = Math.max(0, maxDueNow - amount);

    const paymentIds: string[] = [];
    for (const a of allocations) {
      const payload: Record<string, unknown> = {
        school_id: schoolId,
        student_id: studentId,
        amount: a.amount,
        amount_paid: a.amount,
        payment_method: 'school_pay',
        payment_date: payDate,
        recorded_by: null,
        notes,
        receipt_number: receipt,
        receipt_total_remaining_balance: totalRemaining,
        transaction_ref: txnRef,
        term_id: a.term_id,
      };
      const invId = invoiceByTerm.get(a.term_id);
      if (invId) payload.invoice_id = invId;
      const { data: ins, error: insErr } = await service.from('student_payments').insert(payload).select('payment_id').single();
      if (insErr) throw insErr;
      paymentIds.push((ins as { payment_id: string }).payment_id);
    }

    const firstId = paymentIds[0] ?? null;
    await service
      .from('schoolpay_ingested_events')
      .update({ student_payment_id: firstId })
      .eq('id', ingestedId);

    return { ok: true, paymentIds };
  } catch (e) {
    await service.from('schoolpay_ingested_events').delete().eq('id', ingestedId);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, code: 'insert_failed', message: msg };
  }
}
