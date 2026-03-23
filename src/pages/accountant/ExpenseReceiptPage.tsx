import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { ExpenseReceiptData, printExpenseReceipt } from "../../components/accountant/ExpenseReceipt";
import { Printer, ArrowLeft } from "lucide-react";

async function loadExpenseReceipt(expenseId: string, schoolId: string | null) {
  const { data: exp, error } = await supabase.from("school_expenses").select("*").eq("expense_id", expenseId).maybeSingle();
  if (error) throw error;
  if (!exp) return null;
  const row = exp as Record<string, unknown>;
  if (schoolId && String(row.school_id) !== schoolId) return null;

  const [schoolRes, userRes, teacherRes, otherRes] = await Promise.all([
    supabase.from("schools").select("name").eq("school_id", String(row.school_id)).maybeSingle(),
    supabase.from("users").select("name").eq("user_id", String(row.recorded_by)).maybeSingle(),
    row.linked_teacher_id
      ? supabase.from("teachers").select("name").eq("teacher_id", String(row.linked_teacher_id)).maybeSingle()
      : Promise.resolve({ data: null }),
    row.linked_other_staff_id
      ? supabase.from("other_staff_members").select("full_name, job_title").eq("id", String(row.linked_other_staff_id)).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const schoolName = (schoolRes.data as { name?: string } | null)?.name;
  const recordedBy = (userRes.data as { name?: string } | null)?.name?.trim() || "Staff";
  let payeeName: string | null = null;
  let payeeRole: string | null = null;
  if (teacherRes.data) {
    payeeName = (teacherRes.data as { name?: string }).name || null;
    payeeRole = "Teacher";
  } else if (otherRes.data) {
    const o = otherRes.data as { full_name?: string; job_title?: string | null };
    payeeName = o.full_name || null;
    payeeRole = o.job_title || "Staff";
  }

  const createdAt = row.created_at ? new Date(String(row.created_at)).toLocaleString() : undefined;

  const data: ExpenseReceiptData = {
    referenceNumber: String(row.reference_number || "—"),
    schoolName: schoolName || undefined,
    categoryName: String(row.category_name || ""),
    description: String(row.description || ""),
    amount: Number(row.amount || 0),
    paymentMethod: String(row.payment_method || "other"),
    expenseDate: String(row.expense_date || ""),
    recordedBy,
    recordedAt: createdAt,
    status: String(row.status || ""),
    salaryPeriodLabel: row.salary_period_label ? String(row.salary_period_label) : null,
    payeeName,
    payeeRole,
  };
  return data;
}

export default function ExpenseReceiptPage() {
  const { expenseId } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["accountant", "expense-receipt", expenseId, schoolId],
    queryFn: () => loadExpenseReceipt(expenseId!, schoolId),
    enabled: !!expenseId && !!schoolId,
  });

  const print = () => {
    if (data) printExpenseReceipt(data);
  };

  if (isLoading) {
    return (
      <div className="ac-text-secondary flex min-h-[40vh] items-center justify-center text-sm">Loading voucher…</div>
    );
  }

  if (error || !data) {
    return (
      <div className="ac-page-content mx-auto max-w-lg px-4 py-10">
        <p className="ac-text-secondary text-sm">This expense could not be found or you don&apos;t have access.</p>
        <button type="button" className="ac-glass-btn-secondary mt-4 rounded-xl px-4 py-2 text-sm" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="ac-page-content mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/dashboard/accountant/expenses")}
          className="ac-glass-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Expenses
        </button>
        <button
          type="button"
          onClick={print}
          className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>
      <p className="ac-text-muted mb-4 text-xs">
        Use your browser&apos;s print dialog and choose <strong>Save as PDF</strong> to download a PDF. This page is the official expense voucher
        (also called a payment voucher or disbursement record — not a parent fee receipt).
      </p>

      <div className="ac-glass-card rounded-2xl border border-[var(--ac-border)] p-6 print:border-0 print:shadow-none">
        <h1 className="ac-text-primary text-center text-lg font-bold uppercase tracking-wide">Expense voucher</h1>
        {data.schoolName && <p className="ac-text-primary mt-2 text-center font-semibold">{data.schoolName}</p>}
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="ac-text-muted">Reference</dt>
            <dd className="ac-text-primary font-medium">{data.referenceNumber}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="ac-text-muted">Category</dt>
            <dd className="ac-text-primary text-right">{data.categoryName}</dd>
          </div>
          {data.payeeName && (
            <div className="flex justify-between gap-4">
              <dt className="ac-text-muted">Payee</dt>
              <dd className="ac-text-primary text-right">
                {data.payeeName}
                {data.payeeRole ? ` (${data.payeeRole})` : ""}
              </dd>
            </div>
          )}
          {data.salaryPeriodLabel && (
            <div className="flex justify-between gap-4">
              <dt className="ac-text-muted">Salary period</dt>
              <dd className="ac-text-primary">{data.salaryPeriodLabel}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-[var(--ac-border)] pt-3">
            <dt className="ac-text-muted">Amount</dt>
            <dd className="ac-text-primary text-lg font-bold">{data.amount.toLocaleString()} UGX</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="ac-text-muted">Payment method</dt>
            <dd className="ac-text-primary capitalize">{data.paymentMethod.replace(/_/g, " ")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="ac-text-muted">Expense date</dt>
            <dd className="ac-text-primary">{data.expenseDate}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="ac-text-muted">Status</dt>
            <dd className="ac-text-primary font-medium">{data.status}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="ac-text-muted">Recorded by</dt>
            <dd className="ac-text-primary">{data.recordedBy}</dd>
          </div>
          {data.recordedAt && (
            <div className="flex justify-between gap-4">
              <dt className="ac-text-muted">Recorded at</dt>
              <dd className="ac-text-primary text-xs">{data.recordedAt}</dd>
            </div>
          )}
          <div className="border-t border-[var(--ac-border)] pt-3">
            <dt className="ac-text-muted">Description</dt>
            <dd className="ac-text-primary mt-1">{data.description}</dd>
          </div>
        </dl>
      </div>

      <p className="ac-text-muted mt-6 text-center text-xs">
        Shareable link:{" "}
        <Link to={`/dashboard/accountant/expenses/receipt/${expenseId}`} className="text-emerald-600 underline break-all">
          {typeof window !== "undefined" ? window.location.origin : ""}/dashboard/accountant/expenses/receipt/{expenseId}
        </Link>
      </p>
    </div>
  );
}
