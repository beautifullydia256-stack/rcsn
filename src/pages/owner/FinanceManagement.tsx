import { Routes, Route } from 'react-router-dom';
import RevenueOverviewPage from './RevenueOverviewPage';
import SubscriptionsPage from './SubscriptionsPage';
import InvoicesPage from './InvoicesPage';
import PayoutsPage from './PayoutsPage';

export default function FinanceManagement() {
  return (
    <Routes>
      <Route index element={<RevenueOverviewPage />} />
      <Route path="subscriptions" element={<SubscriptionsPage />} />
      <Route path="invoices" element={<InvoicesPage />} />
      <Route path="payouts" element={<PayoutsPage />} />
    </Routes>
  );
}