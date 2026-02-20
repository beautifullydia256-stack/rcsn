import { supabase } from "../../../lib/supabase";

export type ExpenseRow = {
  expense_id: string;
  description: string;
  amount: number;
  expense_date: string;
  category_name: string;
  status: string;
};

export const EXPENSES_QUERY_KEY = ["accountant", "expenses"] as const;

export async function fetchExpenses(schoolId: string): Promise<ExpenseRow[]> {
  const { data } = await supabase
    .from("school_expenses")
    .select("expense_id, description, amount, expense_date, category_name, status")
    .eq("school_id", schoolId)
    .order("expense_date", { ascending: false })
    .limit(50);
  return (data || []) as ExpenseRow[];
}
