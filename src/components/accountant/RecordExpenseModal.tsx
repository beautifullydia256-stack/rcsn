/**
 * Record school expenses: main → subcategory → line item, with salary/staff linking
 * and legacy flat categories if hierarchy tables are not seeded yet.
 */
import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { Link } from "react-router-dom";
import NativeModal from "@/components/NativeModal";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { hasPermission, PERMISSION_KEYS } from "../../lib/permissions";
import { EXPENSES_QUERY_KEY } from "../../pages/accountant/api/expenses";
import { FINANCIAL_ANALYTICS_QUERY_KEY } from "../../pages/finance/fetchFinancialAnalytics";
import {
  fetchExistingSalaryForPeriod,
  salaryPeriodLabel,
  type ExistingSalaryRow,
} from "../../pages/accountant/api/expensePayroll";
import {
  fetchExpenseMainCategories,
  fetchExpenseSubcategories,
  fetchRecentExpenseDescriptions,
  type ExpenseMainCategoryRow,
  type ExpenseSubcategoryRow,
} from "../../pages/accountant/api/expenseHierarchy";
import { Info, Zap } from "lucide-react";

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
  const role = useAuthStore((s) => s.role);
  const delegatedPermissions = useAuthStore((s) => s.permissions);

  const canDirectApproveExpense = useMemo(() => {
    if (role === "admin" || role === "owner") return true;
    return hasPermission(delegatedPermissions, PERMISSION_KEYS.expensesDirectApprove);
  }, [role, delegatedPermissions]);

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
  /** When true, expense is pending (default — all entries require admin approval unless user can direct-approve and unchecks). */
  const [submitForApprovalOnly, setSubmitForApprovalOnly] = useState(true);
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
  const [existingSalaryRows, setExistingSalaryRows] = useState<ExistingSalaryRow[]>([]);
  const [salaryDuplicateAck, setSalaryDuplicateAck] = useState(false);
  const [savedExpenseId, setSavedExpenseId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setMainCode("");
    setSubcategoryId("");
    setLegacyCategoryId("");
    setDescription("");
    setAmount("");
    setMessage("");
    setExpenseDate(localTodayIso());
    setSubmitForApprovalOnly(true);
    setReceiptUrl("");
    setStaffSearch("");
    setSelectedStaff(null);
    setSalaryMonth(new Date().getMonth());
    setSalaryYear(new Date().getFullYear());
    setExistingSalaryRows([]);
    setSalaryDuplicateAck(false);
    setSavedExpenseId(null);
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

  useEffect(() => {
    setSalaryDuplicateAck(false);
  }, [salaryMonth, salaryYear, selectedStaff?.id, selectedStaff?.kind]);

  useEffect(() => {
    if (!open || !schoolId || !selectedSub?.is_salary || !selectedStaff || useLegacyCategories) {
      setExistingSalaryRows([]);
      return;
    }
    const period = salaryPeriodLabel(salaryMonth, salaryYear, MONTH_NAMES);
    void (async () => {
      try {
        const rows = await fetchExistingSalaryForPeriod(
          schoolId,
          period,
          selectedStaff.kind === "teacher" ? { teacherId: selectedStaff.id } : { otherStaffId: selectedStaff.id }
        );
        setExistingSalaryRows(rows);
      } catch {
        setExistingSalaryRows([]);
      }
    })();
  }, [open, schoolId, selectedSub?.is_salary, selectedStaff, salaryMonth, salaryYear, useLegacyCategories]);

  const expectedSalaryUgx = useMemo(() => {
    if (!selectedStaff || !selectedSub?.is_salary) return null;
    if (selectedStaff.kind === "teacher") {
      const row = teachers.find((t) => t.teacher_id === selectedStaff.id);
      return row?.salary != null ? Math.round(Number(row.salary)) : null;
    }
    const row = otherStaff.find((x) => x.id === selectedStaff.id);
    return row?.salary_amount != null ? Math.round(Number(row.salary_amount)) : null;
  }, [selectedStaff, selectedSub, teachers, otherStaff]);

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

    if (!useLegacyCategories && selectedSub?.is_salary && selectedStaff && existingSalaryRows.length > 0 && !salaryDuplicateAck) {
      setMessage(
        "This month is already catered for — this person has a salary line for this pay period. Change the month/year, or tick the box below only if you must add another line (e.g. split payment across mobile money and bank)."
      );
      return;
    }

    setSubmitting(true);
    try {
      const status =
        canDirectApproveExpense && !submitForApprovalOnly ? "approved" : "pending";
      const descWithExternal = receiptUrl.trim() ? `${desc}\n\nExternal receipt / proof: ${receiptUrl.trim()}` : desc;
      const payload: Record<string, unknown> = {
        school_id: schoolId,
        description: descWithExternal,
        amount: amt,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        status,
        recorded_by: userId,
      };
      if (termId) payload.term_id = termId;

      let categoryNameForRef = "";
      if (useLegacyCategories) {
        const leg = legacyCategories.find((c) => c.category_id === legacyCategoryId)!;
        payload.category_id = leg.category_id;
        payload.category_name = leg.category_name;
        categoryNameForRef = leg.category_name;
      } else {
        payload.subcategory_id = selectedSub!.subcategory_id;
        payload.category_id = null;
        categoryNameForRef = `${mainLabel} — ${selectedSub!.name}`;
        payload.category_name = categoryNameForRef;
        if (selectedSub!.is_salary) {
          payload.salary_period_label = `${MONTH_NAMES[salaryMonth]} ${salaryYear}`;
          if (selectedStaff) {
            if (selectedStaff.kind === "teacher") payload.linked_teacher_id = selectedStaff.id;
            else payload.linked_other_staff_id = selectedStaff.id;
          }
        }
      }

      const { data: refNum, error: refErr } = await supabase.rpc("generate_expense_reference", {
        p_school_id: schoolId,
        p_expense_date: expenseDate,
        p_category_name: categoryNameForRef,
      });
      if (refErr) console.warn("generate_expense_reference", refErr);
      if (typeof refNum === "string" && refNum.trim()) payload.reference_number = refNum.trim();

      const { data: inserted, error } = await supabase.from("school_expenses").insert(payload).select("expense_id").single();
      if (error) throw error;

      const newId = inserted?.expense_id;

      setDescription("");
      setAmount("");
      setSavedExpenseId(newId ?? null);
      setMessage(
        status === "pending"
          ? "Expense submitted for approval. It will appear in reports after an admin approves it."
          : "Expense saved. It is included in cashflow and analytics (approved)."
      );
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
      queryClient.invalidateQueries({ queryKey: FINANCIAL_ANALYTICS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["teacher", "dashboard-stats"] });
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

  const fieldBase =
    "w-full min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm " +
    "bg-white text-slate-900 placeholder:text-slate-400 " +
    "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 " +
    "focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35";
  const selectFieldClass =
    `${fieldBase} cursor-pointer appearance-none pr-10 [color-scheme:light] dark:[color-scheme:dark]`;
  const inputClass = fieldBase;
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200";

  const hierarchyReady = !useLegacyCategories && subcategories.length > 0 && mainCategories.length > 0;

  if (!open) return null;

  return (
    <NativeModal isOpen={open} onClose={handleClose} title="Record expense" size="lg">
      <p className="-mt-1 mb-4 text-sm text-slate-600 dark:text-slate-400">
        Structured categories (main → sub) for reporting. Salary lines link to staff. Fees use Record payment.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3 text-sm text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            <Info className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400 mt-0.5" aria-hidden />
            <p>
              <strong className="font-semibold">Fees vs expenses:</strong> Student fees are <em>Record payment</em>. Everything here is
              school spending (salaries, fuel, food, etc.). New expenses are <strong>pending</strong> until an admin approves them (unless your school granted you “Approve expenses on entry” on Access & permissions). Cashflow and analytics use <strong>approved</strong> or <strong>paid</strong> lines only.
            </p>
          </div>

          {useLegacyCategories && (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100">
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
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Main category</label>
                      <select className={selectFieldClass} value={mainCode} onChange={(e) => setMainCode(e.target.value)} required>
                        {mainCategories.map((m) => (
                          <option key={m.code} value={m.code}>
                            {m.label_en}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Subcategory</label>
                      <select className={selectFieldClass} value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} required>
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Pay period (month)</label>
                      <select className={selectFieldClass} value={salaryMonth} onChange={(e) => setSalaryMonth(Number(e.target.value))}>
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
                      <ul className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white text-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0">
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
                      <ul className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white text-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0">
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
                    <div className="space-y-2 text-xs text-slate-600">
                      <p>
                        Selected: <strong>{selectedStaff.name}</strong> ({selectedStaff.kind === "teacher" ? "Teacher" : "Other staff"})
                      </p>
                      {expectedSalaryUgx != null && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-emerald-950">
                          <span>
                            Monthly salary on file: <strong>{expectedSalaryUgx.toLocaleString()} UGX</strong>
                          </span>
                          <button
                            type="button"
                            className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                            onClick={() => setAmount(String(expectedSalaryUgx))}
                          >
                            Fill full amount
                          </button>
                        </div>
                      )}
                      {expectedSalaryUgx == null && (
                        <p className="text-amber-900">No salary on file for this person — enter the amount manually (e.g. partial pay).</p>
                      )}
                    </div>
                  )}
                  {existingSalaryRows.length > 0 && selectedStaff && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                      <p className="font-medium">This month is already catered for</p>
                      <p className="mt-1 text-xs opacity-90">
                        A salary entry already exists for {MONTH_NAMES[salaryMonth]} {salaryYear}. To avoid double payment, pick a different month or use the checkbox only for a deliberate second line.
                      </p>
                      <ul className="mt-1 list-disc pl-5 text-xs">
                        {existingSalaryRows.map((r) => (
                          <li key={r.expense_id}>
                            {r.description} — {Number(r.amount).toLocaleString()} UGX ({r.status})
                          </li>
                        ))}
                      </ul>
                      <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          checked={salaryDuplicateAck}
                          onChange={(e) => setSalaryDuplicateAck(e.target.checked)}
                        />
                        <span>
                          I need to add another line for this same period (correction, or split across mobile money and bank).
                        </span>
                      </label>
                    </div>
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
                  {selectedSub?.is_salary && hierarchyReady && (
                    <p className="mb-1 text-xs text-slate-500">Adjust for partial pay, or use “Fill full amount” in the salary section.</p>
                  )}
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
                <select className={selectFieldClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">External receipt / proof (optional)</label>
                <p className="mb-1 text-xs text-slate-500">
                  A permanent <strong>payment voucher link</strong> is saved automatically when you save. Add a URL here only for an extra external proof (e.g. mobile money screenshot hosted online).
                </p>
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
                <select className={selectFieldClass} value={termId} onChange={(e) => setTermId(e.target.value)}>
                  <option value="">— Not linked to a term —</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {!canDirectApproveExpense ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  This expense will be saved as <strong>pending</strong>. An admin must approve it on the admin dashboard before it appears in cashflow and financial analytics.
                </p>
              ) : (
                <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    checked={submitForApprovalOnly}
                    onChange={(e) => setSubmitForApprovalOnly(e.target.checked)}
                  />
                  <span>
                    Submit for approval only (recommended). Uncheck to record as <strong>approved</strong> immediately — use only when you are allowed to skip the admin review step.
                  </span>
                </label>
              )}

              {message && (
                <p
                  className={`text-sm ${message.includes("saved") || message.includes("submitted") ? "text-emerald-700" : "text-red-600"}`}
                >
                  {message}
                </p>
              )}
              {savedExpenseId && (
                <p className="text-sm text-emerald-800">
                  <Link
                    to={`/dashboard/expense-receipt/${savedExpenseId}`}
                    className="font-medium underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open payment voucher (print or save as PDF)
                  </Link>
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting || (useLegacyCategories && !legacyCategories.length) || (!useLegacyCategories && !subcategories.length)}
                  className="inline-flex flex-1 min-w-[140px] items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting
                    ? "Saving…"
                    : !canDirectApproveExpense || submitForApprovalOnly
                      ? "Submit for approval"
                      : "Save as approved"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
        </div>
      </form>
    </NativeModal>
  );
}
