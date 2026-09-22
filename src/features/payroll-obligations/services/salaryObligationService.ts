import { supabase } from '@/lib/supabase';

export type StaffKind = 'teacher' | 'other_staff';
export type PayFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'termly' | 'annual' | 'custom';
export type SalaryPaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface StaffObligationRow {
  id: string;
  kind: StaffKind;
  name: string;
  role_or_title: string;
  department: string | null;
  phone: string | null;
  pay_frequency: PayFrequency;
  base_salary: number;
  monthly_equivalent: number;
  daily_equivalent: number;
  amount_paid_this_month: number;
  payment_status: SalaryPaymentStatus;
  balance_due: number;
}

export interface PayrollObligationSummary {
  total_staff_count: number;
  total_teachers_count: number;
  total_other_staff_count: number;
  total_monthly_payroll_obligation: number;
  teachers_monthly_obligation: number;
  other_staff_monthly_obligation: number;
  daily_wage_obligation: number; // Cash required daily for casual/day-rate staff
  weekly_wage_obligation: number; // Cash required weekly
  total_paid_this_month: number;
  total_pending_liability_this_month: number;
  daily_food_burn_rate?: number;
  combined_daily_burn_rate: number; // Daily Staff Wages + Daily Kitchen Consumables
}

export function computeFrequencies(
  baseSalary: number,
  freq: string | null | undefined
): { pay_frequency: PayFrequency; monthly_equivalent: number; daily_equivalent: number } {
  const normFreq = (freq || 'monthly').toLowerCase().trim() as PayFrequency;
  const base = Math.max(0, Number(baseSalary) || 0);

  let monthly = base;
  let daily = base / 26;

  switch (normFreq) {
    case 'daily':
      daily = base;
      monthly = base * 26; // 26 working days in average month
      break;
    case 'weekly':
      monthly = base * 4.33;
      daily = base / 6;
      break;
    case 'biweekly':
      monthly = base * 2.16;
      daily = base / 12;
      break;
    case 'monthly':
      monthly = base;
      daily = base / 26;
      break;
    case 'termly':
      monthly = base / 3;
      daily = base / 78;
      break;
    case 'annual':
      monthly = base / 12;
      daily = base / 312;
      break;
    default:
      monthly = base;
      daily = base / 26;
      break;
  }

  return {
    pay_frequency: normFreq,
    monthly_equivalent: Math.round(monthly),
    daily_equivalent: Math.round(daily),
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function fetchStaffSalaryObligations(
  schoolId: string,
  year = new Date().getFullYear(),
  month = new Date().getMonth(),
  dailyFoodBurnRate = 0
): Promise<{ rows: StaffObligationRow[]; summary: PayrollObligationSummary }> {
  // 1. Fetch teachers
  const { data: teachers, error: tErr } = await supabase
    .from('teachers')
    .select('teacher_id, name, salary, employee_id, phone')
    .eq('school_id', schoolId)
    .order('name');

  if (tErr) console.error('Error fetching teachers for payroll:', tErr);

  // 2. Fetch other non-teaching staff
  const { data: otherStaff, error: oErr } = await supabase
    .from('other_staff_members')
    .select('id, full_name, job_title, department, salary_amount, pay_frequency, phone')
    .eq('school_id', schoolId)
    .order('full_name');

  if (oErr) console.error('Error fetching other staff for payroll:', oErr);

  // 3. Query school_expenses for this period to see who has been paid
  const periodLabel = `${MONTH_NAMES[month]} ${year}`;
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonthNum = month === 11 ? 1 : month + 2;
  const endDate = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

  const { data: expenses } = await supabase
    .from('school_expenses')
    .select('amount, linked_teacher_id, linked_other_staff_id, salary_period_label, status, expense_date')
    .eq('school_id', schoolId)
    .gte('expense_date', startDate)
    .lt('expense_date', endDate);

  // Build map of staff_id -> total paid this month
  const paymentsByStaff = new Map<string, number>();
  (expenses || []).forEach((exp) => {
    // Count both approved and pending expenses (or only approved)
    const amt = Number(exp.amount) || 0;
    if (exp.linked_teacher_id) {
      const prev = paymentsByStaff.get(exp.linked_teacher_id) || 0;
      paymentsByStaff.set(exp.linked_teacher_id, prev + amt);
    }
    if (exp.linked_other_staff_id) {
      const prev = paymentsByStaff.get(exp.linked_other_staff_id) || 0;
      paymentsByStaff.set(exp.linked_other_staff_id, prev + amt);
    }
  });

  const rows: StaffObligationRow[] = [];

  // Map teachers (typically paid monthly in Ugandan schools)
  (teachers || []).forEach((t) => {
    const base = Number(t.salary) || 0;
    const { pay_frequency, monthly_equivalent, daily_equivalent } = computeFrequencies(base, 'monthly');
    const paid = paymentsByStaff.get(t.teacher_id) || 0;
    const balance = Math.max(0, monthly_equivalent - paid);

    let status: SalaryPaymentStatus = 'unpaid';
    if (paid >= monthly_equivalent && monthly_equivalent > 0) {
      status = 'paid';
    } else if (paid > 0) {
      status = 'partial';
    }

    rows.push({
      id: t.teacher_id,
      kind: 'teacher',
      name: t.name || 'Unnamed Teacher',
      role_or_title: t.employee_id ? `Teacher (${t.employee_id})` : 'Teacher',
      department: 'Academic',
      phone: t.phone || null,
      pay_frequency,
      base_salary: base,
      monthly_equivalent,
      daily_equivalent,
      amount_paid_this_month: paid,
      payment_status: status,
      balance_due: balance,
    });
  });

  // Map non-teaching staff (cooks, drivers, cleaners, security, bursar, etc.)
  (otherStaff || []).forEach((s) => {
    const base = Number(s.salary_amount) || 0;
    const { pay_frequency, monthly_equivalent, daily_equivalent } = computeFrequencies(
      base,
      s.pay_frequency
    );
    const paid = paymentsByStaff.get(s.id) || 0;
    const balance = Math.max(0, monthly_equivalent - paid);

    let status: SalaryPaymentStatus = 'unpaid';
    if (paid >= monthly_equivalent && monthly_equivalent > 0) {
      status = 'paid';
    } else if (paid > 0) {
      status = 'partial';
    }

    rows.push({
      id: s.id,
      kind: 'other_staff',
      name: s.full_name || 'Staff Member',
      role_or_title: s.job_title || 'Non-Teaching Staff',
      department: s.department || 'Support Services',
      phone: s.phone || null,
      pay_frequency,
      base_salary: base,
      monthly_equivalent,
      daily_equivalent,
      amount_paid_this_month: paid,
      payment_status: status,
      balance_due: balance,
    });
  });

  // Calculate summary metrics
  let teachersMonthly = 0;
  let otherStaffMonthly = 0;
  let dailyWageSum = 0;
  let weeklyWageSum = 0;
  let totalPaid = 0;
  let totalPending = 0;

  rows.forEach((r) => {
    if (r.kind === 'teacher') {
      teachersMonthly += r.monthly_equivalent;
    } else {
      otherStaffMonthly += r.monthly_equivalent;
    }

    if (r.pay_frequency === 'daily') {
      dailyWageSum += r.base_salary;
    } else if (r.pay_frequency === 'weekly') {
      weeklyWageSum += r.base_salary;
    }

    totalPaid += r.amount_paid_this_month;
    totalPending += r.balance_due;
  });

  const totalMonthlyPayroll = teachersMonthly + otherStaffMonthly;
  const combinedDailyBurn = dailyWageSum + dailyFoodBurnRate;

  return {
    rows,
    summary: {
      total_staff_count: rows.length,
      total_teachers_count: (teachers || []).length,
      total_other_staff_count: (otherStaff || []).length,
      total_monthly_payroll_obligation: totalMonthlyPayroll,
      teachers_monthly_obligation: teachersMonthly,
      other_staff_monthly_obligation: otherStaffMonthly,
      daily_wage_obligation: dailyWageSum,
      weekly_wage_obligation: weeklyWageSum,
      total_paid_this_month: totalPaid,
      total_pending_liability_this_month: totalPending,
      daily_food_burn_rate: dailyFoodBurnRate,
      combined_daily_burn_rate: combinedDailyBurn,
    },
  };
}
