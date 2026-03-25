import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/** Old `/dashboard/chat` → role-specific messages inside each dashboard layout. */
export default function ChatRouteRedirect() {
  const role = useAuthStore((s) => s.role);
  const to = (() => {
    switch (role) {
      case 'teacher':
        return '/dashboard/teacher/messages';
      case 'parent':
        return '/dashboard/parent/messages';
      case 'student':
        return '/dashboard/student/messages';
      case 'accountant':
        return '/dashboard/accountant/messages';
      case 'admin':
      case 'head_teacher':
      default:
        return '/dashboard/admin/messages';
    }
  })();
  return <Navigate to={to} replace />;
}
