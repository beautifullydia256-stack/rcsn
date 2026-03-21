import { Outlet } from 'react-router-dom';

/** Renders child finance routes (dashboard, outstanding, placeholders) inside AdminLayout. */
export default function FinanceLayout() {
  return <Outlet />;
}
