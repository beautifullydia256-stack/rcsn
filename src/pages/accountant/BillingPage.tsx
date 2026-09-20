import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  FileText,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { fetchBillingData, BILLING_QUERY_KEY } from "./api/billing";
import { useCurrentTerm } from "../../lib/useCurrentTerm";
import { useAcademicPeriod } from "../../lib/academicPeriodTerminology";
import { getTokens, cardGrad, SORA, INTER } from "../../styles/posThemeTokens";
import PosEmptyState from "../../components/finance/pos/PosEmptyState";

const STALE_MS = 2 * 60 * 1000;
const DEFAULT_SUPPLEMENTARY_LABEL = "Outstanding balance from previous period";

/** Exists when student already has is_supplementary = false invoice for this term */
const mainInvoiceQueryKey = (schoolId: string, studentId: string, termId: string) =>
  [...BILLING_QUERY_KEY, "mainInvoice", schoolId, studentId, termId] as const;

export default function BillingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === "dark";
  const t = getTokens(isDark);

  const { data, isLoading } = useQuery({
    queryKey: [...BILLING_QUERY_KEY, schoolId],
    queryFn: () => fetchBillingData(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  });
  const fees = data?.fees ?? [];
  const students = data?.students ?? [];
  const studentsError = data?.studentsError ?? null;
  const termInvoiceOutstandingByStudent = data?.termInvoiceOutstandingByStudent ?? {};

  const { currentTerm, isLoading: termLoading } = useCurrentTerm(schoolId);
  const currentTermResolved = !termLoading;
  const { isTertiary, labels, formatPeriod } = useAcademicPeriod();

  const [generateMode, setGenerateMode] = useState<"bulk" | "single">("bulk");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [singleAmount, setSingleAmount] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [supplementaryLabel, setSupplementaryLabel] = useState(DEFAULT_SUPPLEMENTARY_LABEL);
  const [supplementaryAmount, setSupplementaryAmount] = useState("");
  const [savingSupplementary, setSavingSupplementary] = useState(false);

  const canCheckMainInvoice =
    !!schoolId && !!selectedStudent && !!currentTerm?.id && currentTermResolved;
  const { data: mainInvoiceRow, isPending: mainInvoicePending } = useQuery({
    queryKey: mainInvoiceQueryKey(schoolId ?? "", selectedStudent, currentTerm?.id ?? ""),
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from("student_invoices")
        .select("invoice_id")
        .eq("school_id", schoolId!)
        .eq("student_id", selectedStudent)
        .eq("term_id", currentTerm!.id)
        .eq("is_supplementary", false)
        .neq("status", "cancelled")
        .maybeSingle();
      if (error) throw error;
      return row as { invoice_id: string } | null;
    },
    enabled: canCheckMainInvoice,
    staleTime: STALE_MS,
  });
  const hasMainInvoiceForCurrentTerm = !!mainInvoiceRow?.invoice_id;

  const classNames = fees.map((r) => r.class_name);
  const normalizeClass = (c: string) => (c || "").trim().toLowerCase();
  const studentsInClass =
    selectedClass
      ? students.filter((s) => normalizeClass(s.current_class) === normalizeClass(selectedClass))
      : [];
  const feeForClass = selectedClass ? fees.find((f) => f.class_name === selectedClass) : null;
  const tuitionForClass = feeForClass != null ? Number(feeForClass.tuition_amount) : 0;
  const selectedStudentRow = students.find((s) => s.student_id === selectedStudent);
  const feeForStudent = selectedStudentRow ? fees.find((f) => f.class_name === selectedStudentRow.current_class) : null;
  const suggestedAmount = feeForStudent != null ? Number(feeForStudent.tuition_amount) : 0;
  const q = studentSearchQuery.trim().toLowerCase();
  const studentOptions =
    q === ""
      ? []
      : students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.current_class.toLowerCase().includes(q)
        );

  useEffect(() => {
    setSupplementaryLabel(DEFAULT_SUPPLEMENTARY_LABEL);
    setSupplementaryAmount("");
  }, [selectedStudent]);

  const termOutstandingForSelected = selectedStudent
    ? Number(termInvoiceOutstandingByStudent[selectedStudent] ?? 0)
    : 0;

  const totalOutstandingSum = useMemo(() => {
    return Object.values(termInvoiceOutstandingByStudent).reduce((a, b) => a + Number(b || 0), 0);
  }, [termInvoiceOutstandingByStudent]);

  async function handleAddSupplementaryInvoice() {
    const termId = currentTerm?.id;
    if (!schoolId || !userId || !termId || !selectedStudent) {
      setMessage({ type: "err", text: "Select a student and ensure the current term is loaded." });
      return;
    }
    const amt = Number(supplementaryAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage({ type: "err", text: "Enter a positive amount for this additional charge." });
      return;
    }
    const label = supplementaryLabel.trim() || DEFAULT_SUPPLEMENTARY_LABEL;
    setSavingSupplementary(true);
    setMessage(null);
    try {
      let invNum: string | null = null;
      try {
        const res = await supabase.rpc("get_next_invoice_number", { p_school_id: schoolId });
        invNum = res.data ?? null;
      } catch {
        invNum = "INV-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
      }
      const { error: invErr } = await supabase.from("student_invoices").insert({
        school_id: schoolId,
        student_id: selectedStudent,
        term_id: termId,
        total_amount: amt,
        status: "issued",
        invoice_number: invNum,
        invoice_label: label,
        is_supplementary: true,
        created_by: userId,
        updated_at: new Date().toISOString(),
      });
      if (invErr) throw invErr;
      setMessage({
        type: "ok",
        text: `Added “${label}” (UGX ${amt.toLocaleString()}) on the active period. It appears in Record Payment with the balance.`,
      });
      setSupplementaryAmount("");
      await queryClient.invalidateQueries({ queryKey: [...BILLING_QUERY_KEY, schoolId] });
      await queryClient.invalidateQueries({ queryKey: [...BILLING_QUERY_KEY, "mainInvoice", schoolId] });
    } catch (e: unknown) {
      setMessage({ type: "err", text: (e as Error).message || "Could not add this invoice." });
    } finally {
      setSavingSupplementary(false);
    }
  }

  async function handleGenerateBulk() {
    const termId = currentTerm?.id;
    if (!schoolId || !userId || !termId || !selectedClass || studentsInClass.length === 0) {
      setMessage({ type: "err", text: "Current term is not available or class has no students." });
      return;
    }
    setGenerating(true);
    setMessage(null);
    try {
      const amount = Number(tuitionForClass);
      if (!amount || amount <= 0) {
        setMessage({ type: "err", text: "No fee set for this class. Add it in Admin → Settings → Financial." });
        setGenerating(false);
        return;
      }
      const allInClassIds = studentsInClass.map((s) => s.student_id);
      const { data: existingInvRows } = await supabase
        .from("student_invoices")
        .select("student_id")
        .eq("school_id", schoolId)
        .eq("term_id", termId)
        .eq("is_supplementary", false)
        .in("student_id", allInClassIds)
        .neq("status", "cancelled");
      const hasInvoice = new Set((existingInvRows || []).map((r: { student_id: string }) => r.student_id));
      const toInvoice = studentsInClass.filter((s) => !hasInvoice.has(s.student_id));
      const skippedStudents = studentsInClass.filter((s) => hasInvoice.has(s.student_id));
      if (toInvoice.length === 0) {
        setMessage({
          type: "err",
          text: `All ${studentsInClass.length} student(s) in ${selectedClass} already have main invoices for this period.`,
        });
        setGenerating(false);
        return;
      }
      const created: string[] = [];
      for (const st of toInvoice) {
        let invNum: string | null = null;
        try {
          const res = await supabase.rpc("get_next_invoice_number", { p_school_id: schoolId });
          invNum = res.data ?? null;
        } catch {
          invNum = "INV-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
        }
        const { error: invErr } = await supabase.from("student_invoices").insert({
          school_id: schoolId,
          student_id: st.student_id,
          term_id: termId,
          total_amount: amount,
          status: "issued",
          invoice_number: invNum,
          is_supplementary: false,
          created_by: userId,
          updated_at: new Date().toISOString(),
        });
        if (invErr) throw invErr;
        created.push(st.name);
      }
      const skipPart =
        skippedStudents.length > 0
          ? ` (Skipped ${skippedStudents.length} already invoiced).`
          : "";
      setMessage({ type: "ok", text: `Successfully generated ${created.length} invoice(s) for ${selectedClass}.${skipPart}` });
      setSelectedClass("");
      await queryClient.invalidateQueries({ queryKey: [...BILLING_QUERY_KEY, schoolId] });
    } catch (e: unknown) {
      setMessage({ type: "err", text: (e as Error).message || "Failed to generate invoices." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateSingle() {
    const termId = currentTerm?.id;
    if (!schoolId || !userId || !termId || !selectedStudent) {
      setMessage({ type: "err", text: "Current term is not available or no student selected." });
      return;
    }
    const amount = Number(singleAmount || suggestedAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: "err", text: "Enter a valid positive amount." });
      return;
    }
    setGenerating(true);
    setMessage(null);
    try {
      const { data: existingInv } = await supabase
        .from("student_invoices")
        .select("invoice_id")
        .eq("school_id", schoolId)
        .eq("student_id", selectedStudent)
        .eq("term_id", termId)
        .eq("is_supplementary", false)
        .neq("status", "cancelled")
        .maybeSingle();
      if (existingInv) {
        setMessage({
          type: "err",
          text: "This student already has the main term fee invoice. Use “Additional charge” below to add brought-forward lines.",
        });
        setGenerating(false);
        return;
      }
      let invNum: string | null = null;
      try {
        const res = await supabase.rpc("get_next_invoice_number", { p_school_id: schoolId });
        invNum = res.data ?? null;
      } catch {
        invNum = "INV-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
      }
      const st = selectedStudentRow!;
      const { error: invErr } = await supabase.from("student_invoices").insert({
        school_id: schoolId,
        student_id: selectedStudent,
        term_id: termId,
        total_amount: amount,
        status: "issued",
        invoice_number: invNum,
        is_supplementary: false,
        created_by: userId,
        updated_at: new Date().toISOString(),
      });
      if (invErr) throw invErr;
      setMessage({ type: "ok", text: `Main invoice generated for ${st.name} (UGX ${amount.toLocaleString()}).` });
      setSelectedStudent("");
      setStudentSearchQuery("");
      setSingleAmount("");
      await queryClient.invalidateQueries({ queryKey: [...BILLING_QUERY_KEY, schoolId] });
      await queryClient.invalidateQueries({ queryKey: [...BILLING_QUERY_KEY, "mainInvoice", schoolId] });
    } catch (e: unknown) {
      setMessage({ type: "err", text: (e as Error).message || "Failed to generate invoice." });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="w-full space-y-6 pb-12" style={{ fontFamily: INTER }}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
              style={{ color: t.mint, fontFamily: SORA }}
            >
              FINANCE & REVENUE
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: t.glowA, color: t.mint, border: `1px solid ${t.mintRing}` }}
            >
              INVOICES & BILLING
            </span>
          </div>
          <h1
            className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: t.textHi, fontFamily: SORA }}
          >
            Learner Invoices & Billing
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm" style={{ color: t.textMid }}>
            Generate {labels.periodNoun.toLowerCase()} fee invoices and supplementary charges for learners with instant ledger reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard/accountant/fee-structure")}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textMid,
            }}
          >
            <BookOpen className="h-3.5 w-3.5" style={{ color: t.mint }} />
            Fee Structure
          </button>
        </div>
      </div>

      {/* 4-Card POS Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Card 1: Active Period */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "emerald"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Active {labels.periodNoun}
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.mintDim, color: t.mint }}
            >
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold truncate" style={{ color: t.textHi, fontFamily: SORA }}>
            {termLoading ? "Loading…" : currentTerm ? formatPeriod(currentTerm.term, currentTerm.year) : "No Period"}
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            {currentTerm ? `Invoicing locked to active ${labels.periodNoun.toLowerCase()}` : "Configure terms in Admin"}
          </p>
        </div>

        {/* Card 2: Fee Schedules */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "blue"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Fee Schedules
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.blueDim, color: t.blue }}
            >
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
            {isLoading ? "…" : `${fees.length} Classes`}
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Standard class tuition rates
          </p>
        </div>

        {/* Card 3: Active Students */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "purple"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Registered Learners
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.deepDim, color: t.deep }}
            >
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
            {isLoading ? "…" : `${students.length} Students`}
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Eligible for invoicing
          </p>
        </div>

        {/* Card 4: Total Outstanding Balances */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 transition-all"
          style={{
            background: cardGrad(t, "amber"),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Total Outstanding
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: t.goldDim, color: t.gold }}
            >
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold tabular-nums truncate" style={{ color: t.gold, fontFamily: SORA }}>
            UGX {Math.round(totalOutstandingSum).toLocaleString()}
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: t.textLow }}>
            Unpaid invoices across cohort
          </p>
        </div>
      </div>

      {/* Main Billing Workspace Panel */}
      <div
        className="rounded-2xl"
        style={{
          overflow: "visible",
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        {/* Panel Header & Mode Switcher */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-6 rounded-t-2xl"
          style={{ borderColor: t.divider }}
        >
          <div>
            <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              Generate Learner Invoices
            </h2>
            <p className="text-xs" style={{ color: t.textMid }}>
              Create bills so learners have an active balance. Payments are recorded against existing invoices.
            </p>
          </div>

          <div
            className="flex items-center gap-1 rounded-xl p-1"
            style={{ background: t.fieldBg, border: `1px solid ${t.stroke}` }}
          >
            <button
              type="button"
              onClick={() => {
                setGenerateMode("bulk");
                setMessage(null);
              }}
              className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: generateMode === "bulk" ? t.mintDim : "transparent",
                color: generateMode === "bulk" ? t.mint : t.textMid,
              }}
            >
              <Layers className="h-3.5 w-3.5" />
              Bulk by Class
            </button>
            <button
              type="button"
              onClick={() => {
                setGenerateMode("single");
                setMessage(null);
              }}
              className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: generateMode === "single" ? t.mintDim : "transparent",
                color: generateMode === "single" ? t.mint : t.textMid,
              }}
            >
              <Users className="h-3.5 w-3.5" />
              Single Student
            </button>
          </div>
        </div>

        {/* Workspace Form */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Active Period Notification Bar */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 text-xs"
            style={{
              background: currentTerm ? t.mintDim : t.goldDim,
              border: `1px solid ${currentTerm ? t.mintRing : t.gold}`,
              color: currentTerm ? t.mint : t.gold,
            }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                <strong>{labels.periodNoun}:</strong>{" "}
                {currentTerm ? (
                  <span>
                    {formatPeriod(currentTerm.term, currentTerm.year)}{" "}
                    <span className="opacity-80">(Active billing period — invoices are locked to this term)</span>
                  </span>
                ) : (
                  "No active academic period resolved. Invoicing disabled."
                )}
              </span>
            </div>
            <span className="text-[11px] font-medium opacity-80">
              Future or past periods cannot be billed from this terminal.
            </span>
          </div>

          {/* Feedback Message */}
          {message && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 text-xs font-medium animate-fadeIn"
              style={{
                background: message.type === "ok" ? t.mintDim : t.redDim,
                border: `1px solid ${message.type === "ok" ? t.mintRing : t.red}`,
                color: message.type === "ok" ? t.mint : t.red,
              }}
            >
              {message.type === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* BULK BY CLASS MODE */}
          {generateMode === "bulk" && (
            <div className="space-y-4">
              {!isLoading && students.length === 0 && (
                <div
                  className="rounded-xl p-4 text-xs space-y-1"
                  style={{ background: t.goldDim, border: `1px solid ${t.gold}`, color: t.gold }}
                >
                  <p className="font-semibold">
                    {studentsError ? `Error loading students: ${studentsError}` : "No active students found in this school."}
                  </p>
                  <p className="opacity-85">
                    Add learners under Admin → Students or ensure they are enrolled and active.
                  </p>
                </div>
              )}

              <div className="max-w-md space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
                  Select Target Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none"
                  style={{
                    background: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                >
                  <option value="">-- Choose Class --</option>
                  {classNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: t.fieldBg, border: `1px solid ${t.stroke}` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
                        {selectedClass} Cohort Overview
                      </h4>
                      <p className="text-xs" style={{ color: t.textMid }}>
                        {studentsInClass.length} learner(s) registered in this class. Standard tuition fee:{" "}
                        <strong>UGX {Number(tuitionForClass).toLocaleString()}</strong>.
                      </p>
                    </div>
                    <div
                      className="rounded-lg px-3 py-1 text-xs font-semibold tabular-nums"
                      style={{ background: t.mintDim, color: t.mint }}
                    >
                      Class Batch Total: UGX {(studentsInClass.length * tuitionForClass).toLocaleString()}
                    </div>
                  </div>

                  {studentsInClass.length === 0 && (
                    <p className="text-xs font-medium" style={{ color: t.gold }}>
                      No students are currently allocated to {selectedClass}. Select a class with enrolled learners.
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateBulk}
                  disabled={generating || !currentTerm?.id || !selectedClass || studentsInClass.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100"
                  style={{
                    background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                    color: t.ctaText,
                    boxShadow: `0 4px 14px ${t.glowA}`,
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                  {generating ? "Generating Invoices…" : `Generate Invoices for ${selectedClass || "Selected Class"}`}
                </button>
              </div>
            </div>
          )}

          {/* SINGLE STUDENT MODE */}
          {generateMode === "single" && (
            <div className="space-y-4 min-h-[260px]">
              <div ref={searchContainerRef} className="relative max-w-lg space-y-1.5 z-30">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
                  Search & Select Student
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: t.textLow }}
                  />
                  <input
                    type="text"
                    value={
                      selectedStudent
                        ? selectedStudentRow
                          ? `${selectedStudentRow.name} (${selectedStudentRow.current_class})`
                          : ""
                        : studentSearchQuery
                    }
                    onFocus={() => setIsSearchOpen(true)}
                    onChange={(e) => {
                      setSelectedStudent("");
                      setStudentSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    placeholder="Search by student name or class cohort…"
                    className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium transition-colors focus:outline-none"
                    style={{
                      background: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                    }}
                  />
                </div>

                {!selectedStudent && studentSearchQuery.trim() !== "" && isSearchOpen && (
                  <div
                    className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl shadow-2xl"
                    style={{
                      background: t.panel,
                      border: `1px solid ${t.strokeHi}`,
                      boxShadow: isDark
                        ? "0 20px 30px -5px rgba(0, 0, 0, 0.7), 0 10px 15px -5px rgba(0, 0, 0, 0.5)"
                        : "0 20px 30px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -5px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {studentOptions.length === 0 ? (
                      <p className="p-3 text-xs" style={{ color: t.textLow }}>
                        No learners match your search query.
                      </p>
                    ) : (
                      <ul className="py-1 divide-y divide-slate-100 dark:divide-slate-800/40">
                        {studentOptions.map((s) => (
                          <li key={s.student_id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(s.student_id);
                                setStudentSearchQuery("");
                                setIsSearchOpen(false);
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-xs font-medium transition-colors flex items-center justify-between"
                              style={{ color: t.textHi }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = t.fieldBg)}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0"
                                  style={{ background: t.mintDim, color: t.mint }}
                                >
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold">{s.name}</span>
                              </div>
                              <span
                                className="rounded px-2.5 py-0.5 text-[10px] font-bold"
                                style={{ background: t.fieldBg, color: t.textMid, border: `1px solid ${t.stroke}` }}
                              >
                                {s.current_class}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {selectedStudent && selectedStudentRow && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span style={{ color: t.textMid }}>
                      Active: <strong>{selectedStudentRow.name}</strong> ({selectedStudentRow.current_class})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent("")}
                      className="font-semibold hover:underline"
                      style={{ color: t.mint }}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>

              {/* Status and Action for Selected Student */}
              {selectedStudent && currentTermResolved && (
                <div className="space-y-4 pt-2">
                  {canCheckMainInvoice && mainInvoicePending ? (
                    <div className="text-xs animate-pulse" style={{ color: t.textMid }}>
                      Verifying existing invoice records for this {labels.periodNoun.toLowerCase()}…
                    </div>
                  ) : canCheckMainInvoice && !hasMainInvoiceForCurrentTerm ? (
                    /* Main Invoice Creation Form */
                    <div
                      className="max-w-md rounded-xl p-4 space-y-3"
                      style={{ background: t.fieldBg, border: `1px solid ${t.stroke}` }}
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
                        Generate Main {labels.periodNoun} Fee Invoice
                      </h4>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: t.textMid }}>
                          Invoice Amount (UGX)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={singleAmount || (selectedStudent ? suggestedAmount : "")}
                          onChange={(e) => setSingleAmount(e.target.value)}
                          className="w-full rounded-xl px-3.5 py-2 text-sm font-semibold tabular-nums focus:outline-none"
                          style={{
                            background: t.panel,
                            border: `1px solid ${t.stroke}`,
                            color: t.textHi,
                          }}
                          placeholder={selectedStudent ? String(suggestedAmount) : ""}
                        />
                        {suggestedAmount > 0 && (
                          <p className="mt-1 text-[11px]" style={{ color: t.textLow }}>
                            Suggested from class fee schedule: UGX {suggestedAmount.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateSingle}
                        disabled={generating || !currentTerm?.id || !selectedStudent}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all hover:scale-[1.01] disabled:opacity-40"
                        style={{
                          background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                          color: t.ctaText,
                        }}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        {generating ? "Generating…" : "Generate Main Invoice"}
                      </button>
                    </div>
                  ) : canCheckMainInvoice && hasMainInvoiceForCurrentTerm ? (
                    <div
                      className="flex items-center gap-2 rounded-xl p-3 text-xs"
                      style={{ background: t.mintDim, border: `1px solid ${t.mintRing}`, color: t.mint }}
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        Main {labels.periodNoun.toLowerCase()} fee invoice is already active for{" "}
                        <strong>{selectedStudentRow?.name}</strong>. Use Additional Charge below for extra lines.
                      </span>
                    </div>
                  ) : null}

                  {/* Additional Charge & Outstanding Ledger */}
                  {selectedStudentRow && (
                    <div
                      className="rounded-xl p-5 space-y-4"
                      style={{ background: t.fieldBg, border: `1px solid ${t.stroke}` }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: t.divider }}>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
                            Live Outstanding Balance
                          </h4>
                          <p className="text-xs" style={{ color: t.textMid }}>
                            Current unpaid invoice total for {selectedStudentRow.name} across all active periods.
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs" style={{ color: t.textLow }}>
                            Remaining Due:{" "}
                          </span>
                          <span
                            className="text-base font-bold tabular-nums"
                            style={{ color: termOutstandingForSelected > 0 ? t.gold : t.mint, fontFamily: SORA }}
                          >
                            UGX {isLoading ? "…" : termOutstandingForSelected.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      {/* Supplementary Invoice Form */}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
                            Additional Supplementary Charge
                          </h5>
                          <span className="text-[11px]" style={{ color: t.textLow }}>
                            Applies to active {labels.periodNoun.toLowerCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: t.textMid }}>
                              Charge Description / Label
                            </label>
                            <input
                              type="text"
                              value={supplementaryLabel}
                              onChange={(e) => setSupplementaryLabel(e.target.value)}
                              className="w-full rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none"
                              style={{
                                background: t.panel,
                                border: `1px solid ${t.stroke}`,
                                color: t.textHi,
                              }}
                              placeholder={DEFAULT_SUPPLEMENTARY_LABEL}
                              disabled={savingSupplementary}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: t.textMid }}>
                              Charge Amount (UGX)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={supplementaryAmount}
                              onChange={(e) => setSupplementaryAmount(e.target.value)}
                              className="w-full rounded-xl px-3.5 py-2 text-xs font-semibold tabular-nums focus:outline-none"
                              style={{
                                background: t.panel,
                                border: `1px solid ${t.stroke}`,
                                color: t.textHi,
                              }}
                              placeholder="e.g. 150000"
                              disabled={savingSupplementary}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleAddSupplementaryInvoice()}
                          disabled={savingSupplementary || !userId || !currentTerm?.id || !supplementaryAmount}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:scale-[1.01] disabled:opacity-40"
                          style={{
                            background: t.panel,
                            border: `1px solid ${t.strokeHi}`,
                            color: t.mint,
                          }}
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          {savingSupplementary ? "Adding Charge…" : `Add Additional Charge to ${labels.periodNoun}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
