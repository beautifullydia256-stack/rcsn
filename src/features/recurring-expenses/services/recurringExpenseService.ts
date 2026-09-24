import { supabase } from '@/lib/supabase';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import { broadcastFinanceUpdate } from '@/lib/realtimeFinanceSync';
import type {
  RecurringExpense,
  RecurringExpenseWithCycle,
  RecurringExpenseCyclePayment,
  CreateRecurringExpenseInput,
  UpdateRecurringExpenseInput,
  RecordRecurringPaymentInput,
  RecurringExpenseSummary,
  RecurringPaymentStatus,
} from '../types';

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

const LOCAL_STORAGE_KEY_PROFILES = 'pweza_recurring_expenses_profiles_v1';
const LOCAL_STORAGE_KEY_CYCLES = 'pweza_recurring_expense_cycles_v1';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getCategoryExpenseName(cat: string): string {
  switch (cat) {
    case 'electricity':
      return 'Utilities - Electricity & Power';
    case 'water':
      return 'Utilities - Water & Sanitation';
    case 'internet':
      return 'Technology & Internet Access';
    case 'security':
      return 'Security & Guard Services';
    case 'waste':
      return 'Sanitation & Waste Management';
    case 'rent':
      return 'Rent & Campus Ground Lease';
    case 'software':
      return 'Software & Digital Subscriptions';
    case 'generator':
      return 'Generator Fuel & Servicing';
    case 'transport':
      return 'Transport Retainers & Insurance';
    default:
      return 'Standing Operational Obligations';
  }
}

function getSeedRecurringExpenses(schoolId: string): RecurringExpense[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'rec-internet-001',
      school_id: schoolId,
      title: 'Campus High-Speed Internet & Wi-Fi',
      category: 'internet',
      provider_name: 'MTN Business / Airtel Dedicated Fiber',
      account_or_meter_no: 'MTN-FIB-849201',
      frequency: 'monthly',
      billing_day: 1,
      estimated_amount: 380000,
      payment_method_preferred: 'mobile_money',
      is_active: true,
      notes: 'Dedicated 50Mbps link covering administrative block and computer lab.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'rec-power-002',
      school_id: schoolId,
      title: 'UMEME Main Campus Power & Lighting',
      category: 'electricity',
      provider_name: 'UMEME YAKA Prepaid Meter',
      account_or_meter_no: 'YAKA-9948-2841-002',
      frequency: 'monthly',
      billing_day: 5,
      estimated_amount: 650000,
      payment_method_preferred: 'bank',
      is_active: true,
      notes: 'Prepaid 3-phase commercial meter for classrooms, dining hall, and dormitories.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'rec-water-003',
      school_id: schoolId,
      title: 'NWSC Clean Water & Sanitation Service',
      category: 'water',
      provider_name: 'National Water & Sewerage Corp (NWSC)',
      account_or_meter_no: 'NWSC-ACC-294819',
      frequency: 'monthly',
      billing_day: 10,
      estimated_amount: 420000,
      payment_method_preferred: 'bank',
      is_active: true,
      notes: 'Main metered supply for kitchen, dorm washrooms, and staff quarters.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'rec-sec-004',
      school_id: schoolId,
      title: '24/7 Campus Security Guard Patrols',
      category: 'security',
      provider_name: 'Saracen Security Services Uganda',
      account_or_meter_no: 'CONTRACT-SEC-2026',
      frequency: 'monthly',
      billing_day: 25,
      estimated_amount: 550000,
      payment_method_preferred: 'bank',
      is_active: true,
      notes: 'Day and night security guards stationed at the main gate and perimeter fence.',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'rec-waste-005',
      school_id: schoolId,
      title: 'Weekly Waste & Refuse Disposal Contract',
      category: 'waste',
      provider_name: 'City Green Waste Management',
      account_or_meter_no: 'WM-UG-5591',
      frequency: 'monthly',
      billing_day: 28,
      estimated_amount: 140000,
      payment_method_preferred: 'cash',
      is_active: true,
      notes: 'Bi-weekly collection of campus waste and kitchen refuse bins.',
      created_at: now,
      updated_at: now,
    },
  ];
}

// Local storage storage helpers
function loadLocalProfiles(schoolId: string): RecurringExpense[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PROFILES}_${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read local recurring profiles:', err);
  }
  const seeds = getSeedRecurringExpenses(schoolId);
  saveLocalProfiles(schoolId, seeds);
  return seeds;
}

function saveLocalProfiles(schoolId: string, profiles: RecurringExpense[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PROFILES}_${schoolId}`, JSON.stringify(profiles));
  } catch (err) {
    console.warn('Could not save local recurring profiles:', err);
  }
}

function loadLocalCycles(schoolId: string): RecurringExpenseCyclePayment[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_CYCLES}_${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read local recurring cycles:', err);
  }
  return [];
}

function saveLocalCycles(schoolId: string, cycles: RecurringExpenseCyclePayment[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_CYCLES}_${schoolId}`, JSON.stringify(cycles));
  } catch (err) {
    console.warn('Could not save local recurring cycles:', err);
  }
}

/**
 * Calculates current payment status for a recurring profile in the given month/year
 */
export function computeCycleStatus(
  billingDay: number,
  year: number,
  month: number,
  paidAmount: number,
  estimatedAmount: number
): RecurringPaymentStatus {
  if (paidAmount >= estimatedAmount && estimatedAmount > 0) {
    return 'paid';
  }
  if (paidAmount > 0 && paidAmount < estimatedAmount) {
    return 'pending';
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // If viewed month is in the future
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return 'pending';
  }

  // If viewed month is in the past and unpaid
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return 'overdue';
  }

  // Current month
  if (currentDay > billingDay) {
    return 'overdue';
  }
  if (billingDay - currentDay <= 5) {
    return 'due_soon';
  }
  return 'pending';
}

/**
 * Fetch all recurring profiles with their cycle status for a specific month/year
 */
export async function fetchRecurringExpenses(
  schoolId: string,
  year = new Date().getFullYear(),
  month = new Date().getMonth()
): Promise<{ items: RecurringExpenseWithCycle[]; summary: RecurringExpenseSummary }> {
  let profiles: RecurringExpense[] = [];
  let cycles: RecurringExpenseCyclePayment[] = [];

  // 1. Try Supabase
  try {
    const { data: dbProfiles, error: pErr } = await supabase
      .from('school_recurring_expenses')
      .select('*')
      .eq('school_id', schoolId)
      .order('billing_day', { ascending: true });

    if (!pErr && dbProfiles && dbProfiles.length > 0) {
      profiles = dbProfiles;
    } else {
      profiles = loadLocalProfiles(schoolId);
    }
  } catch {
    profiles = loadLocalProfiles(schoolId);
  }

  // 2. Fetch cycle payments for period
  try {
    const { data: dbCycles, error: cErr } = await supabase
      .from('school_recurring_expense_cycles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('period_year', year)
      .eq('period_month', month);

    if (!cErr && dbCycles) {
      cycles = dbCycles;
    } else {
      cycles = loadLocalCycles(schoolId).filter(
        (c) => c.period_year === year && c.period_month === month
      );
    }
  } catch {
    cycles = loadLocalCycles(schoolId).filter(
      (c) => c.period_year === year && c.period_month === month
    );
  }

  // Map cycles by recurring_expense_id
  const cyclesByExpenseId = new Map<string, RecurringExpenseCyclePayment>();
  cycles.forEach((c) => cyclesByExpenseId.set(c.recurring_expense_id, c));

  const items: RecurringExpenseWithCycle[] = profiles.map((p) => {
    const cycle = cyclesByExpenseId.get(p.id);
    const paidAmount = cycle?.amount_paid || 0;
    const balanceDue = Math.max(0, p.estimated_amount - paidAmount);
    const status = computeCycleStatus(p.billing_day, year, month, paidAmount, p.estimated_amount);

    return {
      ...p,
      current_cycle_status: status,
      amount_paid_this_cycle: paidAmount,
      balance_due_this_cycle: balanceDue,
      last_payment_date: cycle?.payment_date || null,
      linked_expense_id: cycle?.linked_expense_id || null,
      cycle_payment_id: cycle?.id || null,
    };
  });

  // Calculate KPIs
  const activeProfiles = items.filter((it) => it.is_active);
  const totalMonthlyBudget = activeProfiles.reduce((sum, it) => sum + it.estimated_amount, 0);
  const totalPaidThisMonth = activeProfiles.reduce((sum, it) => sum + it.amount_paid_this_cycle, 0);
  const totalPendingThisMonth = Math.max(0, totalMonthlyBudget - totalPaidThisMonth);
  const overdueCount = activeProfiles.filter((it) => it.current_cycle_status === 'overdue').length;
  const dueSoonCount = activeProfiles.filter((it) => it.current_cycle_status === 'due_soon').length;
  const paidBillsCount = activeProfiles.filter((it) => it.current_cycle_status === 'paid').length;
  const percentPaid = totalMonthlyBudget > 0 ? Math.min(100, Math.round((totalPaidThisMonth / totalMonthlyBudget) * 100)) : 0;

  const summary: RecurringExpenseSummary = {
    total_active_profiles: activeProfiles.length,
    total_monthly_recurring_budget: totalMonthlyBudget,
    total_paid_this_month: totalPaidThisMonth,
    total_pending_this_month: totalPendingThisMonth,
    overdue_bills_count: overdueCount,
    due_soon_count: dueSoonCount,
    paid_bills_count: paidBillsCount,
    percent_paid: percentPaid,
  };

  return { items, summary };
}

/**
 * Create a new recurring expense profile
 */
export async function createRecurringExpense(
  schoolId: string,
  input: CreateRecurringExpenseInput
): Promise<RecurringExpense> {
  const now = new Date().toISOString();
  const id = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newProfile: RecurringExpense = {
    id,
    school_id: schoolId,
    title: input.title.trim(),
    category: input.category,
    provider_name: input.provider_name.trim(),
    account_or_meter_no: input.account_or_meter_no?.trim() || null,
    frequency: input.frequency,
    billing_day: Math.min(31, Math.max(1, Number(input.billing_day) || 1)),
    estimated_amount: Math.max(0, Number(input.estimated_amount) || 0),
    payment_method_preferred: input.payment_method_preferred || 'bank',
    is_active: true,
    notes: input.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from('school_recurring_expenses')
      .insert([newProfile])
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase insert failed, caching locally:', err);
  }

  // Fallback to local storage
  const current = loadLocalProfiles(schoolId);
  const updated = [newProfile, ...current];
  saveLocalProfiles(schoolId, updated);
  return newProfile;
}

/**
 * Update an existing recurring expense profile
 */
export async function updateRecurringExpense(
  schoolId: string,
  id: string,
  input: UpdateRecurringExpenseInput
): Promise<void> {
  const now = new Date().toISOString();
  const payload: Partial<RecurringExpense> = {
    ...input,
    updated_at: now,
  };

  try {
    await supabase
      .from('school_recurring_expenses')
      .update(payload)
      .eq('id', id)
      .eq('school_id', schoolId);
  } catch (err) {
    console.warn('Supabase update failed:', err);
  }

  // Sync locally
  const current = loadLocalProfiles(schoolId);
  const updated = current.map((p) => (p.id === id ? { ...p, ...payload } : p));
  saveLocalProfiles(schoolId, updated);
}

/**
 * Delete or deactivate a recurring expense profile
 */
export async function deleteRecurringExpense(schoolId: string, id: string): Promise<void> {
  try {
    await supabase
      .from('school_recurring_expenses')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
  } catch (err) {
    console.warn('Supabase delete failed:', err);
  }

  const current = loadLocalProfiles(schoolId);
  const updated = current.filter((p) => p.id !== id);
  saveLocalProfiles(schoolId, updated);
}

/**
 * Record a payment for a specific cycle and post voucher directly into `school_expenses`
 */
export async function recordRecurringExpensePayment(
  schoolId: string,
  input: RecordRecurringPaymentInput,
  profile: RecurringExpense,
  userId?: string
): Promise<{ cyclePayment: RecurringExpenseCyclePayment; expenseId?: string }> {
  const periodLabel = `${MONTH_NAMES[input.period_month]} ${input.period_year}`;
  const now = new Date().toISOString();
  const cycleId = `cyc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let linkedExpenseId: string | undefined;

  // 1. Post to school_expenses table
  try {
    const expenseDescription = `${profile.title} - ${periodLabel} (${profile.provider_name}${
      profile.account_or_meter_no ? ` | Acc: ${profile.account_or_meter_no}` : ''
    })`;
    const expenseDateIso = input.payment_date || new Date().toISOString().slice(0, 10);
    const categoryLabel = getCategoryExpenseName(profile.category);

    // Resolve active school term so the payment is linked into the current term ledger
    let termId: string | null = null;
    try {
      const currentTerm = await resolveCurrentSchoolTerm(supabase, schoolId, expenseDateIso);
      termId = currentTerm?.id || null;
    } catch (termErr) {
      console.warn('Could not resolve term for recurring expense:', termErr);
    }

    // Generate unique sequential expense reference number
    let refNum: string | null = input.reference_no?.trim() || null;
    if (!refNum) {
      try {
        const { data: generatedRef } = await supabase.rpc('generate_expense_reference', {
          p_school_id: schoolId,
          p_expense_date: expenseDateIso,
          p_category_name: categoryLabel,
        });
        if (typeof generatedRef === 'string' && generatedRef.trim()) {
          refNum = generatedRef.trim();
        }
      } catch (refErr) {
        console.warn('generate_expense_reference RPC fallback:', refErr);
      }
    }
    if (!refNum) {
      const yyyymm = expenseDateIso.slice(0, 7).replace('-', '');
      refNum = `REC/${yyyymm}/${Date.now().toString().slice(-4)}`;
    }

    const recordedByUuid = isValidUuid(userId) ? userId : null;

    const { data: expData, error: expErr } = await supabase
      .from('school_expenses')
      .insert([
        {
          school_id: schoolId,
          term_id: termId,
          description: expenseDescription,
          amount: input.amount_paid,
          expense_date: expenseDateIso,
          category_name: categoryLabel,
          status: 'approved',
          payment_method: input.payment_method || 'bank',
          recorded_by: recordedByUuid,
          reference_number: refNum,
        },
      ])
      .select('expense_id')
      .single();

    if (!expErr && expData) {
      linkedExpenseId = expData.expense_id;
    } else if (expErr) {
      console.warn('Supabase school_expenses insert error:', expErr);
    }
  } catch (err) {
    console.warn('Could not post directly to school_expenses:', err);
  }

  // 2. Insert into school_recurring_expense_cycles
  const cyclePayment: RecurringExpenseCyclePayment = {
    id: cycleId,
    recurring_expense_id: input.recurring_expense_id,
    school_id: schoolId,
    period_year: input.period_year,
    period_month: input.period_month,
    period_label: periodLabel,
    amount_paid: input.amount_paid,
    payment_date: input.payment_date,
    payment_method: input.payment_method,
    reference_no: input.reference_no,
    linked_expense_id: linkedExpenseId,
    notes: input.notes,
    recorded_by: userId,
    created_at: now,
  };

  try {
    await supabase.from('school_recurring_expense_cycles').insert([cyclePayment]);
  } catch (err) {
    console.warn('Supabase cycle insert failed, saving locally:', err);
  }

  // Local storage cache
  const currentCycles = loadLocalCycles(schoolId);
  // Replace if exists for same profile and period
  const filtered = currentCycles.filter(
    (c) =>
      !(
        c.recurring_expense_id === input.recurring_expense_id &&
        c.period_year === input.period_year &&
        c.period_month === input.period_month
      )
  );
  saveLocalCycles(schoolId, [cyclePayment, ...filtered]);

  // 3. Trigger immediate real-time sync across all pages, windows, and dashboards
  try {
    broadcastFinanceUpdate({
      type: 'expense',
      schoolId,
      id: linkedExpenseId,
      amount: input.amount_paid,
      status: 'approved',
    });
  } catch (syncErr) {
    console.warn('broadcastFinanceUpdate error in recordRecurringExpensePayment:', syncErr);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pweza:expense-updated', {
        detail: { expenseId: linkedExpenseId, amount: input.amount_paid, status: 'approved' },
      })
    );
    window.dispatchEvent(
      new CustomEvent('pweza:finance-mutated', {
        detail: { type: 'expense', schoolId },
      })
    );
  }

  return { cyclePayment, expenseId: linkedExpenseId };
}

/**
 * Fetch past payment history for a specific recurring expense profile
 */
export async function fetchProfilePaymentHistory(
  schoolId: string,
  recurringExpenseId: string
): Promise<RecurringExpenseCyclePayment[]> {
  try {
    const { data, error } = await supabase
      .from('school_recurring_expense_cycles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('recurring_expense_id', recurringExpenseId)
      .order('payment_date', { ascending: false });

    if (!error && data) return data;
  } catch (err) {
    console.warn('Error fetching payment history from Supabase:', err);
  }

  const cycles = loadLocalCycles(schoolId);
  return cycles
    .filter((c) => c.recurring_expense_id === recurringExpenseId)
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
}
