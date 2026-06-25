/**
 * POS-style Record Payment modal. Renders on top of current view; no route change.
 * Opened from dashboard (or layout); Esc and overlay close it.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { RECEIPTS_QUERY_KEY } from "../../pages/accountant/api/receipts";
import { resolveCurrentSchoolTerm } from "../../lib/adminFinanceTerm";
import { schoolCalendarTodayIso } from "../../lib/schoolCalendarDate";
import { useAuthStore } from "../../store/authStore";
import { enqueue } from "../../lib/offlineDb";
import {
  PaymentReceipt,
  formatReceiptDateTime,
  schoolRowToReceiptHeader,
  type PaymentReceiptData,
  type SchoolBrandingRow,
} from "./PaymentReceipt";
import { Receipt, X } from "lucide-react";

type OutstandingBalanceRow = { kind: "term"; term_id: string; term: number; year: number; balance: number };

type CurrentTermRow = { id: string; term: number; year: number; start_date?: string; end_date?: string };

type PaymentAllocation = { kind: "term"; term_id: string; term: number; year: number; amount: number };

/** Term balances: oldest term first. */
function sortOutstandingForPayment(rows: OutstandingBalanceRow[]): OutstandingBalanceRow[] {
  return [...rows].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.term - b.term));
}

function buildOutstandingRows(termRows: { term_id: string; term: number; year: number; balance: number }[]): OutstandingBalanceRow[] {
  const terms: OutstandingBalanceRow[] = termRows.map((r) => ({
    kind: "term" as const,
    term_id: r.term_id,
    term: r.term,
    year: r.year,
    balance: Number(r.balance),
  }));
  return sortOutstandingForPayment(terms);
}

/** Outstanding from fees minus paid (same definition as a healthy `balance` column). Do not trust `balance` alone — it can drift if not rewritten when `total_paid` changes. */
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

/** If duplicate `student_balances` rows exist per term, combine so allocation runs once per term. */
function mergeTermBalanceRows(
  raw: {
    term_id: string;
    term: number;
    year: number;
    total_fees?: number | string | null;
    total_paid?: number | string | null;
    balance?: number | string | null;
  }[]
): { term_id: string; term: number; year: number; balance: number }[] {
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

/** Authoritative snapshot for payment allocation — always use this when posting, not stale React state. */
async function fetchOutstandingRowsForRecordPayment(
  schoolId: string,
  studentId: string
): Promise<{ rows: OutstandingBalanceRow[]; errorMessage: string | null }> {
  const balRes = await supabase
    .from("student_balances")
    .select("term_id, term, year, total_fees, total_paid, balance")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .order("year", { ascending: true })
    .order("term", { ascending: true });
  if (balRes.error?.message) return { rows: [], errorMessage: balRes.error.message };
  const merged = mergeTermBalanceRows(
    (balRes.data || []) as {
      term_id: string;
      term: number;
      year: number;
      total_fees?: number | string | null;
      total_paid?: number | string | null;
      balance?: number | string | null;
    }[]
  );
  const rows = buildOutstandingRows(merged);
  return { rows, errorMessage: null };
}

export type RecordPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  initialStudentId?: string;
};

export default function RecordPaymentModal({ open, onClose, initialStudentId }: RecordPaymentModalProps) {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const userEmail = useAuthStore((s) => s.user?.email ?? "");
  const userName = useAuthStore((s) => (s.user?.user_metadata as { full_name?: string })?.full_name ?? "");
  const [students, setStudents] = useState<{ student_id: string; name: string; current_class: string; status?: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; term: number; year: number }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [outstandingBalances, setOutstandingBalances] = useState<OutstandingBalanceRow[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchFocused, setStudentSearchFocused] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<CurrentTermRow | null>(null);
  /** Main term fee invoice only (matches Invoices & Billing); null = still checking. */
  const [hasMainTermInvoice, setHasMainTermInvoice] = useState<boolean | null>(null);
  const [currentTermFee, setCurrentTermFee] = useState<number | null>(null);
  const [boardingType, setBoardingType] = useState<'Day Scholar' | 'Boarding'>('Day Scholar');
  const [bursaryType, setBursaryType] = useState<'none' | '50' | '100' | 'custom'>('none');
  const [bursaryCustomPct, setBursaryCustomPct] = useState('');
  const [activatingInvoice, setActivatingInvoice] = useState(false);
  const [schoolLetterhead, setSchoolLetterhead] = useState(() => schoolRowToReceiptHeader(null));
  const paymentSubmitLockRef = useRef(false);

  useEffect(() => {
    if (open && initialStudentId) setSelectedStudent(initialStudentId);
  }, [open, initialStudentId]);

  useEffect(() => {
    if (!open || !schoolId) return;
    void (async () => {
      // Run all initial fetches in parallel — including resolveCurrentSchoolTerm.
      // Previously resolveCurrentSchoolTerm ran sequentially AFTER Promise.all, meaning
      // a fast user could select a student before currentTerm was set, causing the
      // balance effect to fire twice (once with null term, once with real term).
      const [sRes, tRes, balRes, schoolRes, cur] = await Promise.all([
        supabase.from("students").select("student_id, name, current_class, status").eq("school_id", schoolId).eq("status", "active").order("name"),
        supabase.from("school_terms").select("id, term, year, start_date, end_date").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false }),
        supabase.from("student_balances").select("student_id").eq("school_id", schoolId).gt("balance", 0),
        supabase.from("schools").select("name, contact_phone, contact_email").eq("school_id", schoolId).single(),
        resolveCurrentSchoolTerm(supabase, schoolId),
      ]);
      const school = (schoolRes.data as SchoolBrandingRow | null) ?? null;
      setSchoolLetterhead(schoolRowToReceiptHeader(school));
      const active = (sRes.data || []) as { student_id: string; name: string; current_class: string; status?: string }[];
      const termList = (tRes.data || []) as { id: string; term: number; year: number }[];
      setTerms(termList);
      setCurrentTerm(
        cur
          ? {
              id: cur.id,
              term: cur.term ?? 1,
              year: cur.year ?? new Date().getFullYear(),
              start_date: cur.start_date ?? undefined,
              end_date: cur.end_date ?? undefined,
            }
          : null
      );
      const owingIds = new Set<string>([...(balRes.data || []).map((b: { student_id: string }) => b.student_id)]);
      const debtorIds = [...owingIds].filter((id) => !active.some((s) => s.student_id === id));
      if (debtorIds.length > 0) {
        const { data: debtors } = await supabase
          .from("students")
          .select("student_id, name, current_class, status")
          .eq("school_id", schoolId)
          .in("student_id", debtorIds);
        setStudents([...active, ...(debtors || [])].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setStudents(active);
      }
    })();
  }, [open, schoolId]);

  useEffect(() => {
    if (!schoolId || !selectedStudent) {
      setOutstandingBalances([]);
      setHasMainTermInvoice(null);
      setCurrentTermFee(null);
      return;
    }
    let cancelled = false;
    setBalancesLoading(true);
    setOutstandingBalances([]);
    setHasMainTermInvoice(null);
    setCurrentTermFee(null);
    void (async () => {
      try {
        const [outResult, invRes, stRes] = await Promise.all([
          fetchOutstandingRowsForRecordPayment(schoolId, selectedStudent),
          currentTerm
            ? supabase
                .from("student_invoices")
                .select("invoice_id")
                .eq("school_id", schoolId)
                .eq("student_id", selectedStudent)
                .eq("term_id", currentTerm.id)
                .eq("is_supplementary", false)
                .neq("status", "cancelled")
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase.from("students").select("current_class").eq("school_id", schoolId).eq("student_id", selectedStudent).maybeSingle(),
        ]);
        if (cancelled) return;

        const inv = invRes as { data: { invoice_id?: string } | null; error: { message?: string } | null };
        const hasMain =
          !!currentTerm && !inv.error && !!inv.data?.invoice_id;
        if (!cancelled) {
          setHasMainTermInvoice(currentTerm ? hasMain : null);
        }

        if (outResult.errorMessage) {
          setMessage("Could not load balances: " + outResult.errorMessage);
          setOutstandingBalances([]);
        } else {
          setOutstandingBalances(outResult.rows);
        }

        if (currentTerm) {
          const cls = (stRes.data as { current_class?: string } | null)?.current_class;
          if (!cls) {
            if (!cancelled) setCurrentTermFee(null);
          } else {
            // Get fee based on boarding type
            const feeColumn = boardingType === 'Boarding' ? 'boarding_amount' : 'tuition_amount';
            const { data: feeRow } = await supabase
              .from("school_fee_structure")
              .select(`tuition_amount, boarding_amount`)
              .eq("school_id", schoolId)
              .eq("class_name", cls)
              .maybeSingle();
            if (!cancelled) {
              const feeAmount = boardingType === 'Boarding' 
                ? feeRow?.boarding_amount 
                : feeRow?.tuition_amount;
              setCurrentTermFee(feeAmount != null ? Number(feeAmount) : null);
            }
          }
        }
      } finally {
        if (!cancelled) setBalancesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, selectedStudent, currentTerm, boardingType]);

  const totalDue = outstandingBalances.reduce((sum, b) => sum + b.balance, 0);
  const canRecordPayment = totalDue > 0 && Number(amount) > 0;
  const selectedStudentRow = students.find((s) => s.student_id === selectedStudent);

  const isGraduated = selectedStudentRow?.status === "graduated";
  /** Ledger already expects this term fees (shows in outstanding); don't duplicate "activate main invoice". */
  const hasCurrentTermPayableBalance =
    !!currentTerm &&
    outstandingBalances.some((b) => b.kind === "term" && b.term_id === currentTerm.id && b.balance > 0);
  const showActivateCurrentTerm =
    !!currentTerm &&
    hasMainTermInvoice === false &&
    !balancesLoading &&
    !!selectedStudent &&
    !isGraduated &&
    !hasCurrentTermPayableBalance;

  const bursaryPct =
    bursaryType === 'none' ? 0
    : bursaryType === '50' ? 50
    : bursaryType === '100' ? 100
    : Math.min(100, Math.max(0, Number(bursaryCustomPct) || 0));

  const effectiveFeeAmount =
    currentTermFee != null ? Math.round(currentTermFee * (1 - bursaryPct / 100)) : null;

  async function handleActivateCurrentTermInvoice() {
    if (!schoolId || !userId || !selectedStudent || !currentTerm || !selectedStudentRow) return;
    if (currentTermFee == null) {
      setMessage("No fee set for this class. Add it in Invoices & Billing or Admin → Settings → Financial.");
      return;
    }
    const invoiceAmount = effectiveFeeAmount ?? 0;
    setActivatingInvoice(true);
    setMessage("");
    try {
      let invNum: string | null = null;
      try {
        const res = await supabase.rpc("get_next_invoice_number", { p_school_id: schoolId });
        invNum = res.data ?? null;
      } catch {
        invNum = "INV-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
      }
      // The unique index is partial (WHERE is_supplementary=false AND status!='cancelled'),
      // so onConflict with column names alone doesn't work. Do select-then-update-or-insert.
      const { data: existingInv } = await supabase
        .from("student_invoices")
        .select("invoice_id")
        .eq("school_id", schoolId)
        .eq("student_id", selectedStudent)
        .eq("term_id", currentTerm.id)
        .eq("is_supplementary", false)
        .neq("status", "cancelled")
        .maybeSingle();
      let invErr;
      if (existingInv) {
        ({ error: invErr } = await supabase
          .from("student_invoices")
          .update({
            total_amount: invoiceAmount,
            bursary_discount: bursaryPct,
            status: "issued",
            updated_at: new Date().toISOString(),
          })
          .eq("invoice_id", existingInv.invoice_id));
      } else {
        ({ error: invErr } = await supabase.from("student_invoices").insert({
          school_id: schoolId,
          student_id: selectedStudent,
          term_id: currentTerm.id,
          total_amount: invoiceAmount,
          bursary_discount: bursaryPct,
          status: "issued",
          invoice_number: invNum,
          is_supplementary: false,
          created_by: userId,
          updated_at: new Date().toISOString(),
        }));
      }
      if (invErr) throw invErr;
      const { data: invVerify } = await supabase
        .from("student_invoices")
        .select("invoice_id, invoice_number")
        .eq("school_id", schoolId)
        .eq("student_id", selectedStudent)
        .eq("term_id", currentTerm.id)
        .eq("is_supplementary", false)
        .neq("status", "cancelled")
        .maybeSingle();
      if (!invVerify) throw new Error("Invoice was not created. Please try again.");
      const { data: existing } = await supabase
        .from("student_balances")
        .select("total_paid")
        .eq("student_id", selectedStudent)
        .eq("term_id", currentTerm.id)
        .maybeSingle();
      const totalPaid = (existing as { total_paid?: number } | null)?.total_paid ?? 0;
      const { error: balErr } = await supabase.from("student_balances").upsert(
        {
          student_id: selectedStudent,
          school_id: schoolId,
          term_id: currentTerm.id,
          year: currentTerm.year,
          term: currentTerm.term,
          total_fees: invoiceAmount,
          total_paid: Number(totalPaid),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,term_id" }
      );
      if (balErr) throw balErr;
      
      // Update student's boarding type
      const { error: studentUpdateErr } = await supabase
        .from("students")
        .update({ boarding_type: boardingType })
        .eq("student_id", selectedStudent)
        .eq("school_id", schoolId);
      if (studentUpdateErr) throw studentUpdateErr;
      
      setHasMainTermInvoice(true);
      setMessage("Current term invoice activated. Refreshing balances…");
      const outResult = await fetchOutstandingRowsForRecordPayment(schoolId, selectedStudent);
      if (!outResult.errorMessage) setOutstandingBalances(outResult.rows);
      setMessage("Current term invoice activated. Total due now includes Term " + currentTerm.term + ", " + currentTerm.year + ".");
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : err instanceof Error
            ? err.message
            : "Failed to activate invoice.";
      setMessage(msg);
    } finally {
      setActivatingInvoice(false);
    }
  }

  const q = studentSearchQuery.trim().toLowerCase();
  const studentMatches =
    selectedStudent && !q
      ? []
      : students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.current_class && s.current_class.toLowerCase().includes(q))
        ).slice(0, 12);

  const handleClose = useCallback(() => {
    setReceiptData(null);
    setMessage("");
    setAmount("");
    setNotes("");
    setStudentSearchQuery("");
    setSelectedStudent("");
    setOutstandingBalances([]);
    setBoardingType('Day Scholar');
    setBursaryType('none');
    setBursaryCustomPct('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !userId || !selectedStudent || !amount || Number(amount) <= 0) {
      setMessage("Please select a student and enter an amount.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }
    if (paymentSubmitLockRef.current) return;
    paymentSubmitLockRef.current = true;
    setSubmitting(true);
    setMessage("");

    // Offline: queue the payment — will sync with full invoice allocation when back online
    if (!navigator.onLine) {
      try {
        const now = new Date();
        const ymd = String(now.getFullYear()) + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
        const fallbackReceipt = `${schoolId.replace(/-/g, "").slice(0, 4).toUpperCase()}${ymd}${(Date.now() % 9999) + 1}`;
        await enqueue({
          action: {
            type: "payment",
            table: "student_payments",
            rows: [{
              student_id: selectedStudent,
              school_id: schoolId,
              amount: amt,
              currency: "UGX",
              payment_method: method,
              payment_date: schoolCalendarTodayIso(),
              receipt_number: fallbackReceipt,
              notes: notes || null,
              recorded_by: userId,
            }],
          },
          schoolId,
          createdAt: Date.now(),
        });
        setMessage("Payment saved offline — will sync automatically when you reconnect.");
        setTimeout(() => { handleClose(); }, 2000);
      } finally {
        setSubmitting(false);
        paymentSubmitLockRef.current = false;
      }
      return;
    }

    try {
      const { rows: freshRows, errorMessage: freshErr } = await fetchOutstandingRowsForRecordPayment(schoolId, selectedStudent);
      if (freshErr) {
        setMessage("Could not load current balances: " + freshErr + " Refresh and try again.");
        return;
      }
      if (freshRows.length === 0) {
        setMessage("No outstanding balance for this student right now. Refresh and try again.");
        return;
      }
      const sortedBalances = sortOutstandingForPayment(freshRows);
      const maxDueNow = sortedBalances.reduce((s, b) => s + b.balance, 0);
      if (amt > maxDueNow + 0.01) {
        setMessage(
          "Amount exceeds current total due (" + maxDueNow.toLocaleString() + "). Balances may have changed—check the modal and try again."
        );
        return;
      }
      let remaining = amt;
      const allocations: PaymentAllocation[] = [];
      for (const row of sortedBalances) {
        if (remaining <= 0) break;
        const apply = Math.min(remaining, row.balance);
        if (apply <= 0) continue;
        allocations.push({
          kind: "term",
          term_id: row.term_id,
          term: row.term,
          year: row.year,
          amount: apply,
        });
        remaining -= apply;
      }
      if (allocations.length === 0) {
        setMessage("No amount to apply to outstanding balances.");
        return;
      }
      const allocatedTotal = allocations.reduce((s, a) => s + a.amount, 0);
      if (Math.abs(allocatedTotal - amt) > 0.02) {
        setMessage("Internal allocation mismatch. Please try again or contact support.");
        return;
      }

      const firstTermAlloc = allocations.find((a): a is Extract<PaymentAllocation, { kind: "term" }> => a.kind === "term");
      const receiptTermIdForRpc = firstTermAlloc?.term_id ?? currentTerm?.id ?? terms[0]?.id ?? null;

      let receiptNum: string | null = null;
      if (receiptTermIdForRpc) {
        try {
          const rpcRes = await fetch('/api/admin?action=get-next-receipt-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId, termId: receiptTermIdForRpc }),
          });
          if (rpcRes.ok) {
            const rpcJson = await rpcRes.json();
            receiptNum = rpcJson.receipt_number ?? null;
          }
        } catch {
          receiptNum = null;
        }
      }
      const firstAllocTerm = firstTermAlloc?.term ?? currentTerm?.term ?? 1;
      const now = new Date();
      const ymd =
        String(now.getFullYear()) +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0");
      const codeFallback = schoolId.replace(/-/g, "").slice(0, 4).toUpperCase();
      const seqFallback = Math.max(1, (Date.now() % 9998) + 1);
      const receiptNumberForPayments =
        receiptNum ?? `${codeFallback}${ymd}${firstAllocTerm * 10000 + seqFallback}`;

      const termIds = allocations.filter((a): a is Extract<PaymentAllocation, { kind: "term" }> => a.kind === "term").map((a) => a.term_id);
      const { data: invoices } =
        termIds.length > 0
          ? await supabase
              .from("student_invoices")
              .select("term_id, invoice_id")
              .eq("school_id", schoolId)
              .eq("student_id", selectedStudent)
              .in("term_id", termIds)
              .in("status", ["issued", "partial", "paid"])
              .order("is_supplementary", { ascending: true })
              .order("created_at", { ascending: true })
          : { data: [] };
      const countByTerm = new Map<string, number>();
      for (const inv of invoices || []) {
        const tid = (inv as { term_id: string }).term_id;
        countByTerm.set(tid, (countByTerm.get(tid) ?? 0) + 1);
      }
      const invoiceByTerm = new Map<string, string>();
      for (const inv of invoices || []) {
        const row = inv as { term_id: string; invoice_id: string };
        if (countByTerm.get(row.term_id) === 1) {
          invoiceByTerm.set(row.term_id, row.invoice_id);
        }
      }

      const paymentDate = schoolCalendarTodayIso();
      const totalRemaining = Math.max(0, maxDueNow - amt);
      for (const a of allocations) {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          student_id: selectedStudent,
          amount: a.amount,
          amount_paid: a.amount,
          payment_method: method,
          payment_date: paymentDate,
          recorded_by: userId,
          notes: notes || null,
          receipt_number: receiptNumberForPayments,
          receipt_total_remaining_balance: totalRemaining,
        };
        payload.term_id = a.term_id;
        const invId = invoiceByTerm.get(a.term_id);
        if (invId) payload.invoice_id = invId;
        const { error } = await supabase.from("student_payments").insert(payload);
        if (error) throw error;
      }
      const allocationLines = allocations.map((a) => ({
        termLabel: `Term ${a.term}, ${a.year}`,
        amountApplied: a.amount,
      }));
      const studentRow = students.find((s) => s.student_id === selectedStudent);
      const { data: firstPayRow } = await supabase
        .from("student_payments")
        .select("created_at")
        .eq("school_id", schoolId)
        .eq("receipt_number", receiptNumberForPayments)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const transactionTime =
        firstPayRow?.created_at != null
          ? formatReceiptDateTime(new Date(firstPayRow.created_at as string))
          : formatReceiptDateTime(new Date());
      const { data: userRow } = await supabase.from("users").select("name").eq("user_id", userId).single();
      const recordedByName = (userRow as { name?: string } | null)?.name?.trim() || userName || userEmail || "Staff";
      setReceiptData({
        ...schoolLetterhead,
        receiptNumber: receiptNumberForPayments,
        studentName: studentRow?.name ?? "—",
        studentClass: studentRow?.current_class ?? "—",
        termLabel: allocationLines.length === 1 ? allocationLines[0].termLabel : "Multiple terms",
        amountPaid: amt,
        paymentMethod: method,
        transactionTime,
        recordedBy: recordedByName,
        description: notes || undefined,
        allocations: allocationLines,
        totalRemainingBalance: totalRemaining,
      });
      setMessage("Payment recorded.");
      setAmount("");
      setNotes("");
      setStudentSearchQuery("");
      setSelectedStudent("");
      setOutstandingBalances([]);
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
      if (schoolId) queryClient.invalidateQueries({ queryKey: [...RECEIPTS_QUERY_KEY, schoolId] });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : err instanceof Error
            ? err.message
            : "Failed to record payment.";
      setMessage(msg);
    } finally {
      paymentSubmitLockRef.current = false;
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  if (!open) return null;

  const modalContent = (
    <>
      {receiptData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Payment receipt">
          <div className="relative">
            <PaymentReceipt data={receiptData} autoPrint />
            <button
              type="button"
              onClick={() => setReceiptData(null)}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Close — record next payment
            </button>
          </div>
        </div>
      )}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Record payment"
        onClick={handleClose}
      >
        <div
          className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-y-auto max-h-[90vh]">
            <div className="flex items-start gap-3 rounded-t-2xl bg-emerald-700 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-white">Record Payment</h2>
                <p className="mt-0.5 text-sm text-white/90">Record a student payment and allocate to outstanding balances.</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="shrink-0 rounded-lg p-1.5 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="space-y-4 p-5">
                <div className="relative">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Student</label>
                  {selectedStudentRow ? (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5">
                      <span className="flex-1 text-sm font-medium text-slate-800">
                        {selectedStudentRow.name} <span className="text-slate-500">({selectedStudentRow.current_class})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent("");
                          setStudentSearchQuery("");
                        }}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        onFocus={() => setStudentSearchFocused(true)}
                        onBlur={() => setTimeout(() => setStudentSearchFocused(false), 150)}
                        placeholder="Search by name or class…"
                        className={inputClass}
                        autoComplete="off"
                      />
                      {studentSearchFocused && studentMatches.length > 0 && (
                        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                          {studentMatches.map((s) => (
                            <li key={s.student_id}>
                              <button
                                type="button"
                                className="w-full px-3 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-100"
                                onClick={() => {
                                  setSelectedStudent(s.student_id);
                                  setStudentSearchQuery("");
                                  setStudentSearchFocused(false);
                                }}
                              >
                                {s.name} <span className="text-slate-500">({s.current_class})</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {studentSearchQuery.trim() && studentMatches.length === 0 && (
                        <p className="mt-1 text-sm text-slate-500">No students match. Try a different search.</p>
                      )}
                    </>
                  )}
                </div>
                {selectedStudent && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm">
                      {balancesLoading ? (
                        <span className="text-slate-500">Loading balances…</span>
                      ) : outstandingBalances.length > 0 ? (
                        <>
                          <p className="font-medium text-slate-800">
                            {outstandingBalances.length > 1 ? "Outstanding (oldest term first)" : "Outstanding for this period"}
                          </p>
                          <ul className="mt-1 list-inside list-disc text-slate-700">
                            {sortOutstandingForPayment(outstandingBalances).map((b) => (
                              <li key={b.term_id}>
                                Term {b.term}, {b.year}: {b.balance.toLocaleString()}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 font-medium text-slate-800">Total due: {totalDue.toLocaleString()}</p>
                          {outstandingBalances.length > 1 && (
                            <p className="mt-0.5 text-slate-600">Payments clear the oldest term balance first, then newer terms.</p>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-600">No outstanding balance for this student.</p>
                      )}
                    </div>
                    {showActivateCurrentTerm && currentTerm && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm">
                        <p className="font-medium text-slate-800">No invoice for current term (Term {currentTerm.term}, {currentTerm.year})</p>
                        <p className="mt-0.5 text-slate-600">
                          Activate the current term invoice so this student is expected in school for this term. The term fee will be added to their total due.
                        </p>
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Boarding Type</label>
                          <select
                            value={boardingType}
                            onChange={(e) => setBoardingType(e.target.value as 'Day Scholar' | 'Boarding')}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="Day Scholar">Day Scholar</option>
                            <option value="Boarding">Boarding</option>
                          </select>
                          <p className="text-xs text-slate-600 mt-1">
                            This determines which fee applies: Day Scholar uses tuition fees, Boarding uses boarding fees
                          </p>
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Bursary discount</label>
                          <select
                            value={bursaryType}
                            onChange={(e) => { setBursaryType(e.target.value as typeof bursaryType); setBursaryCustomPct(''); }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="none">None</option>
                            <option value="50">50%</option>
                            <option value="100">100% (full bursary — free)</option>
                            <option value="custom">Custom %</option>
                          </select>
                          {bursaryType === 'custom' && (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={bursaryCustomPct}
                              onChange={(e) => setBursaryCustomPct(e.target.value)}
                              placeholder="Enter discount %"
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          )}
                        </div>

                        {currentTermFee != null && (
                          <p className="mt-2 font-medium text-slate-700">
                            {boardingType} fee: {currentTermFee.toLocaleString()}
                            {bursaryPct > 0 && effectiveFeeAmount != null && (
                              <span className="text-emerald-700"> → {effectiveFeeAmount.toLocaleString()} after {bursaryPct}% bursary</span>
                            )}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={handleActivateCurrentTermInvoice}
                          disabled={activatingInvoice || currentTermFee == null}
                          className="mt-2 rounded-lg border border-amber-600 bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          {activatingInvoice ? "Activating…" : "Activate invoice for current term"}
                        </button>
                        {currentTermFee == null && (
                          <p className="mt-1 text-xs text-amber-700">Set the {boardingType.toLowerCase()} fee for this class in Invoices & Billing or Settings.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
                  <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Payment method</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                    <option value="pos">POS / Card</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
                </div>
                {message && (
                  <p className={"text-sm " + (message.startsWith("Payment") ? "text-emerald-600" : "text-red-600")}>{message}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-4 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border-2 border-emerald-600 bg-white px-4 py-2.5 text-sm font-medium text-emerald-600 shadow-sm hover:bg-emerald-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canRecordPayment || balancesLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Receipt className="h-4 w-4" />
                  {submitting ? "Recording…" : "Record payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
