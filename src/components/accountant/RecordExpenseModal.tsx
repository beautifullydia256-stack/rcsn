/**
 * Record school expenses: main → subcategory → line item, with salary/staff linking
 * and legacy flat categories if hierarchy tables are not seeded yet.
 */
import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { resolveCurrentSchoolTerm } from "../../lib/adminFinanceTerm";
import { useAuthStore } from "../../store/authStore";
import {
  enqueue,
  getOfflineExpenseMainCategories,
  getOfflineExpenseSubcategories,
  getOfflineExpenseLegacyCategories,
  cacheExpenseMainCategories,
  cacheExpenseSubcategories,
  cacheExpenseLegacyCategories,
} from "../../lib/offlineDb";
import { hasPermission, PERMISSION_KEYS } from "../../lib/permissions";
import { EXPENSES_QUERY_KEY } from "../../pages/accountant/api/expenses";
import { FINANCIAL_ANALYTICS_QUERY_KEY } from "../../pages/finance/fetchFinancialAnalytics";
import { invalidateAllFinancialQueries, broadcastFinanceUpdate } from "../../lib/realtimeFinanceSync";
import {
  fetchExistingSalaryForPeriod,
  salaryPeriodLabel,
  type ExistingSalaryRow,
} from "../../pages/accountant/api/expensePayroll";
import { calendarDateIsoInTimeZone } from "../../lib/schoolCalendarDate";
import {
  ExpenseReceipt,
  type ExpenseReceiptData,
} from "./ExpenseReceipt";
import {
  fetchExpenseMainCategories,
  fetchExpenseSubcategories,
  fetchRecentExpenseDescriptions,
  type ExpenseMainCategoryRow,
  type ExpenseSubcategoryRow,
} from "../../pages/accountant/api/expenseHierarchy";
import {
  DollarSign,
  Zap,
  X,
  ArrowDownRight,
  Fuel,
  Utensils,
  GraduationCap,
  Briefcase,
  Calendar,
  CheckCircle,
} from "lucide-react";
import NativeModal from "../NativeModal";
import LiquidGlassSelect from "../ui/LiquidGlassSelect";
import { useUIStore } from "../../store/uiStore";
import { getTokens, fmtUGX, SORA, INTER } from "../../styles/posThemeTokens";

export type RecordExpenseModalProps = {
  open: boolean;
  onClose: () => void;
};

type LegacyCat = { category_id: string; category_name: string };

type TeacherLite = { teacher_id: string; name: string; salary: number | null; employee_id: string | null };
type OtherStaffLite = { id: string; full_name: string; job_title: string | null; salary_amount: number | null };

type StaffPick = { kind: "teacher"; id: string; name: string } | { kind: "other"; id: string; name: string };

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
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank");
  /** When true, expense is pending (default — all entries require admin approval unless user can direct-approve and unchecks). */
  const [submitForApprovalOnly, setSubmitForApprovalOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [transactionId, setTransactionId] = useState("");

  const [teachers, setTeachers] = useState<TeacherLite[]>([]);
  const [otherStaff, setOtherStaff] = useState<OtherStaffLite[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffPick | null>(null);
  const [salaryMonth, setSalaryMonth] = useState(() => new Date().getMonth());
  const [salaryYear, setSalaryYear] = useState(() => new Date().getFullYear());
  const [existingSalaryRows, setExistingSalaryRows] = useState<ExistingSalaryRow[]>([]);
  const [salaryDuplicateAck, setSalaryDuplicateAck] = useState(false);
  const [savedExpenseId, setSavedExpenseId] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ExpenseReceiptData | null>(null);

  const resetForm = useCallback(() => {
    setMainCode("");
    setSubcategoryId("");
    setLegacyCategoryId("");
    setDescription("");
    setAmount("");
    setMessage("");
    setSubmitForApprovalOnly(true);
    setTransactionId("");
    setStaffSearch("");
    setSelectedStaff(null);
    setSalaryMonth(new Date().getMonth());
    setSalaryYear(new Date().getFullYear());
    setExistingSalaryRows([]);
    setSalaryDuplicateAck(false);
    setSavedExpenseId(null);
    setReceiptData(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || !schoolId) return;
    void (async () => {
      // Offline: category hierarchy comes from the local cache; staff lookup and recent-description
      // suggestions are online-only conveniences and are simply left empty (salary-linked expenses
      // still require being online to pick the right employee record).
      if (!navigator.onLine) {
        const [mains, subs, legacy] = await Promise.all([
          getOfflineExpenseMainCategories(),
          getOfflineExpenseSubcategories(schoolId),
          getOfflineExpenseLegacyCategories(schoolId),
        ]);
        setMainCategories(mains);
        setSubcategories(subs);
        setSuggestions([]);
        setTeachers([]);
        setOtherStaff([]);
        setLegacyCategories(legacy);
        const hierarchyReady = subs.length > 0;
        setUseLegacyCategories(!hierarchyReady);
        if (hierarchyReady && mains.length) {
          setMainCode(mains[0].code);
        } else if (!hierarchyReady && legacy.length) {
          setLegacyCategoryId(legacy[0].category_id);
        }
        return;
      }

      const [mains, subs, sug, teachersRes, otherRes, legacyRes] = await Promise.all([
        fetchExpenseMainCategories().catch(() => [] as ExpenseMainCategoryRow[]),
        fetchExpenseSubcategories(schoolId).catch(() => [] as ExpenseSubcategoryRow[]),
        fetchRecentExpenseDescriptions(schoolId),
        supabase.from("teachers").select("teacher_id, name, salary, employee_id").eq("school_id", schoolId).order("name"),
        supabase
          .from("other_staff_members")
          .select("id, full_name, job_title, salary_amount")
          .eq("school_id", schoolId)
          .order("full_name"),
        supabase.from("expense_categories").select("category_id, category_name").eq("school_id", schoolId).order("category_name"),
      ]);

      setMainCategories(mains);
      setSubcategories(subs);
      setSuggestions(sug);
      setTeachers((teachersRes.data || []) as TeacherLite[]);
      setOtherStaff((otherRes.data || []) as OtherStaffLite[]);

      if (mains.length) void cacheExpenseMainCategories(mains);
      if (subs.length) void cacheExpenseSubcategories(schoolId, subs);

      const legacy = (legacyRes.data || []) as LegacyCat[];
      setLegacyCategories(legacy);
      if (legacy.length) {
        void cacheExpenseLegacyCategories(
          schoolId,
          legacy.map((l) => ({ category_id: l.category_id, school_id: schoolId, category_name: l.category_name }))
        );
      }
      const hierarchyReady = subs.length > 0;
      setUseLegacyCategories(!hierarchyReady);
      if (hierarchyReady && mains.length) {
        setMainCode(mains[0].code);
      } else if (!hierarchyReady && legacy.length) {
        setLegacyCategoryId(legacy[0].category_id);
      }
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
    setReceiptData(null);
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

    // Offline: queue the expense — will sync when reconnected
    if (!navigator.onLine) {
      try {
        setSubmitting(true);
        const categoryLabel = useLegacyCategories
          ? (legacyCategories.find((c) => c.category_id === legacyCategoryId)?.category_name ?? "Expense")
          : `${mainLabel ?? ""} — ${selectedSub?.name ?? ""}`.trim().replace(/^—\s*/, "");
        await enqueue({
          action: {
            type: "expense",
            table: "school_expenses",
            rows: [{
              school_id: schoolId,
              description: desc,
              amount: amt,
              payment_method: paymentMethod,
              expense_date: new Date().toISOString().slice(0, 10),
              category_name: categoryLabel,
              status: "pending",
              recorded_by: userId,
              term_id: null,
              _offline_id: crypto.randomUUID(),
            }],
          },
          schoolId,
          createdAt: Date.now(),
        });
        setMessage("Expense saved offline — will sync automatically when you reconnect.");
        setTimeout(() => handleClose(), 2000);
      } catch {
        setMessage("Failed to save expense offline.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const currentTerm = await resolveCurrentSchoolTerm(supabase, schoolId);
      if (!currentTerm?.id) {
        setMessage(
          "No current school term is set. Configure terms and dates under Admin so expenses are recorded for the active period."
        );
        return;
      }

      const status =
        canDirectApproveExpense && !submitForApprovalOnly ? "approved" : "pending";
      /** Calendar date in school TZ at save time; pending rows get book date on admin approve. */
      const expenseDateIso = calendarDateIsoInTimeZone(new Date());
      const descWithTxn = transactionId.trim() ? `${desc}\n\nTransaction ID: ${transactionId.trim()}` : desc;
      const payload: Record<string, unknown> = {
        school_id: schoolId,
        description: descWithTxn,
        amount: amt,
        expense_date: expenseDateIso,
        payment_method: paymentMethod,
        status,
        recorded_by: userId,
        term_id: currentTerm.id,
      };
      if (status === "approved") {
        payload.approved_by = userId;
        payload.approved_at = new Date().toISOString();
      }

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
        p_expense_date: expenseDateIso,
        p_category_name: categoryNameForRef,
      });
      if (refErr) console.warn("generate_expense_reference", refErr);
      if (typeof refNum === "string" && refNum.trim()) payload.reference_number = refNum.trim();

      const { data: inserted, error } = await supabase.from("school_expenses").insert(payload).select("expense_id").single();
      if (error) throw error;

      const newId = inserted?.expense_id;

      // Generate receipt data for auto-display (like payment receipts)
      if (newId) {
        const { data: userRow } = await supabase.from("users").select("name").eq("user_id", userId).single();
        const { data: schoolRow } = await supabase.from("schools").select("name").eq("school_id", schoolId).single();
        const recordedByName = (userRow as { name?: string } | null)?.name?.trim() || "Staff";
        const schoolName = (schoolRow as { name?: string } | null)?.name?.trim();
        
        const receiptInfo: ExpenseReceiptData = {
          referenceNumber: String(payload.reference_number || "—"),
          schoolName,
          categoryName: categoryNameForRef,
          description: descWithTxn,
          amount: amt,
          paymentMethod,
          expenseDate: expenseDateIso,
          recordedBy: recordedByName,
          recordedAt: new Date().toLocaleString(),
          status,
          salaryPeriodLabel: payload.salary_period_label as string | null | undefined || null,
          payeeName: selectedStaff?.name || null,
          payeeRole: selectedStaff?.kind === "teacher" ? "Teacher" : selectedStaff?.kind === "other" ? "Staff" : null,
        };
        setReceiptData(receiptInfo);
      }

      setDescription("");
      setAmount("");
      setTransactionId("");
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
      if (schoolId) {
        invalidateAllFinancialQueries(queryClient, schoolId);
        broadcastFinanceUpdate({ type: 'expense', schoolId });
      }
      window.dispatchEvent(new CustomEvent('pweza:expense-updated'));
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

  const theme = useUIStore((s) => s.theme);
  const isDark = theme === "dark";
  const t = getTokens(isDark);

  const fieldBase =
    "w-full min-h-[44px] rounded-xl border px-3 py-2 text-sm transition-all " +
    "focus:outline-none";

  const hierarchyReady = !useLegacyCategories && subcategories.length > 0 && mainCategories.length > 0;

  if (!open && !receiptData) return null;

  const glassInputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm text-xs transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] outline-none";

  const glassLabelClass =
    "block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5";

  return (
    <>
      {receiptData && (
        <NativeModal
          isOpen={!!receiptData}
          onClose={() => setReceiptData(null)}
          title="Expense Payment Receipt"
          size="md"
        >
          <div className="space-y-4">
            <ExpenseReceipt data={receiptData} autoPrint />
            <button
              type="button"
              onClick={() => setReceiptData(null)}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all active:scale-[0.98]"
            >
              Close receipt
            </button>
          </div>
        </NativeModal>
      )}

      <NativeModal
        isOpen={open}
        onClose={handleClose}
        title="Record School Expense"
        icon={ArrowDownRight}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">


          {hierarchyReady && (
            <div className="space-y-4">
              {/* Quick Entry Presets */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/70 uppercase tracking-wider mb-2">
                  <Zap size={13} className="text-amber-300" />
                  <span>Quick Fill Presets</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((q) => {
                    const Icon =
                      q.main === "transport" ? Fuel :
                      q.main === "feeding_boarding" ? Utensils :
                      q.main === "academic_instructional" ? GraduationCap :
                      q.main === "administrative" ? Briefcase : Zap;
                    return (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => applyQuickAction(q.main, q.subName)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/90 backdrop-blur-sm transition-all active:scale-95"
                      >
                        <Icon size={12} className="text-emerald-300" />
                        <span>{q.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Category & Subcategory */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 relative z-30">
                <div>
                  <label className={glassLabelClass}>
                    Main Category <span className="text-amber-400">*</span>
                  </label>
                  <LiquidGlassSelect
                    value={mainCode}
                    onChange={(val) => setMainCode(val)}
                    options={mainCategories.map((m) => ({ value: m.code, label: m.label_en }))}
                    placeholder="Select main category"
                  />
                </div>
                <div>
                  <label className={glassLabelClass}>
                    Subcategory <span className="text-amber-400">*</span>
                  </label>
                  <LiquidGlassSelect
                    value={subcategoryId}
                    onChange={(val) => setSubcategoryId(val)}
                    options={filteredSubs.map((s) => ({
                      value: s.subcategory_id,
                      label: s.name + (s.is_salary ? " (salary)" : ""),
                    }))}
                    placeholder="Select subcategory"
                  />
                </div>
              </div>
            </div>
          )}

          {useLegacyCategories && (
            <div className="relative z-30">
              <label className={glassLabelClass}>
                Category <span className="text-amber-400">*</span>
              </label>
              <LiquidGlassSelect
                value={legacyCategoryId}
                onChange={(val) => setLegacyCategoryId(val)}
                options={legacyCategories.map((c) => ({ value: c.category_id, label: c.category_name }))}
                placeholder="Select category"
              />
            </div>
          )}

          {/* Salary Linked Employee Section */}
          {selectedSub?.is_salary && hierarchyReady && (
            <div className="rounded-2xl border border-white/20 bg-black/25 backdrop-blur-sm p-4 space-y-3 text-white relative z-25">
              <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide">
                <GraduationCap size={16} className="text-emerald-300" />
                <span>Staff Payroll Allocation</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 relative z-20">
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1">
                    Pay Period (Month)
                  </label>
                  <LiquidGlassSelect
                    value={String(salaryMonth)}
                    onChange={(val) => setSalaryMonth(Number(val))}
                    options={MONTH_NAMES.map((name, i) => ({ value: String(i), label: name }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    min={2020}
                    max={2100}
                    value={salaryYear}
                    onChange={(e) => setSalaryYear(Number(e.target.value))}
                    className={glassInputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1">
                  Search Employee
                </label>
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search name, role, or staff ID…"
                  autoComplete="off"
                  className={glassInputClass}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold text-white/70 mb-1.5 uppercase tracking-wider">
                    Teaching Staff
                  </p>
                  <ul className="rounded-xl border border-white/15 bg-black/35 p-1 max-h-36 overflow-y-auto text-xs no-scrollbar">
                    {staffMatches.teachers.length === 0 ? (
                      <li className="p-2 text-white/40">No matches found</li>
                    ) : (
                      staffMatches.teachers.map((st) => (
                        <li key={st.teacher_id}>
                          <button
                            type="button"
                            className={`w-full p-2 text-left rounded-lg transition-all ${
                              selectedStaff?.kind === "teacher" && selectedStaff.id === st.teacher_id
                                ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/30"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                            onClick={() => {
                              setSelectedStaff({ kind: "teacher", id: st.teacher_id, name: st.name });
                              setStaffSearch(st.name);
                            }}
                          >
                            <span className="font-semibold block">{st.name}</span>
                            {st.employee_id ? <span className="text-white/50 text-[10px]">ID: {st.employee_id} · Teacher</span> : <span className="text-white/50 text-[10px]">Teacher</span>}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/70 mb-1.5 uppercase tracking-wider">
                    Support & Admin Staff
                  </p>
                  <ul className="rounded-xl border border-white/15 bg-black/35 p-1 max-h-36 overflow-y-auto text-xs no-scrollbar">
                    {staffMatches.other.length === 0 ? (
                      <li className="p-2 text-white/40">No matches found</li>
                    ) : (
                      staffMatches.other.map((o) => (
                        <li key={o.id}>
                          <button
                            type="button"
                            className={`w-full p-2 text-left rounded-lg transition-all ${
                              selectedStaff?.kind === "other" && selectedStaff.id === o.id
                                ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/30"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                            onClick={() => {
                              setSelectedStaff({ kind: "other", id: o.id, name: o.full_name });
                              setStaffSearch(o.full_name);
                            }}
                          >
                            <span className="font-semibold block">{o.full_name}</span>
                            {o.job_title ? <span className="text-white/50 text-[10px]">{o.job_title}</span> : null}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
              {selectedStaff && (
                <div className="text-xs text-white space-y-2 pt-1">
                  <p>
                    Selected: <strong className="text-emerald-300">{selectedStaff.name}</strong> ({selectedStaff.kind === "teacher" ? "Teacher" : "Support staff"})
                  </p>
                  {expectedSalaryUgx != null && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/10 border border-white/20">
                      <span>
                        Monthly salary on file: <strong className="font-mono text-emerald-300">{expectedSalaryUgx.toLocaleString()} UGX</strong>
                      </span>
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-all active:scale-95"
                        onClick={() => setAmount(String(expectedSalaryUgx))}
                      >
                        Fill full amount
                      </button>
                    </div>
                  )}
                  {expectedSalaryUgx == null && (
                    <p className="text-amber-300 text-[11px]">
                      No fixed salary on file for this person — enter the disbursement amount manually.
                    </p>
                  )}
                </div>
              )}
              {existingSalaryRows.length > 0 && selectedStaff && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <p className="font-bold text-amber-300">Period Already Catered For</p>
                  <p className="mt-1 text-white/80">
                    A salary entry already exists for {MONTH_NAMES[salaryMonth]} {salaryYear}.
                  </p>
                  <ul className="mt-1.5 pl-4 list-disc text-white/80 text-[11px]">
                    {existingSalaryRows.map((r) => (
                      <li key={r.expense_id}>
                        {r.description} — {Number(r.amount).toLocaleString()} UGX ({r.status})
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-start gap-2 mt-2 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={salaryDuplicateAck}
                      onChange={(e) => setSalaryDuplicateAck(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>I need to add an additional line for this period (bonus, correction, or split payment).</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Description (Line Item) */}
          <div className="relative z-20">
            <label className={glassLabelClass}>
              Description (Line Item) <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              list="expense-desc-suggestions"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fuel for Bus UAA 123X or Examination Papers Printing"
              autoComplete="off"
              className={glassInputClass}
              required
            />
            <datalist id="expense-desc-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {/* Hero Amount Input with UGX Badge */}
          <div className="relative z-15">
            <label className={glassLabelClass}>
              Disbursement Amount (UGX) <span className="text-amber-400">*</span>
            </label>
            {selectedSub?.is_salary && hierarchyReady && (
              <p className="text-[11px] text-white/60 mb-1.5">
                Adjust for partial disbursement, or click “Fill full amount” in payroll section.
              </p>
            )}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-md font-mono">
                UGX
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className={`${glassInputClass} pl-16 text-lg font-bold font-mono text-emerald-300`}
                required
              />
            </div>
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <div className="text-[11px] text-emerald-300 font-bold mt-1 pl-1">
                UGX {fmtUGX(Number(amount))}
              </div>
            )}
          </div>

          {/* Payment Method & Transaction Ref */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 relative z-10">
            <div>
              <label className={glassLabelClass}>Payment Method</label>
              <LiquidGlassSelect
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val as any)}
                options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
                direction="down"
              />
            </div>
            <div>
              <label className={glassLabelClass}>
                Transaction Reference <span className="text-white/50 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. FT256… / MM987654"
                autoComplete="off"
                className={glassInputClass}
              />
            </div>
          </div>

          {/* Approval Mode Toggle */}
          {canDirectApproveExpense && (
            <div className="relative z-0">
              <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer p-1">
                <input
                  type="checkbox"
                  checked={submitForApprovalOnly}
                  onChange={(e) => setSubmitForApprovalOnly(e.target.checked)}
                />
                <span>Submit for approval review</span>
              </label>
            </div>
          )}

          {message && (
            <p
              className={`text-xs font-semibold ${
                message.includes("saved") || message.includes("submitted") ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {message}
            </p>
          )}
          {savedExpenseId && (
            <p className="text-xs text-emerald-300">
              <Link
                to={`/dashboard/accountant/expenses/receipt/${savedExpenseId}`}
                className="font-bold underline"
                target="_blank"
                rel="noreferrer"
              >
                Open payment voucher (print or export as PDF)
              </Link>
            </p>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/15 relative z-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (useLegacyCategories && !legacyCategories.length) || (!useLegacyCategories && !subcategories.length)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <span>Saving…</span>
              ) : (
                <>
                  <ArrowDownRight size={15} />
                  <span>
                    {!canDirectApproveExpense || submitForApprovalOnly
                      ? "Submit for Approval"
                      : "Save as Approved"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </NativeModal>
    </>
  );
}
