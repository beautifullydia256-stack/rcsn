import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { resolveCurrentSchoolTerm, type SchoolTermBrief } from "../../lib/adminFinanceTerm";
import { useAuthStore } from "../../store/authStore";
import { fetchBillingData, BILLING_QUERY_KEY } from "./api/billing";
import type { TermRow } from "./api/billing";

const STALE_MS = 2 * 60 * 1000;

function termIsStrictlyBefore(a: Pick<TermRow, "year" | "term">, b: Pick<TermRow, "year" | "term">) {
  return a.year < b.year || (a.year === b.year && a.term < b.term);
}

export default function BillingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading } = useQuery({
    queryKey: [...BILLING_QUERY_KEY, schoolId],
    queryFn: () => fetchBillingData(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  });
  const fees = data?.fees ?? [];
  const termsList = data?.terms ?? [];
  const students = data?.students ?? [];
  const studentsError = data?.studentsError ?? null;
  const termInvoiceOutstandingByStudent = data?.termInvoiceOutstandingByStudent ?? {};
  const priorBalanceByStudent = data?.priorBalanceByStudent ?? {};
  const studentIdsClosedTermHistory = useMemo(
    () => new Set(data?.studentIdsWithClosedTermInvoiceHistory ?? []),
    [data?.studentIdsWithClosedTermInvoiceHistory]
  );

  const [generateMode, setGenerateMode] = useState<"bulk" | "single">("bulk");
  const [currentTerm, setCurrentTerm] = useState<SchoolTermBrief | null>(null);
  const [currentTermResolved, setCurrentTermResolved] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [singleAmount, setSingleAmount] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [priorAmount, setPriorAmount] = useState("");
  const [priorNote, setPriorNote] = useState("");
  const [savingPrior, setSavingPrior] = useState(false);
  /** Split lines for move_prior_balance_to_term_opening_invoices (Option 1: real term rows). */
  const [priorSplitRows, setPriorSplitRows] = useState<{ termId: string; amount: string }[]>([{ termId: "", amount: "" }]);
  const [movingPrior, setMovingPrior] = useState(false);
  const [carryoverTermId, setCarryoverTermId] = useState("");
  const [carryoverAmount, setCarryoverAmount] = useState("");
  const [carryoverIncludeTermFee, setCarryoverIncludeTermFee] = useState(true);
  const [savingCarryover, setSavingCarryover] = useState(false);

  useEffect(() => {
    if (!schoolId) {
      setCurrentTerm(null);
      setCurrentTermResolved(true);
      return;
    }
    setCurrentTermResolved(false);
    let cancelled = false;
    void resolveCurrentSchoolTerm(supabase, schoolId).then((t) => {
      if (!cancelled) {
        setCurrentTerm(t);
        setCurrentTermResolved(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  useEffect(() => {
    setPriorSplitRows([{ termId: "", amount: "" }]);
  }, [selectedStudent]);

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

  const termsOldestFirst = useMemo(
    () => [...termsList].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.term - b.term)),
    [termsList]
  );

  /** Latest past term before the calendar “current” term — e.g. Term 3, 2025 when current is Term 1, 2026. */
  const defaultCarryoverTermId = useMemo(() => {
    if (
      currentTermResolved &&
      currentTerm?.year != null &&
      currentTerm.term != null &&
      termsOldestFirst.length > 0
    ) {
      const past = termsOldestFirst.filter((t) =>
        termIsStrictlyBefore({ year: t.year, term: t.term }, { year: currentTerm.year!, term: currentTerm.term! })
      );
      if (past.length > 0) return past[past.length - 1]!.id;
    }
    return termsOldestFirst[0]?.id ?? null;
  }, [termsOldestFirst, currentTerm, currentTermResolved]);

  const hasPastTermBeforeCurrent =
    currentTerm?.year != null &&
    currentTerm.term != null &&
    termsOldestFirst.some((t) =>
      termIsStrictlyBefore({ year: t.year, term: t.term }, { year: currentTerm.year!, term: currentTerm.term! })
    );

  useEffect(() => {
    setCarryoverTermId(defaultCarryoverTermId ?? "");
    setCarryoverAmount("");
  }, [selectedStudent, defaultCarryoverTermId]);

  const termOutstandingForSelected = selectedStudent
    ? Number(termInvoiceOutstandingByStudent[selectedStudent] ?? 0)
    : 0;
  const priorAggForSelected = selectedStudent ? priorBalanceByStudent[selectedStudent] : undefined;
  const priorTotalForSelected = priorAggForSelected?.sumOutstanding ?? 0;
  const combinedOutstandingForSelected = termOutstandingForSelected + priorTotalForSelected;
  /** Hide prior / combined lines when there is no external balance left (only term matters). */
  const showPriorAndCombinedInSummary = priorTotalForSelected > 0.005;

  const priorEntryBlockedReason = (() => {
    if (!selectedStudent) return null;
    if (priorBalanceByStudent[selectedStudent]) {
      return "A prior-system balance exists for this student. Prefer Move prior onto term invoices below so Record Payment matches multi-term ordering; the one-off prior field is only for when you cannot split by term.";
    }
    if (studentIdsClosedTermHistory.has(selectedStudent)) {
      return "This student has invoices on a closed term, so a one-time prior balance can no longer be added. That step is only for new onboarding before any closed term.";
    }
    return null;
  })();

  async function handleAddPriorEntry() {
    if (!schoolId || !userId || !selectedStudent) {
      setMessage({ type: "err", text: "Select a student first." });
      return;
    }
    if (priorEntryBlockedReason) {
      setMessage({ type: "err", text: priorEntryBlockedReason });
      return;
    }
    const amount = Number(priorAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: "err", text: "Enter a positive amount for prior-system balance." });
      return;
    }
    setSavingPrior(true);
    setMessage(null);
    try {
      const { error } = await supabase.from("prior_system_balance_entries").insert({
        school_id: schoolId,
        student_id: selectedStudent,
        amount_outstanding: amount,
        source_note: priorNote.trim() || null,
        entered_by_user_id: userId,
      });
      if (error) throw new Error(error.message);
      setPriorAmount("");
      setPriorNote("");
      setMessage({ type: "ok", text: "Prior-system balance entry saved." });
      await queryClient.invalidateQueries({ queryKey: [...BILLING_QUERY_KEY, schoolId] });
    } catch (e: unknown) {
      const msg = (e as Error).message || "Failed to save prior-system entry.";
      const lower = msg.toLowerCase();
      if (lower.includes("uq_prior_system_balance") || lower.includes("unique")) {
        setMessage({
          type: "err",
          text: "This student already has a prior-system balance. Only one entry is allowed.",
        });
      } else if (lower.includes("prior_system_balance_entries:")) {
        setMessage({ type: "err", text: msg.replace(/^.*?prior_system_balance_entries:\s*/i, "") });
      } else {
        setMessage({ type: "err", text: msg });
      }
    } finally {
      setSavingPrior(false);
    }
  }

  async function handleMovePriorToTermInvoices() {
    if (!schoolId || !selectedStudent) {
      setMessage({ type: "err", text: "Select a student first." });
      return;
    }
    const target = priorTotalForSelected;
    if (target <= 0.005) return;
    const allocations = priorSplitRows
      .map((r) => ({ term_id: r.termId.trim(), amount: Number(r.amount) }))
      .filter((r) => r.term_id.length > 0 && Number.isFinite(r.amount) && r.amount > 0);
    if (allocations.length === 0) {
      setMessage({ type: "err", text: "Add at least one school term and a positive amount for each line." });
      return;
    }
    const sum = allocations.reduce((s, a) => s + a.amount, 0);
    if (Math.abs(sum - target) > 0.02) {
      setMessage({
        type: "err",
        text:
          "Amounts must sum exactly to current prior outstanding (" +
          target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
          "). Now: " +
          sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
          ".",
      });
      return;
    }
    setMovingPrior(true);
    setMessage(null);
    try {
      const { error } = await supabase.rpc("move_prior_balance_to_term_opening_invoices", {
        p_school_id: schoolId,
        p_student_id: selectedStudent,
        p_allocations: allocations,
      });
      if (error) throw new Error(error.message);
      setPriorSplitRows([{ termId: "", amount: "" }]);
      setMessage({
        type: "ok",
        text: "Prior moved to issued term invoices. Outstanding now follows normal term rows (oldest term first in Record Payment).",
      });
      await queryClient.invalidateQueries({ queryKey: [...BILLING_QUERY_KEY, schoolId] });
    } catch (e: unknown) {
      setMessage({ type: "err", text: (e as Error).message || "Could not move prior balance." });
    } finally {
      setMovingPrior(false);
    }
  }

  async function handleApplyCarryoverToTerm() {
    if (!schoolId || !selectedStudent) {
      setMessage({ type: "err", text: "Select a student first." });
      return;
    }
    if (priorTotalForSelected > 0.005) {
      setMessage({
        type: "err",
        text:
          "This student already has a prior-system ledger balance. Finish “Move prior onto term invoices” below first, or ask an admin to adjust that entry.",
      });
      return;
    }
    if (!carryoverTermId) {
      setMessage({
        type: "err",
        text: "Select a school term. If no past term appears, add last year’s terms under your school calendar first.",
      });
      return;
    }
    const carry = Number(carryoverAmount);
    if (!Number.isFinite(carry) || carry <= 0) {
      setMessage({ type: "err", text: "Enter a positive carry-over amount (arrears from before Pweza)." });
      return;
    }
    const baseFee =
      carryoverIncludeTermFee && suggestedAmount > 0 ? Math.round(suggestedAmount * 100) / 100 : 0;
    setSavingCarryover(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc("apply_carryover_balance_to_term_invoice", {
        p_school_id: schoolId,
        p_student_id: selectedStudent,
        p_term_id: carryoverTermId,
        p_carryover_amount: carry,
        p_base_term_fee: baseFee,
      });
      if (error) throw new Error(error.message);
      const row = data as {
        invoice_number?: string;
        total_amount?: number;
        base_term_fee?: number;
        carryover_amount?: number;
      } | null;
      const total = row?.total_amount ?? carry + baseFee;
      const parts = [
        `Invoice ${row?.invoice_number ?? ""}`.trim(),
        `total due for that term: ${Number(total).toLocaleString()}`,

        `(carry-over ${Number(row?.carryover_amount ?? carry).toLocaleString()}` +
          (baseFee > 0 ? ` + term fee ${Number(row?.base_term_fee ?? baseFee).toLocaleString()}` : "") +
          ").",
      ];
      setMessage({
        type: "ok",
        text: `${parts.join(" — ")} Record Payment will list this under normal term balances.`,
      });
      setCarryoverAmount("");
      await queryClient.invalidateQueries({ queryKey: [...BILLING_QUERY_KEY, schoolId] });
    } catch (e: unknown) {
      setMessage({ type: "err", text: (e as Error).message || "Could not save carry-over on term." });
    } finally {
      setSavingCarryover(false);
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
        .in("student_id", allInClassIds)
        .neq("status", "cancelled");
      const hasInvoice = new Set((existingInvRows || []).map((r: { student_id: string }) => r.student_id));
      const toInvoice = studentsInClass.filter((s) => !hasInvoice.has(s.student_id));
      const skippedStudents = studentsInClass.filter((s) => hasInvoice.has(s.student_id));
      if (toInvoice.length === 0) {
        setMessage({
          type: "err",
          text: `No new invoices: every student in ${selectedClass} already has an active invoice for the current term.`,
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
          created_by: userId,
          updated_at: new Date().toISOString(),
        });
        if (invErr) throw invErr;
        created.push(st.name);
      }
      const year = currentTerm?.year ?? new Date().getFullYear();
      const termNum = currentTerm?.term ?? 1;
      const newStudentIds = toInvoice.map((s) => s.student_id);
      const { data: existingBalances } = await supabase
        .from("student_balances")
        .select("student_id, total_paid")
        .eq("school_id", schoolId)
        .eq("term_id", termId)
        .in("student_id", newStudentIds);
      const paidMap = new Map((existingBalances || []).map((b: { student_id: string; total_paid: number }) => [b.student_id, Number(b.total_paid || 0)]));
      for (const st of toInvoice) {
        const totalPaid = paidMap.get(st.student_id) ?? 0;
        const { error: balErr } = await supabase.from("student_balances").upsert(
          {
            student_id: st.student_id,
            school_id: schoolId,
            term_id: termId,
            year,
            term: termNum,
            total_fees: amount,
            total_paid: totalPaid,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,term_id" }
        );
        if (balErr) throw balErr;
      }
      const skipPart =
        skippedStudents.length > 0
          ? ` Skipped ${skippedStudents.length} (already invoiced this term): ${skippedStudents.map((s) => s.name).join(", ")}.`
          : "";
      setMessage({ type: "ok", text: `Generated ${created.length} invoice(s) for ${selectedClass}.${skipPart}` });
      setSelectedClass("");
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
      setMessage({ type: "err", text: "Enter a valid amount." });
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
        .neq("status", "cancelled")
        .maybeSingle();
      if (existingInv) {
        setMessage({
          type: "err",
          text: "This student already has an invoice for the current term. Only one invoice per student per term is allowed.",
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
        created_by: userId,
        updated_at: new Date().toISOString(),
      });
      if (invErr) throw invErr;
      const year = currentTerm?.year ?? new Date().getFullYear();
      const termNum = currentTerm?.term ?? 1;
      const { data: existing } = await supabase
        .from("student_balances")
        .select("total_paid")
        .eq("student_id", selectedStudent)
        .eq("term_id", termId)
        .single();
      const totalPaid = existing?.total_paid ?? 0;
      const { error: balErr } = await supabase.from("student_balances").upsert(
        {
          student_id: selectedStudent,
          school_id: schoolId,
          term_id: termId,
          year,
          term: termNum,
          total_fees: amount,
          total_paid: Number(totalPaid),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,term_id" }
      );
      if (balErr) throw balErr;
      setMessage({ type: "ok", text: `Invoice generated for ${st.name}. You can now record payments.` });
      setSelectedStudent("");
      setStudentSearchQuery("");
      setSingleAmount("");
    } catch (e: unknown) {
      setMessage({ type: "err", text: (e as Error).message || "Failed to generate invoice." });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Invoices & Billing</h1>
        <button
          type="button"
          onClick={() => navigate("/dashboard/accountant")}
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="ac-glass-card mb-6 overflow-hidden rounded-[18px]">
        <div className="border-b border-[var(--ac-border)] px-4 py-3">
          <h2 className="ac-text-primary text-sm font-semibold">Generate invoice</h2>
          <p className="ac-text-muted mt-0.5 text-xs">Create a bill so the student has a balance. Record payment only after an invoice exists.</p>
        </div>
        <div className="p-4">
          <div className="mb-4 flex gap-2 border-b border-[var(--ac-border)]">
            <button
              type="button"
              onClick={() => setGenerateMode("bulk")}
              className={`pb-2 text-sm font-medium ${generateMode === "bulk" ? "border-b-2 border-emerald-500 text-emerald-500" : "ac-text-muted"}`}
            >
              Bulk by class
            </button>
            <button
              type="button"
              onClick={() => setGenerateMode("single")}
              className={`pb-2 text-sm font-medium ${generateMode === "single" ? "border-b-2 border-emerald-500 text-emerald-500" : "ac-text-muted"}`}
            >
              Single student
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="ac-text-secondary mb-1 block text-sm font-medium">Term</label>
              <div className="ac-input flex min-h-[42px] items-center bg-white/5 text-sm text-[var(--ac-text-primary,inherit)]">
                {!currentTermResolved ? (
                  <span className="ac-text-muted">Loading current term…</span>
                ) : currentTerm ? (
                  <span>
                    Term {currentTerm.term}, {currentTerm.year}{" "}
                    <span className="ac-text-muted font-normal">(active term — invoicing is limited to this period)</span>
                  </span>
                ) : (
                  <span className="text-amber-400">
                    No school term could be resolved. Add terms with dates under Admin, or check term calendars.
                  </span>
                )}
              </div>
              <p className="ac-text-muted mt-1 text-xs">
                You cannot bill a future term from here; generate invoices only for the term the school is in today.
              </p>
            </div>
            {generateMode === "bulk" ? (
              <>
                {!isLoading && students.length === 0 && (
                  <div className="ac-glass-card rounded-xl bg-amber-500/10 border-amber-500/30 p-3 space-y-1">
                    {studentsError ? (
                      <p className="ac-text-primary text-sm font-medium text-red-400">Error loading students (Supabase): {studentsError}</p>
                    ) : (
                      <p className="ac-text-secondary text-sm">No students loaded for this school. Add students in Admin → Students, or ensure they are not marked as graduated.</p>
                    )}
                  </div>
                )}
                <div>
                  <label className="ac-text-secondary mb-1 block text-sm font-medium">Class</label>
                  <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="ac-input">
                    <option value="">Select class</option>
                    {classNames.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedClass && (
                  <>
                    <p className="ac-text-secondary text-sm">
                      {studentsInClass.length} student(s) in {selectedClass}. Tuition: {Number(tuitionForClass).toLocaleString()}.
                    </p>
                    {students.length > 0 && studentsInClass.length === 0 && (
                      <p className="text-sm text-amber-400 mt-1">
                        No students in this class. Select a class that has students: {[...new Set(students.map((s) => s.current_class).filter(Boolean))].sort().join(", ") || "—"}.
                      </p>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={handleGenerateBulk}
                  disabled={generating || !currentTerm?.id || !selectedClass || studentsInClass.length === 0}
                  className="ac-glass-btn rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {generating ? "Generating…" : `Generate invoices for ${selectedClass || "class"}`}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="ac-text-secondary mb-1 block text-sm font-medium">Student</label>
                  <input
                    type="text"
                    value={selectedStudent ? (selectedStudentRow ? `${selectedStudentRow.name} (${selectedStudentRow.current_class})` : "") : studentSearchQuery}
                    onChange={(e) => {
                      setSelectedStudent("");
                      setStudentSearchQuery(e.target.value);
                    }}
                    placeholder="Search by name or class…"
                    className="ac-input"
                    aria-label="Search students"
                  />
                  {!selectedStudent && studentSearchQuery.trim() !== "" && (
                    <div className="ac-glass-card mt-1 max-h-48 overflow-y-auto rounded-xl shadow-lg">
                      {studentOptions.length === 0 ? (
                        <p className="ac-text-muted px-3 py-3 text-sm">
                          {students.length === 0
                            ? "No students found for this school."
                            : "No students match your search. Try another letter or class name."}
                        </p>
                      ) : (
                        <ul className="py-1">
                          {studentOptions.map((s) => (
                            <li key={s.student_id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudent(s.student_id);
                                  setStudentSearchQuery("");
                                }}
                                className="ac-text-primary w-full px-3 py-2 text-left text-sm hover:bg-white/10 focus:bg-white/10 focus:outline-none rounded-lg"
                              >
                                {s.name} ({s.current_class})
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {selectedStudent && selectedStudentRow && (
                    <p className="ac-text-secondary mt-1 text-xs">
                      Selected: {selectedStudentRow.name} ({selectedStudentRow.current_class}){" "}
                      <button
                        type="button"
                        onClick={() => setSelectedStudent("")}
                        className="text-emerald-400 hover:underline"
                      >
                        Clear
                      </button>
                    </p>
                  )}
                </div>
                <div>
                  <label className="ac-text-secondary mb-1 block text-sm font-medium">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleAmount || (selectedStudent ? suggestedAmount : "")}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    className="ac-input"
                    placeholder={selectedStudent ? String(suggestedAmount) : ""}
                  />
                  {selectedStudent && suggestedAmount > 0 && (
                    <p className="ac-text-muted mt-1 text-xs">Suggested from fee structure: {suggestedAmount.toLocaleString()}</p>
                  )}
                </div>
                {selectedStudent && selectedStudentRow && (
                  <div className="rounded-xl border border-[var(--ac-border)] bg-white/5 p-4 space-y-4">
                    <h3 className="ac-text-primary text-sm font-semibold">
                      {showPriorAndCombinedInSummary ? "Prior-system and combined balance" : "Outstanding balance"}
                    </h3>
                    {showPriorAndCombinedInSummary ? (
                      <p className="ac-text-muted text-xs">
                        This student still has a <strong>prior-system ledger</strong> row. Use <strong>Move prior onto term invoices</strong> below to turn it into normal term debt. New arrears should use <strong>Carry-over balance</strong> first so nothing hits the prior ledger.
                      </p>
                    ) : (
                      <p className="ac-text-muted text-xs">
                        <strong>Carry-over balance</strong> (below) puts old arrears straight onto a past school term—same as other fees, oldest term first in Record Payment. The summary here uses term invoice balances; generate the current-term invoice separately when you are ready.
                      </p>
                    )}
                    {priorEntryBlockedReason && (
                      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{priorEntryBlockedReason}</p>
                    )}
                    <dl className="grid gap-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="ac-text-secondary">Term invoices (remaining)</dt>
                        <dd className="ac-text-primary font-medium tabular-nums">
                          {isLoading ? "…" : termOutstandingForSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </dd>
                      </div>
                      {showPriorAndCombinedInSummary && (
                        <>
                          <div className="flex justify-between gap-4">
                            <dt className="ac-text-secondary">Prior-system (external)</dt>
                            <dd className="ac-text-primary font-medium tabular-nums">
                              {isLoading ? "…" : priorTotalForSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4 border-t border-[var(--ac-border)] pt-2">
                            <dt className="ac-text-primary font-medium">Combined</dt>
                            <dd className="ac-text-primary font-semibold tabular-nums">
                              {isLoading ? "…" : combinedOutstandingForSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                    {showPriorAndCombinedInSummary &&
                      priorAggForSelected &&
                      (priorAggForSelected.lastSourceNote || priorAggForSelected.lastEnteredAt) && (
                      <p className="ac-text-muted text-xs">
                        Latest entry
                        {priorAggForSelected.lastEnteredAt ? ` (${new Date(priorAggForSelected.lastEnteredAt).toLocaleString()})` : ""}
                        {priorAggForSelected.lastSourceNote ? `: ${priorAggForSelected.lastSourceNote}` : ""}
                      </p>
                    )}
                    {priorTotalForSelected <= 0.005 && termsOldestFirst.length > 0 && (
                      <div className="border-t border-[var(--ac-border)] pt-4 space-y-3">
                        <h4 className="ac-text-secondary text-xs font-semibold uppercase tracking-wide">
                          Carry-over balance (before Pweza)
                        </h4>
                        <p className="ac-text-muted text-xs">
                          Old arrears go on the <strong>term you choose</strong> as a normal invoice. We pre-select the latest school period <strong>before</strong> today&apos;s active calendar term (for example Term 3, 2025 when you are in Term 1, 2026). You can change the term if the head teacher confirms a different period.
                        </p>
                        {currentTermResolved && !hasPastTermBeforeCurrent && currentTerm != null && (
                          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                            No term earlier than the current calendar term exists in your school yet. Add last year&apos;s terms (e.g. Term 3, 2025) under Admin / school terms, then refresh—otherwise pick any term from the list if it already exists.
                          </p>
                        )}
                        <div>
                          <label className="ac-text-secondary mb-1 block text-xs font-medium">Put carry-over on term</label>
                          <select
                            value={carryoverTermId}
                            onChange={(e) => setCarryoverTermId(e.target.value)}
                            className="ac-input"
                            disabled={savingCarryover}
                          >
                            <option value="">Select term</option>
                            {termsOldestFirst.map((t) => (
                              <option key={t.id} value={t.id}>
                                Term {t.term}, {t.year}
                                {t.is_closed ? " (closed)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="ac-text-secondary mb-1 block text-sm font-medium">Carry-over amount</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={carryoverAmount}
                            onChange={(e) => setCarryoverAmount(e.target.value)}
                            className="ac-input tabular-nums"
                            placeholder="e.g. 150000"
                            disabled={savingCarryover}
                          />
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            className="rounded border-slate-500"
                            checked={carryoverIncludeTermFee}
                            onChange={(e) => setCarryoverIncludeTermFee(e.target.checked)}
                            disabled={savingCarryover || suggestedAmount <= 0}
                          />
                          <span>
                            Include this class&apos;s term fee on the <strong>same</strong> invoice (
                            {suggestedAmount > 0 ? suggestedAmount.toLocaleString() : "no fee set"})
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => void handleApplyCarryoverToTerm()}
                          disabled={savingCarryover || !userId || !carryoverTermId}
                          className="ac-glass-btn rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
                        >
                          {savingCarryover ? "Saving…" : "Save carry-over on this term"}
                        </button>
                      </div>
                    )}
                    {showPriorAndCombinedInSummary && priorTotalForSelected > 0.005 && (
                      <div className="border-t border-[var(--ac-border)] pt-4 space-y-3">
                        <h4 className="ac-text-secondary text-xs font-semibold uppercase tracking-wide">
                          Move prior onto term invoices
                        </h4>
                        <p className="ac-text-muted text-xs">
                          Enter lines that sum exactly to the prior total. Each line creates an <strong>issued</strong> invoice for that term (requires no existing active invoice on that term). Payments then follow normal oldest-term-first rules.
                        </p>
                        {priorSplitRows.map((row, idx) => (
                          <div key={idx} className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[200px] flex-1">
                              <label className="ac-text-secondary mb-1 block text-xs font-medium">Term</label>
                              <select
                                value={row.termId}
                                onChange={(e) => {
                                  const next = [...priorSplitRows];
                                  next[idx] = { ...next[idx], termId: e.target.value };
                                  setPriorSplitRows(next);
                                }}
                                className="ac-input"
                                disabled={movingPrior}
                              >
                                <option value="">Select term</option>
                                {termsOldestFirst.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    Term {t.term}, {t.year}
                                    {t.is_closed ? " (closed)" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-36">
                              <label className="ac-text-secondary mb-1 block text-xs font-medium">Amount</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.amount}
                                onChange={(e) => {
                                  const next = [...priorSplitRows];
                                  next[idx] = { ...next[idx], amount: e.target.value };
                                  setPriorSplitRows(next);
                                }}
                                className="ac-input tabular-nums"
                                disabled={movingPrior}
                              />
                            </div>
                            {priorSplitRows.length > 1 ? (
                              <button
                                type="button"
                                className="ac-text-muted mb-2 text-xs hover:text-red-400"
                                onClick={() => setPriorSplitRows(priorSplitRows.filter((_, i) => i !== idx))}
                                disabled={movingPrior}
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPriorSplitRows([...priorSplitRows, { termId: "", amount: "" }])}
                          disabled={movingPrior}
                          className="ac-text-muted text-xs font-medium hover:text-emerald-400"
                        >
                          + Add term line
                        </button>
                        <p className="ac-text-muted text-xs tabular-nums">
                          Prior to allocate:{" "}
                          {priorTotalForSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Sum of
                          lines:{" "}
                          {priorSplitRows
                            .reduce((s, r) => s + (Number(r.amount) || 0), 0)
                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleMovePriorToTermInvoices()}
                          disabled={movingPrior || !userId}
                          className="ac-glass-btn rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
                        >
                          {movingPrior ? "Working…" : "Create invoices and clear prior"}
                        </button>
                      </div>
                    )}
                    {!priorEntryBlockedReason && (
                      <details className="border-t border-[var(--ac-border)] pt-4">
                        <summary className="ac-text-muted cursor-pointer text-xs font-medium">
                          Advanced: prior-system ledger only (avoid if you can use carry-over above)
                        </summary>
                        <div className="mt-3 space-y-3">
                          <p className="ac-text-muted text-xs">
                            Rare fallback when you cannot map arrears to a school term. Prefer <strong>Carry-over balance</strong> so all debt stays on term invoices.
                          </p>
                          <div>
                            <label className="ac-text-secondary mb-1 block text-sm font-medium">Amount</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={priorAmount}
                              onChange={(e) => setPriorAmount(e.target.value)}
                              className="ac-input"
                              placeholder="e.g. 150000"
                              disabled={savingPrior}
                            />
                          </div>
                          <div>
                            <label className="ac-text-secondary mb-1 block text-sm font-medium">Note</label>
                            <textarea
                              value={priorNote}
                              onChange={(e) => setPriorNote(e.target.value)}
                              className="ac-input min-h-[72px] resize-y"
                              placeholder="e.g. Old Excel Term 2 2024"
                              disabled={savingPrior}
                              rows={2}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddPriorEntry}
                            disabled={savingPrior || !userId}
                            className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
                          >
                            {savingPrior ? "Saving…" : "Add prior-system entry"}
                          </button>
                        </div>
                      </details>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleGenerateSingle}
                  disabled={generating || !currentTerm?.id || !selectedStudent}
                  className="ac-glass-btn rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {generating ? "Generating…" : "Generate invoice"}
                </button>
              </>
            )}
          </div>
          {message && (
            <p className={`mt-4 text-sm ${message.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>
          )}
        </div>
      </div>

      <p className="ac-text-muted text-sm mt-4">
        Fee amounts per class are defined under <strong>Fee Structure</strong>. Here you only generate and view invoices.
      </p>
    </div>
  );
}
