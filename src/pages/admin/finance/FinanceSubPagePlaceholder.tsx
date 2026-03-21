import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/**
 * Temporary bridge: full payment/expense/receipt UIs live under the Accountant dashboard.
 * Routes here keep `/dashboard/admin/finance/*` URLs working until dedicated admin HTML pages exist.
 */
export default function FinanceSubPagePlaceholder() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { title, description, accountantPath } = useMemo(() => {
    if (pathname.includes('/finance/payments')) {
      return {
        title: 'Payments',
        description: 'Record payments, allocations, and receipts using the Accounting workspace (same data as Finance).',
        accountantPath: '/dashboard/accountant/payments',
      };
    }
    if (pathname.includes('/finance/expenses')) {
      return {
        title: 'Expenses',
        description: 'Review and approve school expenses.',
        accountantPath: '/dashboard/accountant/expenses',
      };
    }
    if (pathname.includes('/finance/fee-structure')) {
      return {
        title: 'Fee structure',
        description: 'Set class fees per term.',
        accountantPath: '/dashboard/accountant/fee-structure',
      };
    }
    if (pathname.includes('/finance/receipts')) {
      return {
        title: 'Receipts',
        description: 'View and print payment receipts.',
        accountantPath: '/dashboard/accountant/receipts',
      };
    }
    if (pathname.includes('/finance/reports')) {
      return {
        title: 'Financial reports',
        description: 'Analytics and exports.',
        accountantPath: '/dashboard/accountant/reports',
      };
    }
    return {
      title: 'Finance',
      description: 'Open the Accounting module for this section.',
      accountantPath: '/dashboard/accountant',
    };
  }, [pathname]);

  return (
    <div
      className="ac-glass-card mx-auto max-w-lg rounded-2xl border border-[var(--ac-border)] p-8 space-y-4"
      style={{ margin: '24px auto' }}
    >
      <Link to="/dashboard/admin/finance" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Finance overview
      </Link>
      <h1 className="text-xl font-semibold ac-text-primary">{title}</h1>
      <p className="text-sm ac-text-secondary leading-relaxed">{description}</p>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          onClick={() => navigate(accountantPath)}
        >
          Open in Accounting
        </button>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/admin')}
        >
          Admin home
        </button>
      </div>
    </div>
  );
}
