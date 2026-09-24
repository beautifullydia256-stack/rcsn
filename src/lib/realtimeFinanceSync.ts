import type { QueryClient } from '@tanstack/react-query';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { EXPENSES_QUERY_KEY } from '@/pages/accountant/api/expenses';
import { RECEIPTS_QUERY_KEY } from '@/pages/accountant/api/receipts';

export const FINANCIAL_ANALYTICS_QUERY_KEY = ['financial-analytics'] as const;

export type FinanceMutationDetail = {
  type: 'payment' | 'expense' | 'invoice' | 'balance';
  id?: string;
  status?: string;
  amount?: number;
  schoolId?: string | null;
  timestamp?: number;
};

// Global BroadcastChannel for multi-tab/cross-window immediate synchronization
const BROADCAST_CHANNEL_NAME = 'pweza_realtime_finance_bus';
let financeBroadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    financeBroadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (err) {
    console.warn('BroadcastChannel initialization error:', err);
  }
}

/**
 * Invalidates all queries related to finances, accounting, collections,
 * debts, trends, and admin KPIs so all dashboards update immediately.
 */
export function invalidateAllFinancialQueries(queryClient: QueryClient, schoolId?: string | null) {
  // 1. Accountant dashboard metrics (expected, collected, cash surplus, clearance efficiency, outstanding)
  void queryClient.invalidateQueries({ queryKey: ['accountant-dashboard-metrics'] });
  void queryClient.invalidateQueries({ queryKey: ['accountant', 'dashboard-metrics'] });

  // 2. Velocity trends & payment channels
  void queryClient.invalidateQueries({ queryKey: ['accountant-payment-trends-and-channels'] });

  // 3. Recent transactions list
  void queryClient.invalidateQueries({ queryKey: ['accountant-recent-transactions'] });
  void queryClient.invalidateQueries({ queryKey: ['accountant', 'recent-transactions'] });

  // 4. Top debtors
  void queryClient.invalidateQueries({ queryKey: ['accountant-top-debtors'] });

  // 5. Admin dashboard KPIs
  if (schoolId) {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.adminDashboardKpis(schoolId) });
  }
  void queryClient.invalidateQueries({ queryKey: ['admin', 'design-dashboard-kpis'] });
  void queryClient.invalidateQueries({ queryKey: ['admin', 'finance-dashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard-kpis'] });
  void queryClient.invalidateQueries({ queryKey: ['financial', 'overview'] });

  // 6. Expenses list & approvals
  void queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['accountant', 'expenses'] });
  void queryClient.invalidateQueries({ queryKey: ['accountant'] });
  void queryClient.invalidateQueries({ queryKey: FINANCIAL_ANALYTICS_QUERY_KEY });

  // 7. Receipts
  void queryClient.invalidateQueries({ queryKey: RECEIPTS_QUERY_KEY });
}

/**
 * Dispatches browser window events and cross-tab broadcasts so any mounted components,
 * modals, and dashboards immediately trigger their re-render and DOM updates in real time.
 */
export function broadcastFinanceUpdate(detail?: FinanceMutationDetail) {
  if (typeof window === 'undefined') return;

  const payload: FinanceMutationDetail = {
    ...detail,
    type: detail?.type || 'payment',
    timestamp: Date.now(),
  };

  // Dispatch local window events
  if (payload.type === 'payment') {
    window.dispatchEvent(new CustomEvent('pweza:payment-recorded', { detail: payload }));
  } else if (payload.type === 'expense') {
    window.dispatchEvent(new CustomEvent('pweza:expense-updated', { detail: payload }));
  }
  // Generic finance event that any dashboard can react to
  window.dispatchEvent(new CustomEvent('pweza:finance-mutated', { detail: payload }));
  window.dispatchEvent(new CustomEvent('pweza:clear-widgets-cache', { detail: payload }));

  // Broadcast across tabs/windows
  if (financeBroadcastChannel) {
    try {
      financeBroadcastChannel.postMessage(payload);
    } catch {
      // Fallback: localStorage ping
      try {
        localStorage.setItem('pweza:last-finance-mutation', JSON.stringify(payload));
      } catch { /* ignore */ }
    }
  } else {
    try {
      localStorage.setItem('pweza:last-finance-mutation', JSON.stringify(payload));
    } catch { /* ignore */ }
  }
}

/**
 * Sets up listeners for cross-tab broadcasts and localStorage fallback
 * to automatically invalidate queries when another window records a payment or approves an expense.
 */
export function setupCrossTabFinanceSync(queryClient: QueryClient) {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (event: MessageEvent<FinanceMutationDetail>) => {
    const payload = event.data;
    if (!payload?.type) return;

    invalidateAllFinancialQueries(queryClient, payload.schoolId);

    if (payload.type === 'payment') {
      window.dispatchEvent(new CustomEvent('pweza:payment-recorded', { detail: payload }));
    } else if (payload.type === 'expense') {
      window.dispatchEvent(new CustomEvent('pweza:expense-updated', { detail: payload }));
    }
    window.dispatchEvent(new CustomEvent('pweza:finance-mutated', { detail: payload }));
    window.dispatchEvent(new CustomEvent('pweza:clear-widgets-cache', { detail: payload }));
  };

  if (financeBroadcastChannel) {
    financeBroadcastChannel.addEventListener('message', handleMessage);
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'pweza:last-finance-mutation' && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue) as FinanceMutationDetail;
        invalidateAllFinancialQueries(queryClient, payload.schoolId);
        window.dispatchEvent(new CustomEvent('pweza:finance-mutated', { detail: payload }));
        window.dispatchEvent(new CustomEvent('pweza:clear-widgets-cache', { detail: payload }));
      } catch { /* ignore */ }
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    if (financeBroadcastChannel) {
      financeBroadcastChannel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
