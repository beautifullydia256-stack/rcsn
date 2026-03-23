/**
 * Record school expenses: main → subcategory → line item, with salary/staff linking
 * and legacy flat categories if hierarchy tables are not seeded yet.
 */
import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { EXPENSES_QUERY_KEY } from "../../pages/accountant/api/expenses";
import { FINANCIAL_ANALYTICS_QUERY_KEY } from "../../pages/finance/fetchFinancialAnalytics";
import {
  fetchExpenseMainCategories,
  fetchExpenseSubcategories,
  fetchRecentExpenseDescriptions,
  type ExpenseMainCategoryRow,
  type ExpenseSubcategoryRow,
} from "../../pages/accountant/api/expenseHierarchy";
import { DollarSign, X, Info, Zap } from "lucide-react";

export type RecordExpenseModalProps = {
  open: boolean;
  onClose: () => void;
};

type TermRow = { id: string; term: number; year: number; label: string };
type LegacyCat = { category_id: string; category_name: string };

type TeacherLite = { teacher_id: string; name: string; salary: number | null; employee_id: string | null };
type OtherStaffLite = { id: string; full_name: string; job_title: string | null; salary_amount: number | null };

type StaffPick = { kind: "teacher"; id: string; name: string } | { kind: "other"; id: string; name: string };

function localTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Quick-fill: map to main code + exact subcategory name (must match seeded defaults). */
const QUICK_ACTIONS: { label: string; main: string; subName: string }[] = [
  { label: "Add fuel expense", main: "transport", subName: "Fuel" },
  { label: "Food purchase", main: "feeding_boarding", subName: "Food supplies" },
  { label: "Pay teacher salaries", main: "academic_instructional", subName: "Teacher salaries" },
  { label: "Office supplies", main: "administrative", subName: "Office supplies" },
  { label: "Utilities (electricity)", main: "utilities", subName: "Electricity" },
];

export default function RecordExpenseModal({ open, onClose }: RecordExpenseModalProps) {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);

  const [mainCategories, setMainCategories] = useState<ExpenseMainCategoryRow[]>([]);
  const [subcategories, setSubcategories] = useState<ExpenseSubcategoryRow[]>([]);
  const [useLegacyCategories, setUseLegacyCategories] = useState(false);
  const [legacyCategories, setLegacyCategories] = useState<LegacyCat[]>([]);
  const [legacyCategoryId, setLegacyCategoryId] = useState("");

  const [mainCode, setMainCode] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => localTodayIso());
  const [paymentMethod, setPaymentMethod] = useState<string>("bank");
  const [submitForApprovalOnly, setSubmitForApprovalOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [receiptUrl, setReceiptUrl] = useState("");

  const [teachers, setTeachers] = useState<TeacherLite[]>([]);
  const [otherStaff, setOtherStaff] = useState<OtherStaffLite[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffPick | null>(null);
  const [salaryMonth, setSalaryMonth] = useState(() => new Date().getMonth());
  const [salaryYear, setSalaryYear] = useState(() => new Date().getFullYear());

  const resetForm = useCallback(() => {
    setMainCode("");
    setSubcategoryId("");
    setLegacyCategoryId("");
    setDescription("");
    setAmount("");
    setMessage("");
    setExpenseDate(localTodayIso());
    setSubmitForApprovalOnly(false);
    setReceiptUrl("");
    setStaffSearch("");
    setSelectedStaff(null);
    setSalaryMonth(new Date().getMonth());
    setSalaryYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || !schoolId) return;
    void (async () => {
      const [mains, subs, sug, termRes, teachersRes, otherRes, legacyRes] = await Promise.all([
        fetchExpenseMainCategories().catch(() => [] as ExpenseMainCategoryRow[]),
        fetchExpenseSubcategories(schoolId).catch(() => [] as ExpenseSubcategoryRow[]),
        fetchRecentExpenseDescriptions(schoolId),
        supabase
          .from("school_terms")
          .select("id, term, year, start_date, end_date")
          .eq("school_id", schoolId)
          .order("year", { ascending: false })
          .order("term", { ascending: false }),
        supabase.from("teachers").select("teacher_id, name, salary, employee_id").eq("school_id", schoolId).order("name"),
        supabase
          .from("other_staff_members")
          .select("id, full_name, job_title, salary_amount")
          .eq("school_id", schoolId)
          .order("full_name"),
        supabase.from("expense_categories").select("category_id, category_name").eq("school_id", schoolId).eq("is_active", true).order("category_name"),
      ]);

      setMainCategories(mains);
      setSubcategories(subs);
      setSuggestions(sug);
      setTeachers((teachersRes.data || []) as TeacherLite[]);
      setOtherStaff((otherRes.data || []) as OtherStaffLite[]);

      const legacy = (legacyRes.data || []) as LegacyCat[];
      setLegacyCategories(legacy);
      const hierarchyReady = subs.length > 0;
      setUseLegacyCategories(!hierarchyReady);
      if (hierarchyReady && mains.length) {
        setMainCode(mains[0].code);
      } else if (!hierarchyReady && legacy.length) {
        setLegacyCategoryId(legacy[0].category_id);
      }

      const trows = (termRes.data || []) as {
        id: string;
        term: number;
        year: number;
        start_date: string | null;
        end_date: string | null;
      }[];
      setTerms(
        trows.map((t) => ({
          id: t.id,
          term: t.term,
          year: t.year,
          label: `Term ${t.term}, ${t.year}`,
        }))
      );
      const today = localTodayIso();
      const current = trows.find((t) => t.start_date && t.end_date && t.start_date <= today && t.end_date >= today);
      if (current) setTermId(current.id);
      else if (trows[0]) setTermId(trows[0].id);
    })();
  }, [open, schoolId]);

  const filteredSubs = useMemo(() => {
    if (!mainCode) return [];
    return subcategories.filter((s) => s.main_category_code === mainCode);
  }, [subcategories, mainCode]);

  const selectedSub = useMemo(
    () => subcategories.find((s) => s.subcategory_id === subcategoryId) || null,
    [subcategories, subcategoryId]
  );

  const mainLabel = useMemo(() => mainCategories.find((m) => m.code === mainCode)?.label_en || "", [mainCategories, mainCode]);

  useEffect(() => {
    if (!filteredSubs.length) {
      setSubcategoryId("");
      return;
    }
    if (!filteredSubs.some((s) => s.subcategory_id === subcategoryId)) {
      setSubcategoryId(filteredSubs[0].subcategory_id);
    }
  }, [filteredSubs, subcategoryId]);

  const staffMatches = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return { teachers: teachers.slice(0, 8), other: otherStaff.slice(0, 8) };
    const t = teachers
      .filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          (x.employee_id && x.employee_id.toLowerCase().includes(q))
      )
      .slice(0, 12);
    const o = otherStaff
      .filter(
        (x) =>
          x.full_name.toLowerCase().includes(q) ||
          (x.job_title && x.job_title.toLowerCase().includes(q))
      )
      .slice(0, 12);
    return { teachers: t, other: o };
  }, [staffSearch, teachers, otherStaff]);

  const applyQuickAction = (main: string, subName: string) => {
    setMainCode(main);
    const sub = subcategories.find((s) => s.main_category_code === main && s.name === subName);
    if (sub) setSubcategoryId(sub.subcategory_id);
  };

  const applySalaryDefaults = (staff: StaffPick, sub: ExpenseSubcategoryRow | null) => {
    if (!sub?.is_salary) return;
    const period = `${MONTH_NAMES[salaryMonth]} ${salaryYear}`;
    let amt = "";
    if (staff.kind === "teacher") {
      const row = teachers.find((t) => t.teacher_id === staff.id);
      if (row?.salary != null) amt = String(Math.round(Number(row.salary)));
    } else {
      const row = otherStaff.find((x) => x.id === staff.id);
      if (row?.salary_amount != null) amt = String(Math.round(Number(row.salary_amount)));
    }
    setDescription(`Salary payment for ${staff.name} – ${period}`);
    if (amt) setAmount(amt);
  };

  useEffect(() => {
    if (!selectedSub?.is_salary || !selectedStaff) return;
    applySalaryDefaults(selectedStaff, selectedSub);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional when staff/period changes
  }, [selectedStaff?.id, selectedStaff?.kind, selectedSub?.subcategory_id, salaryMonth, salaryYear]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setMessage("");
    onClose();
  }, [submitting, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!schoolId || !userId) {
      setMessage("Not signed in or school missing.");
      return;
    }
    const today = localTodayIso();
    if (expenseDate > today) {
      setMessage("Expense date cannot be in the future.");
      return;
    }
    const desc = description.trim();
    if (!desc) {
      setMessage("Enter a description (or pick staff for salary — it fills automatically).");
      return;
    }
    const amt = Number(String(amount).replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter a valid amount greater than zero.");
      return;
    }

    if (!useLegacyCategories) {
      if (!selectedSub) {
        setMessage("Choose a main category and subcategory.");
        return;
      }
      if (selectedSub.is_salary && !selectedStaff) {
        setMessage("Salary expenses require an employee to be selected (teacher or other staff).");
        return;
      }
    } else {
      const leg = legacyCategories.find((c) => c.category_id === legacyCategoryId);
      if (!leg) {
        setMessage("Choose a category.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const status = submitForApprovalOnly ? "pending" : "approved";
      const payload: Record<string, unknown> = {
        school_id: schoolId,
        description: desc,
        amount: amt,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        status,
        recorded_by: userId,
      };
      if (termId) payload.term_id = termId;
      if (receiptUrl.trim()) payload.receipt_attachment = receiptUrl.trim();

      if (useLegacyCategories) {
        const leg = legacyCategories.find((c) => c.category_id === legacyCategoryId)!;
        payload.category_id = leg.category_id;
        payload.category_name = leg.category_name;
      } else {
        payload.subcategory_id = selectedSub!.subcategory_id;
        payload.category_id = null;
        payload.category_name = `${mainLabel} — ${selectedSub!.name}`;
        if (selectedSub!.is_salary) {
          payload.salary_period_label = `${MONTH_NAMES[salaryMonth]} ${salaryYear}`;
          if (selectedStaff) {
            if (selectedStaff.kind === "teacher") payload.linked_teacher_id = selectedStaff.id;
            else payload.linked_other_staff_id = selectedStaff.id;
          }
        }
      }

      const { error } = await supabase.from("school_expenses").insert(payload);
      if (error) throw error;

      setDescription("");
      setAmount("");
      setMessage(
        status === "pending"
          ? "Expense submitted for approval. It will appear in reports after an admin approves it."
          : "Expense saved. It is included in cashflow and analytics (approved)."
      );
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
      queryClient.invalidateQueries({ queryKey: FINANCIAL_ANALYTICS_QUERY_KEY });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Could not save expense.";
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  const hierarchyReady = !useLegacyCategories && subcategories.length > 0 && mainCategories.length > 0;

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Record expense"
      onClick={handleClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="overflow-y-auto max-h-[92vh]">
          <div className="flex items-start gap-3 rounded-t-2xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-4 sm:px-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-white">Record expense</h2>
              <p className="mt-0.5 text-sm text-white/90">
                Structured categories (main → sub) for reporting. Salary lines link to staff. Fees use Record payment.
              </p>
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
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex gap-2 rounded-lg border border-amber-100 bg-amber-50/90 p-3 text-sm text-amber-950">
                <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" aria-hidden />
                <p>
                  <strong className="font-semibold">Fees vs expenses:</strong> Student fees are <em>Record payment</em>. Everything here is
                  school spending (salaries, fuel, food, etc.). Cashflow and Financial Analytics include <strong>approved</strong> or{" "}
                  <strong>paid</strong> lines only.
                </p>
              </div>

              {useLegacyCategories && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Hierarchy not seeded for this school — using legacy categories. Run the latest Supabase migration for full main/sub reporting.
                </p>
              )}

              {hierarchyReady && (
                <>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Zap className="h-3.5 w-3.5" aria-hidden />
                      Quick entry
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_ACTIONS.map((q) => (
                        <button
                          key={q.label}
                          type="button"
                          onClick={() => applyQuickAction(q.main, q.subName)}
                          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Main category</label>
                      <select className={inputClass} value={mainCode} onChange={(e) => setMainCode(e.target.value)} required>
                        {mainCategories.map((m) => (
                          <option key={m.code} value={m.code}>
                            {m.label_en}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Subcategory</label>
                      <select className={inputClass} value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} required>
                        {filteredSubs.map((s) => (
                          <option key={s.subcategory_id} value={s.subcategory_id}>
                            {s.name}
                            {s.is_salary ? " (salary)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {useLegacyCategories && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                  <select
                    className={inputClass}
                    value={legacyCategoryId}
                    onChange={(e) => setLegacyCategoryId(e.target.value)}
                    required
                  >
                    {legacyCategories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedSub?.is_salary && hierarchyReady && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Salary payment</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Pay period (month)</label>
                      <select className={inputClass} value={salaryMonth} onChange={(e) => setSalaryMonth(Number(e.target.value))}>
                        {MONTH_NAMES.map((name, i) => (
                          <option key={name} value={i}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Year</label>
                      <input
                        type="number"
                        className={inputClass}
                        min={2020}
                        max={2100}
                        value={salaryYear}
                        onChange={(e) => setSalaryYear(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Search employee</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      placeholder="Name, role, or staff ID…"
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Teachers</p>
                      <ul className="max-h-36 overflow-auto rounded-lg border border-slate-200 bg-white text-sm">
                        {staffMatches.teachers.length === 0 ? (
                          <li className="px-3 py-2 text-slate-500">No match</li>
                        ) : (
                          staffMatches.teachers.map((t) => (
                            <li key={t.teacher_id}>
                              <button
                                type="button"
                                className={`w-full px-3 py-2 text-left hover:bg-emerald-50 ${selectedStaff?.kind === "teacher" && selectedStaff.id === t.teacher_id ? "bg-emerald-100" : ""}`}
                                onClick={() => {
                                  setSelectedStaff({ kind: "teacher", id: t.teacher_id, name: t.name });
                                  setStaffSearch(t.name);
                                }}
                              >
                                <span className="font-medium text-slate-800">{t.name}</span>
                                {t.employee_id ? <span className="text-slate-500"> · {t.employee_id}</span> : null}
                                <span className="block text-xs text-slate-500">Teacher</span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Other staff</p>
                      <ul className="max-h-36 overflow-auto rounded-lg border border-slate-200 bg-white text-sm">
                        {staffMatches.other.length === 0 ? (
                          <li className="px-3 py-2 text-slate-500">No match</li>
                        ) : (
                          staffMatches.other.map((o) => (
                            <li key={o.id}>
                              <button
                                type="button"
                                className={`w-full px-3 py-2 text-left hover:bg-emerald-50 ${selectedStaff?.kind === "other" && selectedStaff.id === o.id ? "bg-emerald-100" : ""}`}
                                onClick={() => {
                                  setSelectedStaff({ kind: "other", id: o.id, name: o.full_name });
                                  setStaffSearch(o.full_name);
                                }}
                              >
                                <span className="font-medium text-slate-800">{o.full_name}</span>
                                {o.job_title ? <span className="text-slate-500"> · {o.job_title}</span> : null}
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                  {selectedStaff && (
                    <p className="text-xs text-slate-600">
                      Selected: <strong>{selectedStaff.name}</strong> ({selectedStaff.kind === "teacher" ? "Teacher" : "Other staff"})
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description (line item)</label>
                <input
                  type="text"
                  className={inputClass}
                  list="expense-desc-suggestions"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Fuel for Bus UAA 123X"
                  autoComplete="off"
                />
                <datalist id="expense-desc-suggestions">
                  {suggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Amount (UGX)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputClass}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Expense date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={expenseDate}
                    max={localTodayIso()}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Payment method</label>
                <select className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Receipt link (optional)</label>
                <input
                  type="url"
                  className={inputClass}
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Term (optional)</label>
                <select className={inputClass} value={termId} onChange={(e) => setTermId(e.target.value)}>
                  <option value="">— Not linked to a term —</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  checked={submitForApprovalOnly}
                  onChange={(e) => setSubmitForApprovalOnly(e.target.checked)}
                />
                <span>Submit for approval only (pending). Admin must approve before it appears in cashflow and analytics.</span>
              </label>

              {message && (
                <p
                  className={`text-sm ${message.includes("saved") || message.includes("submitted") ? "text-emerald-700" : "text-red-600"}`}
                >
                  {message}
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting || (useLegacyCategories && !legacyCategories.length) || (!useLegacyCategories && !subcategories.length)}
                  className="inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-amber-500 hover:to-orange-500 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : submitForApprovalOnly ? "Submit for approval" : "Save expense"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
