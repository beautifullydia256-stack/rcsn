import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

function roleToDashboard(role?: string | null): string {
  if (!role) return '/login';
  
  const roleLower = role.toLowerCase();
  switch (roleLower) {
    case 'admin':
      return '/dashboard/admin';
    case 'teacher':
      return '/dashboard/teacher';
    case 'student':
      return '/dashboard/student';
    case 'parent':
      return '/dashboard/parent';
    case 'accountant':
      return '/dashboard/accountant';
    case 'librarian':
      return '/dashboard/librarian';
    case 'head_teacher':
      return '/dashboard/head-teacher';
    case 'owner':
      return '/dashboard/owner';
    default:
      return '/login';
  }
}

export default function DashboardEntry() {
  const navigate = useNavigate();
  const { role } = useAuthStore();

  useEffect(() => {
    const dashboard = roleToDashboard(role);
    navigate(dashboard, { replace: true });
  }, [role, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  );
}




