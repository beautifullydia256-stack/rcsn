/**
 * POS-style Record Payment modal. Renders on top of current view; no route change.
 * Opened from dashboard (or layout); Esc and overlay close it.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { registerApiUrl } from "../../lib/registerApiOrigin";
import { RECEIPTS_QUERY_KEY } from "../../pages/accountant/api/receipts";
import { resolveCurrentSchoolTerm } from "../../lib/adminFinanceTerm";
import { schoolCalendarTodayIso } from "../../lib/schoolCalendarDate";
import { useAuthStore } from "../../store/authStore";
import { useAcademicPeriod, formatAcademicPeriod } from "../../lib/academicPeriodTerminology";
import { invalidateAllFinancialQueries, broadcastFinanceUpdate } from "../../lib/realtimeFinanceSync";
import {
  enqueue,
  getOfflineStudents,
  getOfflineSchoolTerms,
  getOfflineSchoolInfo,
  getOfflineStudentIdsWithBalance,
  getOfflineStudentBalances,
  getOfflineStudentInvoice,
  getOfflineSchoolFeeStructure,
  type CachedSchoolTerm,
} from "../../lib/offlineDb";
import {
  PaymentReceipt,
  formatReceiptDateTime,
  schoolRowToReceiptHeader,
  type PaymentReceiptData,
  type SchoolBrandingRow,
} from "./PaymentReceipt";
import { Receipt, X, Loader2 } from "lucide-react";
import LiquidGlassSelect, { type GlassSelectOption } from "../ui/LiquidGlassSelect";

const PAYMENT_METHOD_OPTIONS: GlassSelectOption[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'pos', label: 'POS / Card' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

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
  if (!navigator.onLine) {
    const cached = await getOfflineStudentBalances(schoolId, studentId);
    const merged = mergeTermBalanceRows(cached);
    return { rows: buildOutstandingRows(merged), errorMessage: null };
  }
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

/**
 * Offline fallback for resolveCurrentSchoolTerm() (adminFinanceTerm.ts) — that function's
 * primary path calls a Supabase RPC, so it can't run offline. This mirrors its client-side
 * fallback logic (date-window match, else most recently started, else earliest chronological)
 * against the locally cached school_terms rows.
 */
function resolveCurrentTermOffline(terms: CachedSchoolTerm[], todayIso: string): CachedSchoolTerm | null {
  if (!terms.length) return null;
  const byNewest = (a: CachedSchoolTerm, b: CachedSchoolTerm) => (b.year ?? 0) - (a.year ?? 0) || (b.term ?? 0) - (a.term ?? 0);
  const byOldest = (a: CachedSchoolTerm, b: CachedSchoolTerm) => (a.year ?? 0) - (b.year ?? 0) || (a.term ?? 0) - (b.term ?? 0);

  const inWindow = terms
    .filter((t) => t.start_date != null && t.start_date <= todayIso && t.end_date != null && t.end_date >= todayIso)
    .sort(byNewest);
  if (inWindow.length) return inWindow[0];

  const started = terms.filter((t) => t.start_date != null && t.start_date <= todayIso).sort(byNewest);
  if (started.length) return started[0];

  return [...terms].sort(byOldest)[0] ?? null;
}

export type RecordPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  initialStudentId?: string;
  initialStudentName?: string;
  initialStudentClass?: string;
};

export default function RecordPaymentModal({
  open,
  onClose,
  initialStudentId,
  initialStudentName,
  initialStudentClass,
}: RecordPaymentModalProps) {
  const queryClient = useQueryClient();
  const { isTertiary } = useAcademicPeriod();
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
    if (!open) return;
    if (initialStudentId) {
      setSelectedStudent(initialStudentId);
      if (initialStudentName) {
        setStudents((prev) => {
          if (prev.some((s) => s.student_id === initialStudentId)) return prev;
          return [
            {
              student_id: initialStudentId,
              name: initialStudentName,
              current_class: initialStudentClass || "—",
              status: "active",
            },
            ...prev,
          ];
        });
      }
    }
  }, [open, initialStudentId, initialStudentName, initialStudentClass]);

  // Fetch individual student details if not present in students list
  useEffect(() => {
    if (!open || !selectedStudent || !schoolId || !navigator.onLine) return;
    const exists = students.some((s) => s.student_id === selectedStudent);
    if (!exists) {
      supabase
        .from("students")
        .select("student_id, name, current_class, status")
        .eq("school_id", schoolId)
        .eq("student_id", selectedStudent)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setStudents((prev) => {
              if (prev.some((s) => s.student_id === data.student_id)) return prev;
              return [
                {
                  student_id: data.student_id,
                  name: data.name,
                  current_class: data.current_class || "—",
                  status: data.status || "active",
                },
                ...prev,
              ];
            });
          }
        });
    }
  }, [open, selectedStudent, schoolId, students]);

  useEffect(() => {
    if (!open || !schoolId) return;
    void (async () => {
      if (!navigator.onLine) {
        // Offline: read everything from the local cache instead of hitting Supabase.
        // Inactive-but-owing "debtor" students (the online path's supplementary lookup)
        // aren't available offline — the active student list still covers the common case.
        const [cachedStudents, cachedTerms, cachedSchool, owingIds] = await Promise.all([
          getOfflineStudents(schoolId),
          getOfflineSchoolTerms(schoolId),
          getOfflineSchoolInfo(schoolId),
          getOfflineStudentIdsWithBalance(schoolId),
        ]);
        setSchoolLetterhead(schoolRowToReceiptHeader(cachedSchool ?? null));
        setStudents(
          cachedStudents
            .map((s) => ({ student_id: s.student_id, name: s.student_name, current_class: s.class_name, status: s.status }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setTerms(cachedTerms.map((t) => ({ id: t.id, term: t.term, year: t.year })));
        const cur = resolveCurrentTermOffline(cachedTerms, schoolCalendarTodayIso());
        setCurrentTerm(
          cur
            ? { id: cur.id, term: cur.term ?? 1, year: cur.year ?? new Date().getFullYear(), start_date: cur.start_date ?? undefined, end_date: cur.end_date ?? undefined }
            : null
        );
        return;
      }

      // Run all initial fetches in parallel — including resolveCurrentSchoolTerm.
      // Previously resolveCurrentSchoolTerm ran sequentially AFTER Promise.all, meaning
      // a fast user could select a student before currentTerm was set, causing the
      // balance effect to fire twice (once with null term, once with real term).
      const [sRes, tRes, balRes, schoolRes, cur] = await Promise.all([
        supabase
          .from("students")
          .select("student_id, name, current_class, status")
          .eq("school_id", schoolId)
          .is("deleted_at", null)
          .order("name"),
        supabase.from("school_terms").select("id, term, year, start_date, end_date").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false }),
        supabase.from("student_balances").select("student_id").eq("school_id", schoolId).gt("balance", 0),
        supabase.from("schools").select("name, contact_phone, contact_email").eq("school_id", schoolId).single(),
        resolveCurrentSchoolTerm(supabase, schoolId),
      ]);
      const school = (schoolRes.data as SchoolBrandingRow | null) ?? null;
      setSchoolLetterhead(schoolRowToReceiptHeader(school));
      const loadedStudents = (sRes.data || []) as { student_id: string; name: string; current_class: string; status?: string }[];
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
      setStudents(loadedStudents);
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
        const online = navigator.onLine;
        const [outResult, invRes, stRes] = await Promise.all([
          fetchOutstandingRowsForRecordPayment(schoolId, selectedStudent),
          currentTerm
            ? online
              ? supabase
                  .from("student_invoices")
                  .select("invoice_id")
                  .eq("school_id", schoolId)
                  .eq("student_id", selectedStudent)
                  .eq("term_id", currentTerm.id)
                  .eq("is_supplementary", false)
                  .neq("status", "cancelled")
                  .maybeSingle()
              : getOfflineStudentInvoice(schoolId, selectedStudent, currentTerm.id).then((row) => ({
                  data: row ? { invoice_id: row.invoice_id } : null,
                  error: null,
                }))
            : Promise.resolve({ data: null, error: null }),
          online
            ? supabase.from("students").select("current_class").eq("school_id", schoolId).eq("student_id", selectedStudent).maybeSingle()
            : Promise.resolve({
                data: { current_class: students.find((s) => s.student_id === selectedStudent)?.current_class ?? null },
                error: null,
              }),
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
            const feeRow = online
              ? (
                  await supabase
                    .from("school_fee_structure")
                    .select(`tuition_amount, boarding_amount`)
                    .eq("school_id", schoolId)
                    .eq("class_name", cls)
                    .maybeSingle()
                ).data
              : await getOfflineSchoolFeeStructure(schoolId, cls);
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

  // Live debounced server search for any student in the school (covering all classes & statuses)
  useEffect(() => {
    const q = studentSearchQuery.trim();
    if (!q || q.length < 2 || !schoolId || !open || !navigator.onLine) return;

    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("students")
          .select("student_id, name, current_class, status")
          .eq("school_id", schoolId)
          .is("deleted_at", null)
          .ilike("name", `%${q.replace(/\s+/g, "%")}%`)
          .limit(20);

        if (data && data.length > 0) {
          setStudents((prev) => {
            const existingIds = new Set(prev.map((s) => s.student_id));
            const newItems = data.filter((s) => !existingIds.has(s.student_id));
            if (!newItems.length) return prev;
            return [...prev, ...newItems].sort((a, b) => a.name.localeCompare(b.name));
          });
        }
      } catch (err) {
        console.error("Student search error:", err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [studentSearchQuery, schoolId, open]);

  const q = studentSearchQuery.trim().toLowerCase();
  const searchWords = q.split(/\s+/).filter(Boolean);
  const studentMatches =
    selectedStudent && !q
      ? []
      : students.filter((s) => {
          if (!searchWords.length) return true;
          const nameLower = (s.name || "").toLowerCase();
          const classLower = (s.current_class || "").toLowerCase();
          return searchWords.every((w) => nameLower.includes(w) || classLower.includes(w));
        }).slice(0, 15);

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
          const rpcRes = await fetch(registerApiUrl('/api/admin?action=get-next-receipt-number'), {
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
      const studentRow = students.find((s) => s.student_id === selectedStudent);
      const allocationLines = allocations.map((a) => ({
        termLabel: formatAcademicPeriod(a.term, isTertiary, {
          year: a.year,
          studentClass: studentRow?.current_class,
          currentTerm: currentTerm ? { term: currentTerm.term, year: currentTerm.year } : null,
        }),
        amountApplied: a.amount,
      }));
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
        termTitle: isTertiary ? "Semester" : "Term",
        termLabel: allocationLines.length === 1 ? allocationLines[0].termLabel : (isTertiary ? "Multiple semesters" : "Multiple terms"),
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
      const activeSchoolId = schoolId || useAuthStore.getState().schoolId;
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
      if (activeSchoolId) {
        queryClient.invalidateQueries({ queryKey: [...RECEIPTS_QUERY_KEY, activeSchoolId] });
      }
      invalidateAllFinancialQueries(queryClient, activeSchoolId);
      broadcastFinanceUpdate({
        type: 'payment',
        schoolId: activeSchoolId,
        amount: amt,
        id: receiptNumberForPayments,
      });
      window.dispatchEvent(new CustomEvent('pweza:payment-recorded'));
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
    "w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/20 hover:border-white/35 focus:border-white/70 focus:bg-black/35 backdrop-blur-sm text-white placeholder-white/50 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition";

  if (!open) return null;

  const modalContent = (
    <AnimatePresence>
      {receiptData && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-transparent p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Payment receipt"
          onClick={() => setReceiptData(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg p-5 sm:p-7 rounded-[28px] 
              bg-slate-950/70 dark:bg-black/80 
              backdrop-blur-md backdrop-saturate-[150%] 
              border border-white/30 border-t-white/60 border-l-white/40 border-b-white/20 
              shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1.5px_2px_rgba(255,255,255,0.5)] 
              my-auto text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Liquid Glass Specular Sheen */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <PaymentReceipt data={receiptData} autoPrint />
            <button
              type="button"
              onClick={() => setReceiptData(null)}
              className="mt-4 w-full rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white py-2.5 text-xs font-bold backdrop-blur-sm transition active:scale-[0.98]"
            >
              Close — record next payment
            </button>
          </motion.div>
        </div>
      )}

      {/* Backdrop - 100% Transparent so background page remains completely visible & unblurred */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-transparent z-[240]"
        onClick={handleClose}
      />

      <div
        className="fixed inset-0 z-[240] flex items-center justify-center p-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:p-5 pointer-events-none overflow-y-auto overflow-x-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Record payment"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 14 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative pointer-events-auto my-auto w-full max-w-lg p-5 sm:p-7 rounded-[28px] 
            bg-slate-950/45 dark:bg-black/55 
            backdrop-blur-md backdrop-saturate-[150%] 
            border border-white/30 border-t-white/60 border-l-white/40 border-b-white/20 
            shadow-[0_20px_50px_rgba(0,0,0,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(255,255,255,0.15)] 
            text-white overflow-hidden max-h-[min(88dvh,760px)] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Liquid Glass Specular Sheen (iOS Liquid Edge) */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
          {/* Subtle diagonal liquid light rays */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex shrink-0 items-center justify-between gap-3 pb-4 mb-4 border-b border-white/15 relative z-10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-emerald-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-sm truncate">
                  Record Payment
                </h2>
                <p className="text-[11px] text-white/70 truncate">
                  Record a student payment and allocate to outstanding balances.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white transition active:scale-95 shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Inner body - no scrollbar, smooth scroll */}
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y relative z-10 no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4 text-xs">
              <div className="space-y-3.5">
                <div className="relative">
                  <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                    Student *
                  </label>
                  {selectedStudentRow ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/20 bg-black/25 px-3.5 py-2.5 backdrop-blur-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)]">
                      <span className="flex-1 text-xs font-semibold text-white truncate">
                        {selectedStudentRow.name} <span className="text-white/60">({selectedStudentRow.current_class})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent("");
                          setStudentSearchQuery("");
                        }}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition"
                      >
                        Change
                      </button>
                    </div>
                  ) : selectedStudent ? (
                    <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/25 px-3.5 py-2.5 backdrop-blur-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                      <span className="flex-1 text-xs text-white/70">
                        Loading student details...
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent("");
                          setStudentSearchQuery("");
                        }}
                        className="text-xs text-white/50 hover:text-white"
                      >
                        Cancel
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
                        <ul
                          className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-white/25 bg-slate-950/95 dark:bg-black/95 backdrop-blur-xl backdrop-saturate-[160%] shadow-[0_20px_45px_rgba(0,0,0,0.7),inset_0_1px_1.5px_rgba(255,255,255,0.2)] p-1.5 space-y-0.5 text-white no-scrollbar"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          {studentMatches.map((s) => (
                            <li key={s.student_id}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2 rounded-xl text-xs text-left text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 transition select-none"
                                onClick={() => {
                                  setSelectedStudent(s.student_id);
                                  setStudentSearchQuery("");
                                  setStudentSearchFocused(false);
                                }}
                              >
                                <span className="truncate">
                                  <span className="font-semibold text-white">{s.name}</span>{" "}
                                  <span className="text-white/60">({s.current_class})</span>
                                </span>
                                {s.status && s.status !== "active" && (
                                  <span className="rounded-lg bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.5 text-[10px] font-bold capitalize text-amber-300">
                                    {s.status}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {studentSearchQuery.trim() && studentMatches.length === 0 && (
                        <p className="mt-1 text-xs text-white/60">No students match. Try a different search.</p>
                      )}
                    </>
                  )}
                </div>

                {selectedStudent && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/20 bg-black/25 backdrop-blur-sm p-3.5 text-xs text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] space-y-2">
                      {balancesLoading ? (
                        <div className="flex items-center gap-2 text-white/70">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Loading balances…</span>
                        </div>
                      ) : outstandingBalances.length > 0 ? (
                        <>
                          <p className="font-bold uppercase tracking-wider text-[11px] text-white/90">
                            {outstandingBalances.length > 1
                              ? (isTertiary ? "Outstanding (oldest semester first)" : "Outstanding (oldest term first)")
                              : (isTertiary ? "Outstanding for this semester" : "Outstanding for this period")}
                          </p>
                          <ul className="mt-1 space-y-1 text-white/80">
                            {sortOutstandingForPayment(outstandingBalances).map((b) => (
                              <li key={b.term_id} className="flex justify-between items-center py-1 border-b border-white/10 last:border-0">
                                <span>
                                  {formatAcademicPeriod(b.term, isTertiary, {
                                    year: b.year,
                                    studentClass: selectedStudentRow?.current_class,
                                    currentTerm: currentTerm ? { term: currentTerm.term, year: currentTerm.year } : null,
                                  })}
                                </span>
                                <span className="font-bold text-emerald-300">UGX {b.balance.toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="pt-2 border-t border-white/15 flex justify-between items-center">
                            <span className="font-bold text-white">Total due:</span>
                            <span className="font-black text-sm text-emerald-300 drop-shadow-sm">UGX {totalDue.toLocaleString()}</span>
                          </div>
                          {outstandingBalances.length > 1 && (
                            <p className="text-[11px] text-white/60 leading-relaxed">
                              {isTertiary
                                ? "Payments clear the oldest semester balance first, then newer semesters."
                                : "Payments clear the oldest term balance first, then newer terms."}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-white/70">No outstanding balance for this student.</p>
                      )}
                    </div>

                    {showActivateCurrentTerm && currentTerm && (
                      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 backdrop-blur-sm p-3.5 text-xs text-white space-y-2.5">
                        <p className="font-bold text-amber-200">
                          No invoice for current {isTertiary ? 'semester' : 'term'} ({formatAcademicPeriod(currentTerm.term, isTertiary, {
                            year: currentTerm.year,
                            studentClass: selectedStudentRow?.current_class,
                            currentTerm: { term: currentTerm.term, year: currentTerm.year },
                          })})
                        </p>
                        <p className="text-[11px] text-white/80 leading-relaxed">
                          Activate the current {isTertiary ? 'semester' : 'term'} invoice so this student is expected in school for this {isTertiary ? 'semester' : 'term'}. The {isTertiary ? 'semester' : 'term'} fee will be added to their total due.
                        </p>
                        
                        <div>
                          <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1">
                            {isTertiary ? "Residency / Accommodation" : "Boarding Type"}
                          </label>
                          <LiquidGlassSelect
                            value={boardingType}
                            onChange={(val) => setBoardingType(val as 'Day Scholar' | 'Boarding')}
                            options={[
                              { value: 'Day Scholar', label: isTertiary ? 'Non-Resident' : 'Day Scholar' },
                              { value: 'Boarding', label: isTertiary ? 'Resident (Hostel Accommodation)' : 'Boarding' },
                            ]}
                            direction="down"
                          />
                          <p className="text-[10px] text-white/60 mt-1">
                            {isTertiary
                              ? "Non-Resident pays tuition & functional fees; Resident includes hostel accommodation fees."
                              : "This determines which fee applies: Day Scholar uses tuition fees, Boarding uses boarding fees."}
                          </p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1">Bursary discount</label>
                          <LiquidGlassSelect
                            value={bursaryType}
                            onChange={(val) => {
                              setBursaryType(val as typeof bursaryType);
                              setBursaryCustomPct('');
                            }}
                            options={[
                              { value: 'none', label: 'None' },
                              { value: '50', label: '50%' },
                              { value: '100', label: '100% (full bursary — free)' },
                              { value: 'custom', label: 'Custom %' },
                            ]}
                            direction="down"
                          />
                          {bursaryType === 'custom' && (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={bursaryCustomPct}
                              onChange={(e) => setBursaryCustomPct(e.target.value)}
                              placeholder="Enter discount %"
                              className={"mt-1 " + inputClass}
                            />
                          )}
                        </div>

                        {currentTermFee != null && (
                          <p className="font-semibold text-white/90 text-xs">
                            {isTertiary
                              ? (boardingType === 'Boarding' ? 'Resident (hostel) fee' : 'Non-Resident fee')
                              : `${boardingType} fee`}: <span className="text-white font-bold">{currentTermFee.toLocaleString()}</span>
                            {bursaryPct > 0 && effectiveFeeAmount != null && (
                              <span className="text-emerald-300 font-bold"> → {effectiveFeeAmount.toLocaleString()} after {bursaryPct}% bursary</span>
                            )}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={handleActivateCurrentTermInvoice}
                          disabled={activatingInvoice || currentTermFee == null}
                          className="mt-1 rounded-xl border border-amber-400/40 bg-amber-500/25 hover:bg-amber-500/40 px-3.5 py-2 text-xs font-bold text-amber-200 transition active:scale-95 disabled:opacity-50"
                        >
                          {activatingInvoice ? "Activating…" : `Activate invoice for current ${isTertiary ? 'semester' : 'term'}`}
                        </button>
                        {currentTermFee == null && (
                          <p className="mt-1 text-[11px] text-amber-300/80">
                            Set the {isTertiary ? (boardingType === 'Boarding' ? 'resident (hostel)' : 'non-resident') : boardingType.toLowerCase()} fee for this class in Invoices & Billing or Settings.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                    Amount (UGX) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={inputClass + " text-emerald-300 font-bold"}
                    required
                    placeholder="e.g. 500000"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                    Payment method *
                  </label>
                  <LiquidGlassSelect
                    value={method}
                    onChange={(val) => setMethod(val)}
                    options={PAYMENT_METHOD_OPTIONS}
                    direction="up"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Bank slip reference or receipt notes"
                  />
                </div>

                {message && (
                  <p className={"text-xs font-semibold p-2.5 rounded-xl border " + (
                    message.startsWith("Payment")
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                  )}>
                    {message}
                  </p>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/15 relative z-10">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canRecordPayment || balancesLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Receipt className="w-4 h-4" />
                  {submitting ? "Recording…" : "Record payment"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
