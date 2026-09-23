import type { QueryClient } from '@tanstack/react-query';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { EXPENSES_QUERY_KEY } from '@/pages/accountant/api/expenses';
import { RECEIPTS_QUERY_KEY } from '@/pages/accountant/api/receipts';

export const FINANCIAL_ANALYTICS_QUERY_KEY = ['financial-analytics'] as const;

/**
 * Invalidates all queries related to finances, accounting, collections,
 * debts, trends, and admin KPIs so all dashboards update immediately.
 */
export function invalidateAllFinancialQueries(queryClient: QueryClient, schoolId?: string | null) {
  // 1. Accountant dashboard metrics (expected, collected, cash surplus, clearance efficiency, outstanding)
  void queryClient.invalidateQueries({ queryKey: ['accountant-dashboard-metrics'] });
  // 2. Velocity trends & payment channels
  void queryClient.invalidateQueries({ queryKey: ['accountant-payment-trends-and-channels'] });
  // 3. Recent transactions list
  void queryClient.invalidateQueries({ queryKey: ['accountant-recent-transactions'] });
  // 4. Top debtors
  void queryClient.invalidateQueries({ queryKey: ['accountant-top-debtors'] });
  // 5. Admin dashboard KPIs
  if (schoolId) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.adminDashboardKpis(schoolId) });
  }
  void queryClient.invalidateQueries({ queryKey: ['admin', 'design-dashboard-kpis'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard-kpis'] });
  // 6. Expenses list & approvals
  void queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['accountant', 'expenses'] });
  void queryClient.invalidateQueries({ queryKey: ['accountant'] });
  void queryClient.invalidateQueries({ queryKey: FINANCIAL_ANALYTICS_QUERY_KEY });
  // 7. Receipts
  void queryClient.invalidateQueries({ queryKey: RECEIPTS_QUERY_KEY });
}

export type FinanceMutationDetail = {
  type: 'payment' | 'expense' | 'invoice' | 'balance';
  id?: string;
  status?: string;
  amount?: number;
  schoolId?: string | null;
};

/**
 * Dispatches browser window events so any mounted components, modals,
 * and dashboards immediately trigger their re-render and DOM updates.
 */
export function broadcastFinanceUpdate(detail?: FinanceMutationDetail) {
  if (typeof window === 'undefined') return;
  if (detail?.type === 'payment') {
    window.dispatchEvent(new CustomEvent('pweza:payment-recorded', { detail }));
  } else if (detail?.type === 'expense') {
    window.dispatchEvent(new CustomEvent('pweza:expense-updated', { detail }));
  }
  // Generic finance event that any dashboard can react to
  window.dispatchEvent(new CustomEvent('pweza:finance-mutated', { detail }));
}
