import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { useAuthStore } from '@/store/authStore';
import { roleToPath } from '@/lib/postAuthRedirect';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getRoleTitle } from '@/lib/roleTerminology';

import {
  GraduationCap, School, BookOpen, Users, Award, Briefcase,
  Compass, Wallet, TestTube, Building2, ClipboardList, Settings, User
} from 'lucide-react';

function getRoleIcon(role: string): React.ReactNode {
  switch (role) {
    case 'admin': return <School className="w-5 h-5 text-blue-400" />;
    case 'teacher': return <BookOpen className="w-5 h-5 text-emerald-400" />;
    case 'parent': return <Users className="w-5 h-5 text-violet-400" />;
    case 'head_teacher': return <Award className="w-5 h-5 text-amber-400" />;
    case 'deputy_head_teacher': return <Briefcase className="w-5 h-5 text-sky-400" />;
    case 'dos':
    case 'deputy_dos': return <Compass className="w-5 h-5 text-indigo-400" />;
    case 'accountant': return <Wallet className="w-5 h-5 text-emerald-400" />;
    case 'librarian': return <BookOpen className="w-5 h-5 text-cyan-400" />;
    case 'lab_technician': return <TestTube className="w-5 h-5 text-teal-400" />;
    case 'clinician': return <Building2 className="w-5 h-5 text-rose-400" />;
    case 'secretary': return <ClipboardList className="w-5 h-5 text-orange-400" />;
    case 'student': return <GraduationCap className="w-5 h-5 text-purple-400" />;
    case 'owner': return <Settings className="w-5 h-5 text-yellow-400" />;
    default: return <User className="w-5 h-5 text-slate-400" />;
  }
}

export default function RolePickerPage() {
  const { schoolType } = useSchoolType();
  const navigate = useNavigate();
  const location = useLocation();
  // SchoolPickerPage passes the accurately-merged role list as nav state so this page
  // can show the correct roles even when users.extra_roles was overwritten with stale
  // data during the preceding school-activation call.
  const navState = location.state as { allRoles?: string[]; primaryRole?: string } | null;
  const { setRole, setActiveRole, role: storedRole } = useAuthStore();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login', { replace: true }); return; }

      const { data } = await supabase
        .from('users')
        .select('role, extra_roles, name')
        .eq('user_id', user.id)
        .single();

      if (!data) { navigate('/login', { replace: true }); return; }

      setName(data.name || user.email || '');

      // Prefer nav state roles (pre-merged by the listing endpoint, not affected by stale
      // school-activation writes) over the raw DB value which may have been wiped.
      let allRoles: string[];
      const navRoles = navState?.allRoles;
      if (Array.isArray(navRoles) && navRoles.length > 1) {
        allRoles = navRoles.map((r) => String(r).toLowerCase()).filter(Boolean);
      } else {
        const primaryRole = String(data.role || '').toLowerCase();
        const extras = Array.isArray(data.extra_roles) ? (data.extra_roles as string[]) : [];
        allRoles = Array.from(new Set([primaryRole, ...extras].filter(Boolean)));
      }

      if (allRoles.length <= 1) {
        // No multi-role — go directly to dashboard
        const path = roleToPath[allRoles[0] || String(data.role || '').toLowerCase()] || '/dashboard';
        setRole(allRoles[0] || String(data.role || '').toLowerCase());
        navigate(path, { replace: true });
        return;
      }

      setRoles(allRoles);
      setLoading(false);
    };
    void fetchRoles();
  }, [navigate, setRole, navState]);

  const pickRole = async (chosen: string) => {
    setRole(chosen);
    setActiveRole(chosen);
    // Persist server-side too — RLS policies read `users.role` directly, so a role picked
    // here needs to actually land there, not just in client state.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        await fetch(registerApiUrl('/api/misc?action=auth-activate-school-role'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: chosen }),
        });
      }
    } catch {
      /* best-effort — UI still routes to the chosen role's dashboard */
    }
    const path = roleToPath[chosen] || '/dashboard';
    navigate(path, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f]">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#05080f] px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#eef3ff] mb-1">Welcome back{name ? `, ${name.split(' ')[0]}` : ''}!</h1>
          <p className="text-[#8296be] text-sm">You have multiple roles. Which would you like to use?</p>
        </div>

        <div className="space-y-3">
          {roles.map((r, i) => (
            <motion.button
              key={r}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => void pickRole(r)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-[#101828] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group text-left"
            >
              <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-emerald-500/10 transition-colors flex-shrink-0">
                {getRoleIcon(r)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[#eef3ff] font-semibold text-sm">{getRoleTitle(r, schoolType)}</div>
                <div className="text-[#8296be] text-xs mt-0.5">{roleToPath[r] ?? '/dashboard'}</div>
              </div>
              <span className="text-[#3d5278] group-hover:text-emerald-400 transition-colors text-lg">→</span>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-xs text-[#3d5278] mt-6">
          You can switch roles at any time from the sidebar.
        </p>
      </motion.div>
    </div>
  );
}
