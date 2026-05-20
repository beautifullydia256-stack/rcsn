import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { fetchBillingData, BILLING_QUERY_KEY } from "./api/billing";
import { useCurrentTerm } from "../../lib/useCurrentTerm";

const STALE_MS = 2 * 60 * 1000;

const DEFAULT_SUPPLEMENTARY_LABEL = "Outstanding balance from previous terms";

/** Exists when student already has is_supplementary = false invoice for this term */
const mainInvoiceQueryKey = (schoolId: string, studentId: string, termId: string) =>
  [...BILLING_QUERY_KEY, "mainInvoice", schoolId, studentId, termId] as const;

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
  const students = data?.students ?? [];
  const studentsError = data?.studentsError ?? null;
  const termInvoiceOutstandingByStudent = data?.termInvoiceOutstandingByStudent ?? {};

  const { currentTerm, isLoading: termLoading } = useCurrentTerm(schoolId);
  const currentTermResolved = !termLoading;

  const [generateMode, setGenerateMode] = useState<"bulk" | "single">("bulk");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
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
    const label =
      supplementaryLabel.trim() || DEFAULT_SUPPLEMENTARY_LABEL;
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
        text: `Added “${label}” (${amt.toLocaleString()}) on the current term. It appears in Record Payment with the rest of this term’s balance. You can add more lines or generate the main term fee invoice first—order does not matter.`,
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
          text: `No new invoices: every student in ${selectedClass} already has the main term fee invoice for the current term.`,
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
        .eq("is_supplementary", false)
        .neq("status", "cancelled")
        .maybeSingle();
      if (existingInv) {
        setMessage({
          type: "err",
          text: "This student already has the main term fee invoice. Use “Additional charge” below to add brought-forward or other amounts on the same term.",
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
      setMessage({ type: "ok", text: `Invoice generated for ${st.name}. You can now record payments.` });
      setSelectedStudent("");
      setStudentSearchQuery("");
      setSingleAmount("");
      await queryClient.invalidateQueries({ queryKey: [...BILLING_QUERY_KEY, "mainInvoice", schoolId] });
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
                {selectedStudent &&
                  currentTermResolved &&
                  (canCheckMainInvoice && mainInvoicePending ? (
                    <p className="ac-text-muted text-sm">Checking whether a main fee invoice already exists for this term…</p>
                  ) : canCheckMainInvoice && !hasMainInvoiceForCurrentTerm ? (
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
                        <p className="ac-text-muted mt-1 text-xs">
                          Suggested from fee structure: {suggestedAmount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ) : canCheckMainInvoice && hasMainInvoiceForCurrentTerm ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                      Main term fee invoice for <strong>this</strong> term is already created. Use{" "}
                      <strong>Additional charge</strong> below only if you need another line (brought-forward, etc.) on
                      the same term.
                    </div>
                  ) : null)}
                {selectedStudent && selectedStudentRow && (
                  <div className="rounded-xl border border-[var(--ac-border)] bg-white/5 p-4 space-y-4">
                    <h3 className="ac-text-primary text-sm font-semibold">Outstanding balance</h3>
                    <p className="ac-text-muted text-xs">
                      This is the total the student still owes across <strong>all</strong> terms.
                      {canCheckMainInvoice &&
                      !mainInvoicePending &&
                      !hasMainInvoiceForCurrentTerm &&
                      currentTerm?.id
                        ? " Use Generate invoice (below) once for the usual term fee when none exists yet for this term."
                        : canCheckMainInvoice && !mainInvoicePending && hasMainInvoiceForCurrentTerm
                          ? " The main fee for the current term is already invoiced; add more with Additional charge if needed."
                          : ""}{" "}
                      <strong>Additional charge</strong> adds a labelled invoice line on the <strong>current term</strong>{" "}
                      only.
                    </p>
                    <dl className="grid gap-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="ac-text-secondary">Term invoices (remaining)</dt>
                        <dd className="ac-text-primary font-medium tabular-nums">
                          {isLoading ? "…" : termOutstandingForSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </dd>
                      </div>
                    </dl>
                    <div className="border-t border-[var(--ac-border)] pt-4 space-y-3">
                      <h4 className="ac-text-secondary text-xs font-semibold uppercase tracking-wide">
                        Additional charge (same term)
                      </h4>
                      <p className="ac-text-muted text-xs">
                        Creates <strong>another invoice</strong> on the <strong>active term shown above</strong> (not an old calendar term). Payments for this term apply to the main fee first, then these extra lines. Rename the label anything your school understands.
                      </p>
                      <div>
                        <label className="ac-text-secondary mb-1 block text-xs font-medium">Label on invoice</label>
                        <input
                          type="text"
                          value={supplementaryLabel}
                          onChange={(e) => setSupplementaryLabel(e.target.value)}
                          className="ac-input text-sm"
                          disabled={savingSupplementary}
                          placeholder={DEFAULT_SUPPLEMENTARY_LABEL}
                        />
                      </div>
                      <div>
                        <label className="ac-text-secondary mb-1 block text-sm font-medium">Amount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={supplementaryAmount}
                          onChange={(e) => setSupplementaryAmount(e.target.value)}
                          className="ac-input tabular-nums"
                          placeholder="e.g. 150000"
                          disabled={savingSupplementary}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAddSupplementaryInvoice()}
                        disabled={savingSupplementary || !userId || !currentTerm?.id}
                        className="ac-glass-btn rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        {savingSupplementary ? "Saving…" : "Add additional charge on current term"}
                      </button>
                    </div>
                  </div>
                )}
                {!hasMainInvoiceForCurrentTerm &&
                  !mainInvoicePending &&
                  canCheckMainInvoice &&
                  selectedStudent &&
                  currentTermResolved && (
                  <button
                    type="button"
                    onClick={handleGenerateSingle}
                    disabled={generating || !currentTerm?.id || !selectedStudent}
                    className="ac-glass-btn rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                  >
                    {generating ? "Generating…" : "Generate invoice"}
                  </button>
                )}
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
