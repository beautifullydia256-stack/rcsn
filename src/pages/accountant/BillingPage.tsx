import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { fetchBillingData, BILLING_QUERY_KEY } from "./api/billing";

const STALE_MS = 2 * 60 * 1000;

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
  const terms = data?.terms ?? [];
  const students = data?.students ?? [];
  const studentsError = data?.studentsError ?? null;
  const termInvoiceOutstandingByStudent = data?.termInvoiceOutstandingByStudent ?? {};
  const priorBalanceByStudent = data?.priorBalanceByStudent ?? {};
  const studentIdsClosedTermHistory = useMemo(
    () => new Set(data?.studentIdsWithClosedTermInvoiceHistory ?? []),
    [data?.studentIdsWithClosedTermInvoiceHistory]
  );

  const [generateMode, setGenerateMode] = useState<"bulk" | "single">("bulk");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [singleAmount, setSingleAmount] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [priorAmount, setPriorAmount] = useState("");
  const [priorNote, setPriorNote] = useState("");
  const [savingPrior, setSavingPrior] = useState(false);

  useEffect(() => {
    if (terms.length > 0 && !selectedTerm) setSelectedTerm(terms[0].id);
  }, [terms, selectedTerm]);

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

  const termOutstandingForSelected = selectedStudent
    ? Number(termInvoiceOutstandingByStudent[selectedStudent] ?? 0)
    : 0;
  const priorAggForSelected = selectedStudent ? priorBalanceByStudent[selectedStudent] : undefined;
  const priorTotalForSelected = priorAggForSelected?.sumOutstanding ?? 0;
  const combinedOutstandingForSelected = termOutstandingForSelected + priorTotalForSelected;

  const priorEntryBlockedReason = (() => {
    if (!selectedStudent) return null;
    if (priorBalanceByStudent[selectedStudent]) {
      return "A prior-system balance was already recorded for this student. Only one entry is allowed—use term invoices for ongoing fees.";
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

  async function handleGenerateBulk() {
    if (!schoolId || !userId || !selectedTerm || !selectedClass || studentsInClass.length === 0) {
      setMessage({ type: "err", text: "Select term and class with at least one student." });
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
      const created: string[] = [];
      for (const st of studentsInClass) {
        let invNum: string | null = null;
        try {
          const res = await supabase.rpc("get_next_invoice_number", { p_school_id: schoolId });
          invNum = res.data ?? null;
        } catch {
          invNum = "INV-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
        }
        const { error: invErr } = await supabase.from("student_invoices").upsert(
          {
            school_id: schoolId,
            student_id: st.student_id,
            term_id: selectedTerm,
            total_amount: amount,
            status: "issued",
            invoice_number: invNum,
            created_by: userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "school_id,student_id,term_id" }
        );
        if (invErr) throw invErr;
        created.push(st.name);
      }
      const termRow = terms.find((t) => t.id === selectedTerm);
      const year = termRow?.year ?? new Date().getFullYear();
      const termNum = termRow?.term ?? 1;
      const studentIds = studentsInClass.map((s) => s.student_id);
      const { data: existingBalances } = await supabase
        .from("student_balances")
        .select("student_id, total_paid")
        .eq("school_id", schoolId)
        .eq("term_id", selectedTerm)
        .in("student_id", studentIds);
      const paidMap = new Map((existingBalances || []).map((b: { student_id: string; total_paid: number }) => [b.student_id, Number(b.total_paid || 0)]));
      for (const st of studentsInClass) {
        const totalPaid = paidMap.get(st.student_id) ?? 0;
        const { error: balErr } = await supabase.from("student_balances").upsert(
          {
            student_id: st.student_id,
            school_id: schoolId,
            term_id: selectedTerm,
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
      setMessage({ type: "ok", text: `Generated ${created.length} invoice(s) for ${selectedClass}.` });
      setSelectedClass("");
    } catch (e: unknown) {
      setMessage({ type: "err", text: (e as Error).message || "Failed to generate invoices." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateSingle() {
    if (!schoolId || !userId || !selectedTerm || !selectedStudent) {
      setMessage({ type: "err", text: "Select term and student." });
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
      let invNum: string | null = null;
      try {
        const res = await supabase.rpc("get_next_invoice_number", { p_school_id: schoolId });
        invNum = res.data ?? null;
      } catch {
        invNum = "INV-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
      }
      const st = selectedStudentRow!;
      const { error: invErr } = await supabase.from("student_invoices").upsert(
        {
          school_id: schoolId,
          student_id: selectedStudent,
          term_id: selectedTerm,
          total_amount: amount,
          status: "issued",
          invoice_number: invNum,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "school_id,student_id,term_id" }
      );
      if (invErr) throw invErr;
      const termRow = terms.find((t) => t.id === selectedTerm);
      const year = termRow?.year ?? new Date().getFullYear();
      const termNum = termRow?.term ?? 1;
      const { data: existing } = await supabase
        .from("student_balances")
        .select("total_paid")
        .eq("student_id", selectedStudent)
        .eq("term_id", selectedTerm)
        .single();
      const totalPaid = existing?.total_paid ?? 0;
      const { error: balErr } = await supabase.from("student_balances").upsert(
        {
          student_id: selectedStudent,
          school_id: schoolId,
          term_id: selectedTerm,
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
              <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="ac-input">
                <option value="">Select term</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    Term {t.term}, {t.year}
                  </option>
                ))}
              </select>
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
                  disabled={generating || !selectedTerm || !selectedClass || studentsInClass.length === 0}
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
                    <h3 className="ac-text-primary text-sm font-semibold">Prior-system and combined balance</h3>
                    <p className="ac-text-muted text-xs">
                      Term invoices track fees inside Pweza terms. Prior-system entries record debt carried from another system (no extra invoice per term). Each student may have{" "}
                      <strong>only one</strong> prior entry, and only while they still have <strong>no invoices on a closed term</strong> (new onboarding). After terms are closed, use normal term invoices.
                    </p>
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
                    </dl>
                    {priorAggForSelected && (priorAggForSelected.lastSourceNote || priorAggForSelected.lastEnteredAt) && (
                      <p className="ac-text-muted text-xs">
                        Latest entry
                        {priorAggForSelected.lastEnteredAt ? ` (${new Date(priorAggForSelected.lastEnteredAt).toLocaleString()})` : ""}
                        {priorAggForSelected.lastSourceNote ? `: ${priorAggForSelected.lastSourceNote}` : ""}
                      </p>
                    )}
                    <div className="border-t border-[var(--ac-border)] pt-4 space-y-3">
                      <h4 className="ac-text-secondary text-xs font-semibold uppercase tracking-wide">Add prior-system entry</h4>
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
                          disabled={savingPrior || !!priorEntryBlockedReason}
                        />
                      </div>
                      <div>
                        <label className="ac-text-secondary mb-1 block text-sm font-medium">Note</label>
                        <textarea
                          value={priorNote}
                          onChange={(e) => setPriorNote(e.target.value)}
                          className="ac-input min-h-[72px] resize-y"
                          placeholder="e.g. Old Excel Term 2 2024"
                          disabled={savingPrior || !!priorEntryBlockedReason}
                          rows={2}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPriorEntry}
                        disabled={savingPrior || !userId || !!priorEntryBlockedReason}
                        className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        {savingPrior ? "Saving…" : "Add prior-system entry"}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleGenerateSingle}
                  disabled={generating || !selectedTerm || !selectedStudent}
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
