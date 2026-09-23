export type RecurringExpenseCategory =
  | 'electricity'
  | 'water'
  | 'internet'
  | 'security'
  | 'waste'
  | 'rent'
  | 'software'
  | 'generator'
  | 'transport'
  | 'other';

export type RecurringExpenseFrequency = 'monthly' | 'termly' | 'weekly' | 'annually';

export type RecurringPaymentStatus = 'paid' | 'pending' | 'due_soon' | 'overdue';

export type PreferredPaymentMethod = 'mobile_money' | 'bank' | 'cash' | 'cheque' | 'other';

export interface RecurringExpense {
  id: string;
  school_id: string;
  title: string;
  category: RecurringExpenseCategory;
  provider_name: string;
  account_or_meter_no: string | null;
  frequency: RecurringExpenseFrequency;
  billing_day: number; // Day of the month (1-31) when bill is expected/due
  estimated_amount: number;
  payment_method_preferred: PreferredPaymentMethod;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringExpenseCyclePayment {
  id: string;
  recurring_expense_id: string;
  school_id: string;
  period_year: number;
  period_month: number; // 0-11
  period_label: string; // e.g. "September 2026"
  amount_paid: number;
  payment_date: string;
  payment_method: PreferredPaymentMethod;
  reference_no?: string;
  linked_expense_id?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface RecurringExpenseWithCycle extends RecurringExpense {
  current_cycle_status: RecurringPaymentStatus;
  amount_paid_this_cycle: number;
  balance_due_this_cycle: number;
  last_payment_date: string | null;
  linked_expense_id: string | null;
  cycle_payment_id: string | null;
}

export interface CreateRecurringExpenseInput {
  title: string;
  category: RecurringExpenseCategory;
  provider_name: string;
  account_or_meter_no?: string | null;
  frequency: RecurringExpenseFrequency;
  billing_day: number;
  estimated_amount: number;
  payment_method_preferred?: PreferredPaymentMethod;
  notes?: string | null;
}

export interface UpdateRecurringExpenseInput {
  title?: string;
  category?: RecurringExpenseCategory;
  provider_name?: string;
  account_or_meter_no?: string | null;
  frequency?: RecurringExpenseFrequency;
  billing_day?: number;
  estimated_amount?: number;
  payment_method_preferred?: PreferredPaymentMethod;
  is_active?: boolean;
  notes?: string | null;
}

export interface RecordRecurringPaymentInput {
  recurring_expense_id: string;
  period_year: number;
  period_month: number;
  amount_paid: number;
  payment_date: string;
  payment_method: PreferredPaymentMethod;
  reference_no?: string;
  notes?: string;
}

export interface RecurringExpenseSummary {
  total_active_profiles: number;
  total_monthly_recurring_budget: number;
  total_paid_this_month: number;
  total_pending_this_month: number;
  overdue_bills_count: number;
  due_soon_count: number;
  paid_bills_count: number;
  percent_paid: number;
}
