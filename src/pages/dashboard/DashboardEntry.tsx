import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { roleToDashboard } from '../../lib/rbac';

export default function DashboardEntry() {
  const { role } = useAuthStore();

  if (isDesktopApp) {
    return null;
  }

  const dashboard = roleToDashboard(role);
  return <Navigate to={dashboard} replace />;
}
