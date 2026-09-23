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
  ShieldAlert,
  Fuel,
  Utensils,
  GraduationCap,
  Briefcase,
  Calendar,
  CheckCircle,
} from "lucide-react";
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

      const legacy = (legacyRes.data || []) as LegacyCat[];
      setLegacyCategories(legacy);
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

  if (!open) return null;

  const scrollHide =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0";

  const modalContent = (
    <>
      {receiptData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Expense receipt">
          <div className="relative">
            <ExpenseReceipt data={receiptData} autoPrint />
            <button
              type="button"
              onClick={() => setReceiptData(null)}
              style={{
                background: t.panel,
                color: t.textHi,
                border: `1px solid ${t.stroke}`,
                fontFamily: INTER,
              }}
              className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
            >
              Close receipt
            </button>
          </div>
        </div>
      )}
      <div
        className="fixed inset-0 z-[240] flex items-center justify-center p-4 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Record expense"
        onClick={handleClose}
      >
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 18,
            boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.65)" : "0 20px 50px rgba(0,0,0,0.14)",
            color: t.textHi,
            fontFamily: INTER,
          }}
          className="relative max-h-[92vh] w-full max-w-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`max-h-[92vh] overflow-y-auto overscroll-y-contain ${scrollHide}`}>
            {/* Sleek POS Institutional Header */}
            <div
              style={{
                padding: "20px 24px 18px",
                borderBottom: `1px solid ${t.stroke}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: t.warnDim,
                    border: `1px solid ${t.warn}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: t.warn,
                  }}
                >
                  <ArrowDownRight size={22} />
                </div>
                <div>
                  <div style={{ fontFamily: SORA, fontSize: 18, fontWeight: 800, color: t.textHi }}>
                    Record School Expense
                  </div>
                  <div style={{ fontSize: 12, color: t.textMid, marginTop: 2 }}>
                    Log disbursements, vendor payments, or staff compensation
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                  color: t.textMid,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="space-y-4 p-6">
                {/* Approval Notice Callout */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: isDark ? "rgba(235,168,58,0.08)" : "rgba(235,168,58,0.06)",
                    border: `1px solid ${isDark ? "rgba(235,168,58,0.25)" : "rgba(235,168,58,0.2)"}`,
                    fontSize: 12,
                    color: t.textHi,
                  }}
                >
                  <ShieldAlert size={18} color={t.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 700, color: t.warn }}>Accounting Control: </span>
                    {canDirectApproveExpense && !submitForApprovalOnly ? (
                      <span>
                        This expense will be posted directly as <strong>Approved</strong> under your administrator authority.
                      </span>
                    ) : (
                      <span>
                        New disbursements are recorded as <strong>Pending</strong> and route to school administration for review and final audit sign-off.
                      </span>
                    )}
                  </div>
                </div>

                {useLegacyCategories && (
                  <p
                    style={{
                      background: t.fieldBg,
                      border: `1px solid ${t.warn}`,
                      color: t.warn,
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 12,
                    }}
                  >
                    Hierarchy not seeded for this school — using legacy categories. Run the latest Supabase migration for full main/sub reporting.
                  </p>
                )}

                {hierarchyReady && (
                  <>
                    {/* Quick Entry Presets */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                          color: t.textMid,
                          marginBottom: 8,
                        }}
                      >
                        <Zap size={13} color={t.gold} />
                        <span>Quick Fill Presets</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 12px",
                                borderRadius: 20,
                                background: t.fieldBg,
                                border: `1px solid ${t.stroke}`,
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: t.textHi,
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              <Icon size={12} color={t.textMid} />
                              <span>{q.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Main Category & Subcategory */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: t.textHi, marginBottom: 6 }}>
                          Main Category <span style={{ color: t.warn }}>*</span>
                        </label>
                        <select
                          value={mainCode}
                          onChange={(e) => setMainCode(e.target.value)}
                          required
                          style={{
                            width: "100%",
                            height: 44,
                            borderRadius: 10,
                            border: `1px solid ${t.stroke}`,
                            background: t.fieldBg,
                            color: t.textHi,
                            padding: "0 12px",
                            fontSize: 13,
                            outline: "none",
                          }}
                        >
                          {mainCategories.map((m) => (
                            <option key={m.code} value={m.code}>
                              {m.label_en}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: t.textHi, marginBottom: 6 }}>
                          Subcategory <span style={{ color: t.warn }}>*</span>
                        </label>
                        <select
                          value={subcategoryId}
                          onChange={(e) => setSubcategoryId(e.target.value)}
                          required
                          style={{
                            width: "100%",
                            height: 44,
                            borderRadius: 10,
                            border: `1px solid ${t.stroke}`,
                            background: t.fieldBg,
                            color: t.textHi,
                            padding: "0 12px",
                            fontSize: 13,
                            outline: "none",
                          }}
                        >
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
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: t.textHi, marginBottom: 6 }}>
                      Category <span style={{ color: t.warn }}>*</span>
                    </label>
                    <select
                      value={legacyCategoryId}
                      onChange={(e) => setLegacyCategoryId(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${t.stroke}`,
                        background: t.fieldBg,
                        color: t.textHi,
                        padding: "0 12px",
                        fontSize: 13,
                        outline: "none",
                      }}
                    >
                      {legacyCategories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Salary Linked Employee Section */}
                {selectedSub?.is_salary && hierarchyReady && (
                  <div
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${t.strokeHi}`,
                      background: t.fieldBg,
                      padding: 16,
                    }}
                    className="space-y-3"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: t.textHi }}>
                      <GraduationCap size={16} color={t.mintInk} />
                      <span>Staff Payroll Allocation</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textMid, marginBottom: 4 }}>
                          Pay Period (Month)
                        </label>
                        <select
                          value={salaryMonth}
                          onChange={(e) => setSalaryMonth(Number(e.target.value))}
                          style={{
                            width: "100%",
                            height: 38,
                            borderRadius: 8,
                            border: `1px solid ${t.stroke}`,
                            background: t.panel,
                            color: t.textHi,
                            padding: "0 10px",
                            fontSize: 12.5,
                            outline: "none",
                          }}
                        >
                          {MONTH_NAMES.map((name, i) => (
                            <option key={name} value={i}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textMid, marginBottom: 4 }}>
                          Year
                        </label>
                        <input
                          type="number"
                          min={2020}
                          max={2100}
                          value={salaryYear}
                          onChange={(e) => setSalaryYear(Number(e.target.value))}
                          style={{
                            width: "100%",
                            height: 38,
                            borderRadius: 8,
                            border: `1px solid ${t.stroke}`,
                            background: t.panel,
                            color: t.textHi,
                            padding: "0 10px",
                            fontSize: 12.5,
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textHi, marginBottom: 4 }}>
                        Search Employee
                      </label>
                      <input
                        type="text"
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        placeholder="Search name, role, or staff ID…"
                        autoComplete="off"
                        style={{
                          width: "100%",
                          height: 38,
                          borderRadius: 8,
                          border: `1px solid ${t.stroke}`,
                          background: t.panel,
                          color: t.textHi,
                          padding: "0 10px",
                          fontSize: 12.5,
                          outline: "none",
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: t.textMid, marginBottom: 4, textTransform: "uppercase" }}>
                          Teaching Staff
                        </p>
                        <ul
                          style={{
                            background: t.panel,
                            border: `1px solid ${t.stroke}`,
                            borderRadius: 8,
                            maxHeight: 140,
                            overflowY: "auto",
                            fontSize: 12,
                          }}
                          className={scrollHide}
                        >
                          {staffMatches.teachers.length === 0 ? (
                            <li style={{ padding: "8px 10px", color: t.textLow }}>No matches found</li>
                          ) : (
                            staffMatches.teachers.map((st) => (
                              <li key={st.teacher_id}>
                                <button
                                  type="button"
                                  style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    textAlign: "left",
                                    border: "none",
                                    background: selectedStaff?.kind === "teacher" && selectedStaff.id === st.teacher_id ? t.mintDim : "transparent",
                                    color: selectedStaff?.kind === "teacher" && selectedStaff.id === st.teacher_id ? t.mintInk : t.textHi,
                                    cursor: "pointer",
                                    transition: "background 0.1s",
                                  }}
                                  onClick={() => {
                                    setSelectedStaff({ kind: "teacher", id: st.teacher_id, name: st.name });
                                    setStaffSearch(st.name);
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>{st.name}</span>
                                  {st.employee_id ? <span style={{ color: t.textMid }}> · {st.employee_id}</span> : null}
                                  <span style={{ display: "block", fontSize: 10.5, color: t.textMid }}>Teacher</span>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: t.textMid, marginBottom: 4, textTransform: "uppercase" }}>
                          Support & Admin Staff
                        </p>
                        <ul
                          style={{
                            background: t.panel,
                            border: `1px solid ${t.stroke}`,
                            borderRadius: 8,
                            maxHeight: 140,
                            overflowY: "auto",
                            fontSize: 12,
                          }}
                          className={scrollHide}
                        >
                          {staffMatches.other.length === 0 ? (
                            <li style={{ padding: "8px 10px", color: t.textLow }}>No matches found</li>
                          ) : (
                            staffMatches.other.map((o) => (
                              <li key={o.id}>
                                <button
                                  type="button"
                                  style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    textAlign: "left",
                                    border: "none",
                                    background: selectedStaff?.kind === "other" && selectedStaff.id === o.id ? t.mintDim : "transparent",
                                    color: selectedStaff?.kind === "other" && selectedStaff.id === o.id ? t.mintInk : t.textHi,
                                    cursor: "pointer",
                                    transition: "background 0.1s",
                                  }}
                                  onClick={() => {
                                    setSelectedStaff({ kind: "other", id: o.id, name: o.full_name });
                                    setStaffSearch(o.full_name);
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>{o.full_name}</span>
                                  {o.job_title ? <span style={{ color: t.textMid }}> · {o.job_title}</span> : null}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </div>
                    {selectedStaff && (
                      <div style={{ fontSize: 12, color: t.textHi, marginTop: 8 }} className="space-y-2">
                        <p>
                          Selected: <strong style={{ color: t.mintInk }}>{selectedStaff.name}</strong> ({selectedStaff.kind === "teacher" ? "Teacher" : "Support staff"})
                        </p>
                        {expectedSalaryUgx != null && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              borderRadius: 8,
                              background: t.panel,
                              border: `1px solid ${t.stroke}`,
                            }}
                          >
                            <span>
                              Monthly salary on file: <strong style={{ fontFamily: SORA, color: t.mintInk }}>{expectedSalaryUgx.toLocaleString()} UGX</strong>
                            </span>
                            <button
                              type="button"
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                background: t.mintDim,
                                border: `1px solid ${t.mint}`,
                                color: t.mintInk,
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              onClick={() => setAmount(String(expectedSalaryUgx))}
                            >
                              Fill full amount
                            </button>
                          </div>
                        )}
                        {expectedSalaryUgx == null && (
                          <p style={{ color: t.warn, fontSize: 11.5 }}>
                            No fixed salary on file for this person — enter the disbursement amount manually.
                          </p>
                        )}
                      </div>
                    )}
                    {existingSalaryRows.length > 0 && selectedStaff && (
                      <div
                        style={{
                          borderRadius: 10,
                          border: `1px solid ${t.warn}`,
                          background: isDark ? "rgba(235,168,58,0.08)" : "rgba(235,168,58,0.05)",
                          padding: 12,
                          fontSize: 12,
                          color: t.textHi,
                        }}
                      >
                        <p style={{ fontWeight: 700, color: t.warn }}>Period Already Catered For</p>
                        <p style={{ marginTop: 2, fontSize: 11.5, color: t.textMid }}>
                          A salary entry already exists for {MONTH_NAMES[salaryMonth]} {salaryYear}.
                        </p>
                        <ul style={{ marginTop: 4, paddingLeft: 16, fontSize: 11.5 }}>
                          {existingSalaryRows.map((r) => (
                            <li key={r.expense_id}>
                              {r.description} — {Number(r.amount).toLocaleString()} UGX ({r.status})
                            </li>
                          ))}
                        </ul>
                        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8, cursor: "pointer", fontSize: 11.5 }}>
                          <input
                            type="checkbox"
                            checked={salaryDuplicateAck}
                            onChange={(e) => setSalaryDuplicateAck(e.target.checked)}
                            style={{ marginTop: 2 }}
                          />
                          <span>I need to add an additional line for this period (bonus, correction, or split payment).</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Description (Line Item) */}
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: t.textHi, marginBottom: 6 }}>
                    Description (Line Item) <span style={{ color: t.warn }}>*</span>
                  </label>
                  <input
                    type="text"
                    list="expense-desc-suggestions"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Fuel for Bus UAA 123X or Term 3 Examination Printing"
                    autoComplete="off"
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 10,
                      border: `1px solid ${t.stroke}`,
                      background: t.fieldBg,
                      color: t.textHi,
                      padding: "0 12px",
                      fontSize: 13,
                      outline: "none",
                    }}
                    required
                  />
                  <datalist id="expense-desc-suggestions">
                    {suggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                {/* Hero Amount Input with UGX Badge and Formatted Preview */}
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: t.textHi, marginBottom: 6 }}>
                    Disbursement Amount (UGX) <span style={{ color: t.warn }}>*</span>
                  </label>
                  {selectedSub?.is_salary && hierarchyReady && (
                    <p style={{ fontSize: 11.5, color: t.textMid, marginBottom: 6 }}>
                      Adjust for partial disbursement, or click “Fill full amount” in payroll section.
                    </p>
                  )}
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: t.warn,
                        background: t.warnDim,
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontFamily: SORA,
                      }}
                    >
                      UGX
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      style={{
                        width: "100%",
                        height: 48,
                        borderRadius: 12,
                        border: `1px solid ${t.stroke}`,
                        background: t.fieldBg,
                        color: t.textHi,
                        paddingLeft: 64,
                        paddingRight: 16,
                        fontFamily: SORA,
                        fontSize: 18,
                        fontWeight: 700,
                        outline: "none",
                      }}
                      required
                    />
                  </div>
                  {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
                    <div style={{ fontSize: 11.5, color: t.mintInk, fontWeight: 600, marginTop: 4, paddingLeft: 4 }}>
                      UGX {fmtUGX(Number(amount))}
                    </div>
                  )}
                </div>

                {/* Payment Method & Transaction Ref */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: t.textHi, marginBottom: 6 }}>
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${t.stroke}`,
                        background: t.fieldBg,
                        color: t.textHi,
                        padding: "0 12px",
                        fontSize: 13,
                        outline: "none",
                      }}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: t.textHi, marginBottom: 6 }}>
                      Transaction Reference <span style={{ color: t.textMid, fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. FT256… / MM987654"
                      autoComplete="off"
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${t.stroke}`,
                        background: t.fieldBg,
                        color: t.textHi,
                        padding: "0 12px",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Approval Mode Toggle */}
                {!canDirectApproveExpense ? (
                  <p
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${t.stroke}`,
                      background: t.fieldBg,
                      padding: "8px 12px",
                      fontSize: 12,
                      color: t.textMid,
                    }}
                  >
                    Your submissions are saved as <strong>Pending</strong> until audited and approved by a school administrator.
                  </p>
                ) : (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 12.5,
                      color: t.textHi,
                      cursor: "pointer",
                      padding: "8px 4px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={submitForApprovalOnly}
                      onChange={(e) => setSubmitForApprovalOnly(e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <span>
                      Submit for approval review (recommended). Uncheck to post as <strong>Approved</strong> immediately.
                    </span>
                  </label>
                )}

                {message && (
                  <p
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: message.includes("saved") || message.includes("submitted") ? t.mintInk : t.warn,
                    }}
                  >
                    {message}
                  </p>
                )}
                {savedExpenseId && (
                  <p style={{ fontSize: 12, color: t.mintInk }}>
                    <Link
                      to={`/dashboard/accountant/expenses/receipt/${savedExpenseId}`}
                      style={{ fontWeight: 600, textDecoration: "underline" }}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open payment voucher (print or export as PDF)
                    </Link>
                  </p>
                )}
              </div>

              {/* Modal Footer with POS Glowing Button */}
              <div
                style={{
                  padding: "16px 24px",
                  borderTop: `1px solid ${t.stroke}`,
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    background: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    fontSize: 13,
                    fontWeight: 600,
                    color: t.textHi,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (useLegacyCategories && !legacyCategories.length) || (!useLegacyCategories && !subcategories.length)}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 10,
                    border: "none",
                    background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                    color: t.ctaText,
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: SORA,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(61,232,160,0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {submitting ? (
                    <span>Saving…</span>
                  ) : (
                    <>
                      <ArrowDownRight size={16} />
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
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
