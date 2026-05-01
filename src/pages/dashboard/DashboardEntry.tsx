import { useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ThemedLoadingView from '../../components/ui/ThemedLoadingView';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { roleToDashboard } from '../../lib/rbac';

export default function DashboardEntry() {
  const navigate = useNavigate();
  const { role } = useAuthStore();

  useLayoutEffect(() => {
    const dashboard = roleToDashboard(role);
    navigate(dashboard, { replace: true });
  }, [role, navigate]);

  if (isDesktopApp) {
    return null;
  }

  return <ThemedLoadingView />;
}




