import { supabase } from "../../../lib/supabase";

export type ExpenseRow = {
  expense_id: string;
  description: string;
  amount: number;
  expense_date: string;
  category_name: string;
  status: string;
  reference_number: string | null;
  salary_period_label: string | null;
  linked_teacher_id: string | null;
  linked_other_staff_id: string | null;
  payment_method: string | null;
  created_at: string | null;
  recorded_by: string | null;
};

export const EXPENSES_QUERY_KEY = ["accountant", "expenses"] as const;

export type ExpensePeriodFilter =
  | { mode: "month"; year: number; monthIndex0: number }
  | { mode: "term"; startDate?: string | null; endDate?: string | null; termLabel?: string; termId?: string | null }
  | { mode: "year"; year: number }
  | { mode: "overall" };

export async function fetchExpenses(schoolId: string, limit = 500): Promise<ExpenseRow[]> {
  const { data } = await supabase
    .from("school_expenses")
    .select(
      "expense_id, description, amount, expense_date, category_name, status, reference_number, salary_period_label, linked_teacher_id, linked_other_staff_id, payment_method, created_at, recorded_by"
    )
    .eq("school_id", schoolId)
    .order("expense_date", { ascending: false })
    .limit(limit);
  return (data || []) as ExpenseRow[];
}

/** Filter by calendar month (expense_date). */
export async function fetchExpensesForMonth(
  schoolId: string,
  year: number,
  monthIndex0: number
): Promise<ExpenseRow[]> {
  return fetchExpensesForPeriod(schoolId, { mode: "month", year, monthIndex0 });
}

/** Flexible period query: Month, Term / Semester, Year, or Overall Time */
export async function fetchExpensesForPeriod(
  schoolId: string,
  filter: ExpensePeriodFilter
): Promise<ExpenseRow[]> {
  let q = supabase
    .from("school_expenses")
    .select(
      "expense_id, description, amount, expense_date, category_name, status, reference_number, salary_period_label, linked_teacher_id, linked_other_staff_id, payment_method, created_at, recorded_by"
    )
    .eq("school_id", schoolId);

  if (filter.mode === "month") {
    const start = `${filter.year}-${String(filter.monthIndex0 + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(filter.year, filter.monthIndex0 + 1, 0).getDate();
    const end = `${filter.year}-${String(filter.monthIndex0 + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    q = q.gte("expense_date", start).lte("expense_date", end);
  } else if (filter.mode === "term") {
    if (filter.startDate && filter.endDate) {
      q = q.gte("expense_date", filter.startDate).lte("expense_date", filter.endDate);
    } else if (filter.startDate) {
      q = q.gte("expense_date", filter.startDate);
    } else if (filter.endDate) {
      q = q.lte("expense_date", filter.endDate);
    }
  } else if (filter.mode === "year") {
    const start = `${filter.year}-01-01`;
    const end = `${filter.year}-12-31`;
    q = q.gte("expense_date", start).lte("expense_date", end);
  }
  // If mode === 'overall', no date filter applied

  const { data, error } = await q.order("expense_date", { ascending: false });
  if (error) throw error;
  return (data || []) as ExpenseRow[];
}

/** Resolve `users.name` for expense rows (`recorded_by` UUIDs). */
export async function fetchRecorderNames(userIds: (string | null | undefined)[]): Promise<Map<string, string>> {
  const uniq = [...new Set(userIds.filter((id): id is string => !!id))];
  if (!uniq.length) return new Map();
  const { data, error } = await supabase.from("users").select("user_id, name").in("user_id", uniq);
  if (error) throw error;
  const m = new Map<string, string>();
  for (const r of data || []) {
    const row = r as { user_id: string; name: string | null };
    m.set(row.user_id, (row.name || "").trim() || "Unknown");
  }
  return m;
}
