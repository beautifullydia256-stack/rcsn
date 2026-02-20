import { supabase } from "../../../lib/supabase";

export type FeeStructureRow = { id: string; class_name: string; tuition_amount: number };

export const FEE_STRUCTURE_QUERY_KEY = ["accountant", "fee-structure"] as const;

export async function fetchFeeStructure(schoolId: string): Promise<{ fees: FeeStructureRow[]; lockedClasses: Set<string> }> {
  const fRes = await supabase.from("school_fee_structure").select("id, class_name, tuition_amount").eq("school_id", schoolId).order("class_name");
  const fees = (fRes.data || []) as FeeStructureRow[];
  const { data: classUsed } = await supabase
    .from("student_invoices")
    .select("student_id")
    .eq("school_id", schoolId)
    .limit(500);
  const studentIds = [...new Set((classUsed || []).map((r: { student_id: string }) => r.student_id))];
  let lockedClasses = new Set<string>();
  if (studentIds.length > 0) {
    const { data: students } = await supabase.from("students").select("student_id, current_class").in("student_id", studentIds);
    (students || []).forEach((s: { current_class: string }) => {
      if (s.current_class) lockedClasses.add(s.current_class.trim().toLowerCase());
    });
  }
  return { fees, lockedClasses };
}
