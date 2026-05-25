import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { roleToPath } from '@/lib/postAuthRedirect';

const ROLE_LABELS: Record<string, string> = {
  admin: 'School Administrator',
  teacher: 'Teacher',
  parent: 'Parent',
  head_teacher: 'Head Teacher',
  deputy_head_teacher: 'Deputy Head Teacher',
  dos: 'Director of Studies',
  deputy_dos: 'Deputy Director of Studies',
  accountant: 'Accountant',
  librarian: 'Librarian',
  lab_technician: 'Lab Technician',
  clinician: 'Clinician',
  secretary: 'Secretary',
  student: 'Student',
  owner: 'Owner',
};

const ROLE_ICONS: Record<string, string> = {
  admin: '🏫',
  teacher: '👨‍🏫',
  parent: '👨‍👧',
  head_teacher: '👩‍💼',
  deputy_head_teacher: '👨‍💼',
  dos: '📐',
  deputy_dos: '📏',
  accountant: '💰',
  librarian: '📚',
  lab_technician: '🔬',
  clinician: '🏥',
  secretary: '📋',
  student: '🎓',
  owner: '⚙️',
};

export default function RolePickerPage() {
  const navigate = useNavigate();
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
      const primaryRole = String(data.role || '').toLowerCase();
      const extras = Array.isArray(data.extra_roles) ? (data.extra_roles as string[]) : [];
      const allRoles = Array.from(new Set([primaryRole, ...extras].filter(Boolean)));

      if (allRoles.length <= 1) {
        // No multi-role — go directly to dashboard
        const path = roleToPath[primaryRole] || '/dashboard';
        setRole(primaryRole);
        navigate(path, { replace: true });
        return;
      }

      setRoles(allRoles);
      setLoading(false);
    };
    void fetchRoles();
  }, [navigate, setRole]);

  const pickRole = (chosen: string) => {
    setRole(chosen);
    setActiveRole(chosen);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            🎓
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
              onClick={() => pickRole(r)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-[#101828] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group text-left"
            >
              <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-emerald-500/10 transition-colors flex-shrink-0">
                {ROLE_ICONS[r] ?? '👤'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[#eef3ff] font-semibold text-sm">{ROLE_LABELS[r] ?? r}</div>
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
