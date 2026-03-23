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

export async function fetchExpenses(schoolId: string, limit = 200): Promise<ExpenseRow[]> {
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
  const start = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const end = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const { data } = await supabase
    .from("school_expenses")
    .select(
      "expense_id, description, amount, expense_date, category_name, status, reference_number, salary_period_label, linked_teacher_id, linked_other_staff_id, payment_method, created_at, recorded_by"
    )
    .eq("school_id", schoolId)
    .gte("expense_date", start)
    .lte("expense_date", end)
    .order("expense_date", { ascending: false });
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
