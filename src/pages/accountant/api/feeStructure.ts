import { supabase } from "../../../lib/supabase";

export type FeeStructureRow = { id: string; class_name: string; tuition_amount: number };

export const FEE_STRUCTURE_QUERY_KEY = ["accountant", "fee-structure"] as const;

/** Sort key so pre-primary is Baby → Middle → Top, then Primary 1…7, not alphabetical (T after P). */
function educationOrderRank(className: string): number {
  const raw = className.trim();
  const lower = raw.toLowerCase();
  if (lower === "admission") return 0;
  if (lower === "baby class") return 1;
  if (lower === "middle class") return 2;
  if (lower === "top class") return 3;
  const primary = /^primary\s*(\d+)$/i.exec(raw);
  if (primary) return 10 + parseInt(primary[1], 10);
  const senior = /^senior\s*(\d+)$/i.exec(raw);
  if (senior) return 40 + parseInt(senior[1], 10);
  return 1000;
}

/** Exported for billing and any screen that lists fees in class progression order. */
export function sortFeeRowsByClassEducationOrder<T extends { class_name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ra = educationOrderRank(a.class_name);
    const rb = educationOrderRank(b.class_name);
    if (ra !== rb) return ra - rb;
    return a.class_name.localeCompare(b.class_name, undefined, { sensitivity: "base" });
  });
}

export async function fetchFeeStructure(schoolId: string): Promise<{ fees: FeeStructureRow[]; lockedClasses: Set<string> }> {
  const fRes = await supabase.from("school_fee_structure").select("id, class_name, tuition_amount").eq("school_id", schoolId);
  const fees = sortFeeRowsByClassEducationOrder((fRes.data || []) as FeeStructureRow[]);
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
