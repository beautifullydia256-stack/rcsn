import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ensureCurrentAndNextAcademicYears } from '../lib/ensureAcademicYear';
import { refreshPermissionsForSession } from '../lib/refreshPermissions';
import ThemedLoadingView from '../components/ui/ThemedLoadingView';

export default function ProtectedRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { user, setUser, setRole, setSchoolId, setPermissions } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          navigate('/login');
          return;
        }

        // Get user role from users table (and is_active for deactivated accounts)
        const { data: userData } = await supabase
          .from('users')
          .select('role, school_id, is_active')
          .eq('user_id', session.user.id)
          .single();

        if (userData) {
          if (userData.is_active === false) {
            await supabase.auth.signOut();
            navigate('/login');
            return;
          }
          setUser(session.user);
          setRole(userData.role);
          setSchoolId(userData.school_id); // Set schoolId in store
          await refreshPermissionsForSession(supabase, setPermissions);
          void ensureCurrentAndNextAcademicYears(); // Keep academic calendar ahead
        } else {
          // Fallback to metadata
          const role = session.user.user_metadata?.role || 
                      (session.user.user_metadata?.student_id ? 'student' : null);
          setUser(session.user);
          setRole(role);
          setPermissions([]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login');
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/login');
        } else if (session) {
          setUser(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, setUser, setRole, setSchoolId]);

  if (loading) {
    return <ThemedLoadingView />;
  }

  return <Outlet />;
}




