import { supabase } from "../../../lib/supabase";

/** Same label format as RecordExpenseModal: "March 2026" */
export function salaryPeriodLabel(monthIndex0: number, year: number, monthNames: string[]): string {
  return `${monthNames[monthIndex0]} ${year}`;
}

export type ExistingSalaryRow = {
  expense_id: string;
  amount: number;
  expense_date: string;
  status: string;
  description: string;
};

/** Salary lines for the same employee + period (duplicate detection: pending blocks too). */
export async function fetchExistingSalaryForPeriod(
  schoolId: string,
  periodLabel: string,
  staff: { teacherId?: string; otherStaffId?: string }
): Promise<ExistingSalaryRow[]> {
  let q = supabase
    .from("school_expenses")
    .select("expense_id, amount, expense_date, status, description")
    .eq("school_id", schoolId)
    .eq("salary_period_label", periodLabel)
    .in("status", ["pending", "approved", "paid"]);

  if (staff.teacherId) q = q.eq("linked_teacher_id", staff.teacherId);
  else if (staff.otherStaffId) q = q.eq("linked_other_staff_id", staff.otherStaffId);
  else return [];

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as ExistingSalaryRow[];
}

export type TeacherRollupRow = {
  teacher_id: string;
  name: string;
  expected_salary: number | null;
  paid_amount: number;
  paid_for_period: boolean;
};

export type SalaryRollupPeriodFilter =
  | { mode: "month"; year: number; monthIndex0: number; monthNames: string[] }
  | { mode: "term"; startDate?: string | null; endDate?: string | null; termLabel?: string }
  | { mode: "year"; year: number }
  | { mode: "overall" };

/** Teachers vs amount paid in a flexible period (Month, Term, Year, or Overall). */
export async function fetchTeacherSalaryRollupForPeriod(
  schoolId: string,
  filter: SalaryRollupPeriodFilter
): Promise<TeacherRollupRow[]> {
  const { data: teachers, error: te } = await supabase
    .from("teachers")
    .select("teacher_id, name, salary")
    .eq("school_id", schoolId)
    .order("name");
  if (te) throw te;

  let q = supabase
    .from("school_expenses")
    .select("linked_teacher_id, amount, expense_date, salary_period_label")
    .eq("school_id", schoolId)
    .in("status", ["approved", "paid"])
    .not("linked_teacher_id", "is", null);

  if (filter.mode === "month") {
    const periodLabel = salaryPeriodLabel(filter.monthIndex0, filter.year, filter.monthNames);
    const start = `${filter.year}-${String(filter.monthIndex0 + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(filter.year, filter.monthIndex0 + 1, 0).getDate();
    const end = `${filter.year}-${String(filter.monthIndex0 + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    q = q.or(`salary_period_label.eq.${periodLabel},and(expense_date.gte.${start},expense_date.lte.${end})`);
  } else if (filter.mode === "term") {
    if (filter.startDate && filter.endDate) {
      q = q.gte("expense_date", filter.startDate).lte("expense_date", filter.endDate);
    } else if (filter.startDate) {
      q = q.gte("expense_date", filter.startDate);
    } else if (filter.endDate) {
      q = q.lte("expense_date", filter.endDate);
    }
  } else if (filter.mode === "year") {
    q = q.gte("expense_date", `${filter.year}-01-01`).lte("expense_date", `${filter.year}-12-31`);
  }
  // If mode === "overall", no date restriction!

  const { data: pays, error: pe } = await q;
  if (pe) throw pe;

  const sumByTeacher = new Map<string, number>();
  for (const p of pays || []) {
    const tid = (p as { linked_teacher_id?: string }).linked_teacher_id;
    if (!tid) continue;
    const amt = Number((p as { amount?: number }).amount || 0);
    sumByTeacher.set(tid, (sumByTeacher.get(tid) || 0) + amt);
  }

  return (teachers || []).map((t: { teacher_id: string; name: string; salary: number | null }) => {
    const paid = sumByTeacher.get(t.teacher_id) || 0;
    const expected = t.salary != null ? Number(t.salary) : null;
    const paidFor =
      expected != null && expected > 0 ? paid >= expected : paid > 0;
    return {
      teacher_id: t.teacher_id,
      name: t.name,
      expected_salary: expected,
      paid_amount: paid,
      paid_for_period: paidFor,
    };
  });
}

/** Legacy wrapper for calendar month rollup. */
export async function fetchTeacherSalaryRollup(
  schoolId: string,
  monthIndex0: number,
  year: number,
  monthNames: string[]
): Promise<TeacherRollupRow[]> {
  return fetchTeacherSalaryRollupForPeriod(schoolId, {
    mode: "month",
    year,
    monthIndex0,
    monthNames,
  });
}

export type PlannedMonthRow = { year: number; month: number; notes: string | null };

export async function fetchPlannedSalaryMonthsForTeacher(
  schoolId: string,
  teacherId: string
): Promise<PlannedMonthRow[]> {
  const { data, error } = await supabase
    .from("teacher_salary_planned_months")
    .select("year, month, notes")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .order("year", { ascending: true })
    .order("month", { ascending: true });
  if (error) return [];
  return (data || []) as PlannedMonthRow[];
}

export type TeacherSalarySnapshot = {
  plannedMonths: PlannedMonthRow[];
  currentPeriodLabel: string;
  currentPeriodPaidAmount: number;
  expectedSalary: number | null;
  paidForCurrentPeriod: boolean;
};

/** Current calendar month: planned pay months + salary paid vs on-file expectation (approved/paid lines only). */
export async function fetchTeacherSalarySnapshot(
  schoolId: string,
  teacherId: string,
  monthNames: string[]
): Promise<TeacherSalarySnapshot> {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const periodLabel = salaryPeriodLabel(month, year, monthNames);

  const [planned, teacherRes, paysRes] = await Promise.all([
    fetchPlannedSalaryMonthsForTeacher(schoolId, teacherId),
    supabase.from("teachers").select("salary").eq("teacher_id", teacherId).eq("school_id", schoolId).maybeSingle(),
    supabase
      .from("school_expenses")
      .select("amount")
      .eq("school_id", schoolId)
      .eq("linked_teacher_id", teacherId)
      .eq("salary_period_label", periodLabel)
      .in("status", ["approved", "paid"]),
  ]);

  if (teacherRes.error) throw teacherRes.error;
  if (paysRes.error) throw paysRes.error;

  const expected = teacherRes.data?.salary != null ? Number(teacherRes.data.salary) : null;
  let paid = 0;
  for (const row of paysRes.data || []) {
    paid += Number((row as { amount?: number }).amount || 0);
  }
  const paidFor = expected != null && expected > 0 ? paid >= expected : paid > 0;

  return {
    plannedMonths: planned,
    currentPeriodLabel: periodLabel,
    currentPeriodPaidAmount: paid,
    expectedSalary: expected,
    paidForCurrentPeriod: paidFor,
  };
}
