'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';

export default function DashboardIndex() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const go = async () => {
      try {
        // Ensure we are authenticated (middleware should enforce this already)
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) {
          router.replace('/login');
          return;
        }

        const user = session.user;
        const roleFromMeta = (user.user_metadata?.role || '').toLowerCase();

        // Role to path mapping
        const roleToPath: Record<string, string> = {
          owner: '/dashboard/owner',
          admin: '/dashboard/admin',
          teacher: '/dashboard/teacher',
          parent: '/dashboard/parent',
          student: '/dashboard/student',
        };

        let resolvedRole = roleFromMeta as string | undefined;

        // Fallback to users table if metadata doesn't have role
        if (!resolvedRole) {
          try {
            const { data: userRows, error } = await supabase
              .from('users')
              .select('role')
              .eq('user_id', user.id)
              .limit(1);
            if (!error && userRows && userRows.length > 0) {
              resolvedRole = (userRows[0].role || '').toLowerCase();
            }
          } catch {}
        }

        // Heuristic: students may have student_id in metadata
        if (!resolvedRole) {
          const studentId = (user.user_metadata as any)?.student_id as string | undefined;
          if (studentId) resolvedRole = 'student';
        }

        const destination = roleToPath[resolvedRole || ''] || '/';
        router.replace(destination);
      } catch {
        router.replace('/');
      } finally {
        setRedirecting(false);
      }
    };
    go();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-700">
        {redirecting ? 'Redirecting…' : 'Preparing dashboard…'}
      </div>
    </div>
  );
}


