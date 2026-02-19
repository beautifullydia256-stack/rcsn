import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type FeeRow = { id: string; class_name: string; tuition_amount: number };
type TermRow = { id: string; term: number; year: number };
type StudentRow = { student_id: string; name: string; current_class: string; class_id: string | null };

export default function BillingPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateMode, setGenerateMode] = useState<"bulk" | "single">("bulk");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [singleAmount, setSingleAmount] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    void (async () => {
      const [fRes, tRes, sRes, balRes] = await Promise.all([
        supabase.from("school_fee_structure").select("id, class_name, tuition_amount").eq("school_id", schoolId).order("class_name"),
        supabase.from("school_terms").select("id, term, year").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false }),
        supabase.from("students").select("student_id, name, current_class, class_id").eq("school_id", schoolId).eq("status", "active").order("name"),
        supabase.from("student_balances").select("student_id").eq("school_id", schoolId).gt("balance", 0),
      ]);
      setFees((fRes.data || []) as FeeRow[]);
      const termList = (tRes.data || []) as TermRow[];
      setTerms(termList);
      if (termList.length && !selectedTerm) setSelectedTerm(termList[0].id);
      const active = (sRes.data || []) as StudentRow[];
      const balanceStudentIds = [...new Set((balRes.data || []).map((b: { student_id: string }) => b.student_id))];
      const activeIds = new Set(active.map((s) => s.student_id));
      const debtorIds = balanceStudentIds.filter((id) => !activeIds.has(id));
      let merged: StudentRow[] = [...active];
      if (debtorIds.length > 0) {
        const { data: debtors } = await supabase
          .from("students")
          .select("student_id, name, current_class, class_id")
          .eq("school_id", schoolId)
          .in("student_id", debtorIds);
        merged = [...active, ...((debtors || []) as StudentRow[])];
      }
      if (merged.length === 0 && balanceStudentIds.length > 0) {
        const { data: fromBalances } = await supabase
          .from("students")
          .select("student_id, name, current_class, class_id")
          .eq("school_id", schoolId)
          .in("student_id", balanceStudentIds);
        merged = ((fromBalances || []) as StudentRow[]).sort((a, b) => a.name.localeCompare(b.name));
      } else {
        merged.sort((a, b) => a.name.localeCompare(b.name));
      }
      setStudents(merged);
      setLoading(false);
    })();
  }, [schoolId]);

  const classNames = fees.map((r) => r.class_name);
  const studentsInClass = selectedClass ? students.filter((s) => s.current_class === selectedClass) : [];
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

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Invoices & Billing</h1>
        <button
          type="button"
          onClick={() => navigate("/dashboard/accountant")}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Generate invoice</h2>
          <p className="mt-0.5 text-xs text-slate-500">Create a bill so the student has a balance. Record payment only after an invoice exists.</p>
        </div>
        <div className="p-4">
          <div className="mb-4 flex gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setGenerateMode("bulk")}
              className={`pb-2 text-sm font-medium ${generateMode === "bulk" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-slate-500"}`}
            >
              Bulk by class
            </button>
            <button
              type="button"
              onClick={() => setGenerateMode("single")}
              className={`pb-2 text-sm font-medium ${generateMode === "single" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-slate-500"}`}
            >
              Single student
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Term</label>
              <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className={inputClass}>
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Class</label>
                  <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={inputClass}>
                    <option value="">Select class</option>
                    {classNames.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedClass && (
                  <p className="text-sm text-slate-600">
                    {studentsInClass.length} student(s) in {selectedClass}. Tuition: {Number(tuitionForClass).toLocaleString()}.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleGenerateBulk}
                  disabled={generating || !selectedTerm || !selectedClass || studentsInClass.length === 0}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {generating ? "Generating…" : `Generate invoices for ${selectedClass || "class"}`}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Student</label>
                  <input
                    type="text"
                    value={selectedStudent ? (selectedStudentRow ? `${selectedStudentRow.name} (${selectedStudentRow.current_class})` : "") : studentSearchQuery}
                    onChange={(e) => {
                      setSelectedStudent("");
                      setStudentSearchQuery(e.target.value);
                    }}
                    placeholder="Search by name or class…"
                    className={inputClass}
                    aria-label="Search students"
                  />
                  {!selectedStudent && studentSearchQuery.trim() !== "" && (
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                      {studentOptions.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-slate-500">
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
                                className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
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
                    <p className="mt-1 text-xs text-slate-600">
                      Selected: {selectedStudentRow.name} ({selectedStudentRow.current_class}){" "}
                      <button
                        type="button"
                        onClick={() => setSelectedStudent("")}
                        className="text-emerald-600 hover:underline"
                      >
                        Clear
                      </button>
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleAmount || (selectedStudent ? suggestedAmount : "")}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    className={inputClass}
                    placeholder={selectedStudent ? String(suggestedAmount) : ""}
                  />
                  {selectedStudent && suggestedAmount > 0 && (
                    <p className="mt-1 text-xs text-slate-500">Suggested from fee structure: {suggestedAmount.toLocaleString()}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSingle}
                  disabled={generating || !selectedTerm || !selectedStudent}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {generating ? "Generating…" : "Generate invoice"}
                </button>
              </>
            )}
          </div>
          {message && (
            <p className={`mt-4 text-sm ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>
          )}
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Fee structure (per class)</h2>
          <p className="mt-0.5 text-xs text-slate-500">Used to create invoices. Managed in Admin → Settings → Financial.</p>
        </div>
        {loading ? (
          <div className="p-6 text-slate-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left font-medium text-slate-600">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Tuition amount</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                      No fee structure. Add in Admin settings.
                    </td>
                  </tr>
                ) : (
                  fees.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.class_name}</td>
                      <td className="px-4 py-3">{Number(r.tuition_amount).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
