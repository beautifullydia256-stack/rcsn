import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Admin finance sub-routes delegate to the Accountant workspace (same data).
 * Immediate redirect keeps URLs valid while avoiding duplicate UIs.
 */
export default function FinanceSubPagePlaceholder() {
  const { pathname, search } = useLocation();

  const to = useMemo(() => {
    if (pathname.includes('/finance/student-ledger')) return `/dashboard/accountant/student-ledger${search}`;
    if (pathname.includes('/finance/payments/new')) return '/dashboard/accountant/payments';
    if (pathname.includes('/finance/payments')) return '/dashboard/accountant/payments';
    if (pathname.includes('/finance/expenses')) return '/dashboard/accountant/expenses';
    if (pathname.includes('/finance/fee-structure')) return '/dashboard/accountant/fee-structure';
    if (pathname.includes('/finance/receipts')) return '/dashboard/accountant/receipts';
    if (pathname.includes('/finance/reports')) return '/dashboard/accountant/reports';
    return '/dashboard/accountant';
  }, [pathname, search]);

  return <Navigate to={to} replace />;
}
