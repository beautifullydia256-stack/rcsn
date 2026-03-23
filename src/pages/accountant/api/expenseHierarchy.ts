import { supabase } from "../../../lib/supabase";

export type ExpenseMainCategoryRow = {
  code: string;
  label_en: string;
  sort_order: number;
};

export type ExpenseSubcategoryRow = {
  subcategory_id: string;
  school_id: string;
  main_category_code: string;
  name: string;
  is_salary: boolean;
  sort_order: number;
};

export async function fetchExpenseMainCategories(): Promise<ExpenseMainCategoryRow[]> {
  const { data, error } = await supabase
    .from("expense_main_categories")
    .select("code, label_en, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as ExpenseMainCategoryRow[];
}

export async function fetchExpenseSubcategories(schoolId: string): Promise<ExpenseSubcategoryRow[]> {
  const { data, error } = await supabase
    .from("expense_subcategories")
    .select("subcategory_id, school_id, main_category_code, name, is_salary, sort_order")
    .eq("school_id", schoolId)
    .order("main_category_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []) as ExpenseSubcategoryRow[];
}

export async function fetchRecentExpenseDescriptions(schoolId: string, limit = 15): Promise<string[]> {
  const { data, error } = await supabase
    .from("school_expenses")
    .select("description")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data || []) {
    const d = String((row as { description?: string }).description || "").trim();
    if (!d || seen.has(d)) continue;
    seen.add(d);
    out.push(d);
    if (out.length >= limit) break;
  }
  return out;
}
