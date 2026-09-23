import { supabase } from "../../../lib/supabase";

export type FeeStructureRow = {
  id: string;
  class_name: string;
  tuition_amount: number;
  boarding_tuition_amount?: number;
};

export const FEE_STRUCTURE_QUERY_KEY = ["accountant", "fee-structure"] as const;

/** Sort key so pre-primary is Baby → Middle → Top, Primary 1…7, Senior 1…6, then Tertiary Programmes in semester progression. */
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

  // Tertiary rankings
  let baseRank = 1000;
  if (/^certificate in nursing|\bcn\b/i.test(raw)) baseRank = 100;
  else if (/^diploma in nursing|\bdn\b/i.test(raw)) baseRank = 200;
  else if (/^certificate in midwifery|\bcm\b/i.test(raw)) baseRank = 300;
  else if (/^diploma in midwifery|\bdm\b/i.test(raw)) baseRank = 400;

  if (baseRank < 1000) {
    if (/year 1 semester 1|y1s1/i.test(raw)) return baseRank + 1;
    if (/year 1 semester 2|y1s2/i.test(raw)) return baseRank + 2;
    if (/year 2 semester 1|y2s1/i.test(raw)) return baseRank + 3;
    if (/year 2 semester 2|y2s2/i.test(raw)) return baseRank + 4;
    if (/year 3 semester 1|y3s1/i.test(raw)) return baseRank + 5;
    if (/year 3 semester 2|y3s2/i.test(raw)) return baseRank + 6;
    if (raw.startsWith('ITEM:')) return baseRank + 50;
    return baseRank;
  }

  if (raw.startsWith('ITEM:')) return 2000;
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

async function getLockedClasses(schoolId: string): Promise<Set<string>> {
  const lockedClasses = new Set<string>();
  try {
    const { data: invRows, error: invErr } = await supabase
      .from("student_invoices")
      .select("students!inner(current_class)")
      .eq("school_id", schoolId)
      .limit(100);
    if (!invErr && invRows) {
      invRows.forEach((row: any) => {
        const cls = row.students?.current_class;
        if (cls) lockedClasses.add(cls.trim().toLowerCase());
      });
    }
  } catch {
    // Non-blocking locked check
  }
  return lockedClasses;
}

export async function fetchFeeStructure(schoolId: string): Promise<{ fees: FeeStructureRow[]; lockedClasses: Set<string> }> {
  const [fRes, lockedClasses] = await Promise.all([
    supabase
      .from("school_fee_structure")
      .select("id, class_name, tuition_amount, boarding_tuition_amount")
      .eq("school_id", schoolId),
    getLockedClasses(schoolId),
  ]);

  const fees = sortFeeRowsByClassEducationOrder((fRes.data || []) as FeeStructureRow[]);
  return { fees, lockedClasses };
}
