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

type SchoolOption = {
  school_id: string;
  school_name: string;
  role: string;
  extra_roles: string[];
};

export default function SchoolPickerPage() {
  const navigate = useNavigate();
  const { setActiveSchool } = useAuthStore();
  const [options, setOptions] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPickingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login', { replace: true }); return; }

      const [primaryRes, additionalRes] = await Promise.all([
        supabase
          .from('users')
          .select('role, extra_roles, school_id, is_active, name')
          .eq('user_id', user.id)
          .limit(1),
        supabase
          .from('user_school_memberships')
          .select('role, extra_roles, school_id')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ]);

      const primaryRows = (primaryRes.data ?? []).filter((r) => r.is_active !== false && r.school_id);
      const additionalRows = additionalRes.data ?? [];

      if (primaryRows[0]?.name) {
        setFirstName(String(primaryRows[0].name).split(' ')[0]);
      } else if (user.email) {
        setFirstName(user.email.split('@')[0]);
      }

      const allSchoolIds = [
        ...primaryRows.map((r) => ({ school_id: String(r.school_id), role: String(r.role ?? ''), extra_roles: (r.extra_roles ?? []) as string[] })),
        ...additionalRows.map((r) => ({ school_id: String(r.school_id), role: String(r.role ?? ''), extra_roles: (r.extra_roles ?? []) as string[] })),
      ];

      if (allSchoolIds.length === 0) { navigate('/dashboard', { replace: true }); return; }
      if (allSchoolIds.length === 1) {
        // Only one school — skip picker, go straight
        const m = allSchoolIds[0];
        setActiveSchool(m.school_id, m.role);
        navigate(roleToPath[m.role.toLowerCase()] || '/dashboard', { replace: true });
        return;
      }

      // Fetch school names in one query
      const schoolIds = allSchoolIds.map((m) => m.school_id);
      const { data: schoolRows } = await supabase
        .from('schools')
        .select('school_id, name')
        .in('school_id', schoolIds);

      const nameMap: Record<string, string> = {};
      for (const s of schoolRows ?? []) nameMap[String(s.school_id)] = String(s.name ?? 'School');

      setOptions(
        allSchoolIds.map((m) => ({
          school_id: m.school_id,
          school_name: nameMap[m.school_id] ?? 'School',
          role: m.role,
          extra_roles: m.extra_roles,
        }))
      );
      setLoading(false);
    };
    void load();
  }, [navigate, setActiveSchool]);

  const pick = async (opt: SchoolOption) => {
    setPickingId(opt.school_id);
    setActiveSchool(opt.school_id, opt.role);
    // If this school also has extra_roles, let the role-picker handle it
    const extras = opt.extra_roles.filter((r) => r && r !== opt.role);
    if (extras.length > 0) {
      navigate('/role-picker', { replace: true });
      return;
    }
    navigate(roleToPath[opt.role.toLowerCase()] || '/dashboard', { replace: true });
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
            🏫
          </div>
          <h1 className="text-2xl font-bold text-[#eef3ff] mb-1">
            Welcome back{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-[#8296be] text-sm">
            You are linked to multiple schools. Where would you like to go?
          </p>
        </div>

        <div className="space-y-3">
          {options.map((opt, i) => (
            <motion.button
              key={opt.school_id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => void pick(opt)}
              disabled={picking !== null}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-[#101828] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group text-left disabled:opacity-60"
            >
              <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-emerald-500/10 transition-colors flex-shrink-0">
                {picking === opt.school_id
                  ? <span className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin inline-block" />
                  : (ROLE_ICONS[opt.role] ?? '🏫')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[#eef3ff] font-semibold text-sm truncate">{opt.school_name}</div>
                <div className="text-[#8296be] text-xs mt-0.5">
                  {ROLE_LABELS[opt.role] ?? opt.role}
                </div>
              </div>
              <span className="text-[#3d5278] group-hover:text-emerald-400 transition-colors text-lg flex-shrink-0">→</span>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-xs text-[#3d5278] mt-6">
          Your data from each school is kept completely separate.
        </p>
      </motion.div>
    </div>
  );
}
