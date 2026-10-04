import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

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
    case 'deputy_head_teacher':
    case 'dos':
    case 'deputy_dos':
      return '/dashboard/academic-registrar';
    case 'owner':
      return '/dashboard/owner';
    default:
      return '/login';
  }
}

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

export default function RouteGuard({ children, requiredRole }: RouteGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const roleLower = role?.toLowerCase();
      
      if (!roleLower || !roles.some(r => r.toLowerCase() === roleLower)) {
        // Redirect to user's dashboard instead of login
        const dashboard = roleToDashboard(role);
        navigate(dashboard);
        return;
      }
    }
  }, [user, role, requiredRole, navigate, location]);

  if (!user) {
    return null;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const roleLower = role?.toLowerCase();
    
    if (!roleLower || !roles.some(r => r.toLowerCase() === roleLower)) {
      return null;
    }
  }

  return <>{children}</>;
}




