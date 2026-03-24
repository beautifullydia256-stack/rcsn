import { supabase } from "../../../lib/supabase";
import { sortFeeRowsByClassEducationOrder } from "./feeStructure";

export type FeeRow = { id: string; class_name: string; tuition_amount: number };
export type TermRow = { id: string; term: number; year: number };
export type StudentRow = { student_id: string; name: string; current_class: string };

export type BillingData = {
  fees: FeeRow[];
  terms: TermRow[];
  students: StudentRow[];
  studentsError: string | null;
};

export const BILLING_QUERY_KEY = ["accountant", "billing"] as const;

export async function fetchBillingData(schoolId: string): Promise<BillingData> {
  const [fRes, tRes, sRes] = await Promise.all([
    supabase.from("school_fee_structure").select("id, class_name, tuition_amount").eq("school_id", schoolId),
    supabase.from("school_terms").select("id, term, year").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false }),
    supabase.from("students").select("student_id, name, current_class").eq("school_id", schoolId).neq("status", "graduated").order("name"),
  ]);
  const fees = sortFeeRowsByClassEducationOrder((fRes.data || []) as FeeRow[]);
  const termList = (tRes.data || []) as TermRow[];
  let students: StudentRow[] = [];
  let studentsError: string | null = null;
  if (sRes.error) {
    studentsError = sRes.error.message || "Failed to load students";
  } else {
    students = ((sRes.data || []) as StudentRow[]).sort((a, b) => a.name.localeCompare(b.name));
  }
  return { fees, terms: termList, students, studentsError };
}
