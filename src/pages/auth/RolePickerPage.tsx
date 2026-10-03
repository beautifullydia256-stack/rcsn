import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { useAuthStore } from '@/store/authStore';
import { roleToPath } from '@/lib/postAuthRedirect';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getRoleTitle, getGreetingLastName } from '@/lib/roleTerminology';

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
    case 'hr':
    case 'hr_manager':
    case 'human_resource': return <Briefcase className="w-5 h-5 text-teal-400" />;
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
      <div className="h-screen min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400" />
      </div>
    );
  }

  return (
    <div className="h-screen min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-4 overflow-y-auto sm:overflow-hidden relative selection:bg-[#00873E] selection:text-white">
      {/* Background Campus Image - Crisp, Sharp, 100% Clear & Natural */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/images/rcsn/compound.jpg"
          alt="RCSN Campus Grounds"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Apple iOS Liquid Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm sm:max-w-md p-5 sm:p-7 rounded-[28px] 
          bg-slate-950/40 dark:bg-black/45 
          backdrop-blur-md backdrop-saturate-[150%] 
          border border-white/30 border-t-white/60 border-l-white/40 border-b-white/20 
          shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1.5px_2px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(255,255,255,0.15)] 
          my-auto overflow-hidden"
      >
        {/* Top Liquid Glass Specular Sheen (iOS Liquid Edge) */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-4 relative z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center mb-1">
            <img
              src="/images/rcsn/logo.png"
              alt="RCSN Crest"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 drop-shadow-sm">
            Welcome back{name ? `, ${getGreetingLastName(name, '')}` : ''}!
          </h1>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
            Select Your Portal Role
          </p>
        </div>

        <div className="space-y-2.5 relative z-10">
          {roles.map((r, i) => (
            <motion.button
              key={r}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => void pickRole(r)}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-white/20 bg-black/25 hover:border-emerald-400/60 hover:bg-black/45 backdrop-blur-md transition-all group text-left"
            >
              <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 group-hover:bg-emerald-500/20 transition-colors flex-shrink-0">
                {getRoleIcon(r)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm">{getRoleTitle(r, schoolType)}</div>
                <div className="text-white/60 text-[11px] mt-0.5">{roleToPath[r] ?? '/dashboard'}</div>
              </div>
              <span className="text-white/40 group-hover:text-emerald-400 transition-colors text-base font-bold">→</span>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-[11px] text-white/60 mt-5 relative z-10">
          You can switch roles at any time from the account menu.
        </p>
      </motion.div>
    </div>
  );
}
