import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { useAuthStore } from '@/store/authStore';
import { roleToPath } from '@/lib/postAuthRedirect';
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
    default: return <School className="w-5 h-5 text-slate-400" />;
  }
}

type SchoolOption = {
  school_id: string;
  school_name: string;
  role: string;
  extra_roles: string[];
};

type PendingInvite = {
  membership_id: string;
  school_id: string;
  school_name: string;
  role: string;
};

export default function SchoolPickerPage() {
  const navigate = useNavigate();
  const { setActiveSchool } = useAuthStore();
  const [options, setOptions] = useState<SchoolOption[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPickingId] = useState<string | null>(null);
  const [accepting, setAcceptingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    // Single-school system for Rakai Community School of Nursing:
    // Bypass school picker and direct user straight to the institution dashboard.
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const pick = async (opt: SchoolOption) => {
    setPickingId(opt.school_id);
    setPickError(null);
    const ok = await setActiveSchool(opt.school_id, opt.role);
    if (!ok) {
      setPickingId(null);
      setPickError('Could not switch to that school. Please try again.');
      return;
    }
    // If this school also has extra_roles, let the role-picker handle it.
    // Pass the merged role list as nav state — RolePickerPage uses it if users.extra_roles
    // is stale (can happen when school activation reads a stale membership row).
    const extras = opt.extra_roles.filter((r) => r && r !== opt.role);
    if (extras.length > 0) {
      navigate('/role-picker', { replace: true, state: { allRoles: [opt.role, ...extras], primaryRole: opt.role } });
      return;
    }
    navigate(roleToPath[opt.role.toLowerCase()] || '/dashboard', { replace: true });
  };

  const accept = async (invite: PendingInvite) => {
    setAcceptingId(invite.membership_id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(registerApiUrl('/api/misc?action=auth-accept-school-invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ membershipId: invite.membership_id }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.membership_id !== invite.membership_id));
        setOptions((prev) => [...prev, { school_id: invite.school_id, school_name: invite.school_name, role: invite.role, extra_roles: [] }]);
      }
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f]">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#05080f] px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <School className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#eef3ff] mb-1">
            Welcome back{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-[#8296be] text-sm">
            {options.length > 0 ? 'You are linked to multiple schools. Where would you like to go?' : 'You have a pending invitation.'}
          </p>
        </div>

        {pickError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {pickError}
          </div>
        )}

        {pending.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-3">Pending invitations</p>
            <div className="space-y-3">
              {pending.map((invite) => (
                <div
                  key={invite.membership_id}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.04]"
                >
                  <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 flex-shrink-0">
                    {getRoleIcon(invite.role)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#eef3ff] font-semibold text-sm truncate">{invite.school_name}</div>
                    <div className="text-[#8296be] text-xs mt-0.5">
                      Invited as {getRoleTitle(invite.role)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void accept(invite)}
                    disabled={accepting !== null}
                    className="flex-shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {accepting === invite.membership_id ? 'Accepting…' : 'Accept'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {options.length > 0 && (
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
                <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-emerald-500/10 transition-colors flex-shrink-0">
                  {picking === opt.school_id
                    ? <span className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin inline-block" />
                    : getRoleIcon(opt.role)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[#eef3ff] font-semibold text-sm truncate">{opt.school_name}</div>
                  <div className="text-[#8296be] text-xs mt-0.5">
                    {getRoleTitle(opt.role)}
                  </div>
                </div>
                <span className="text-[#3d5278] group-hover:text-emerald-400 transition-colors text-lg flex-shrink-0">→</span>
              </motion.button>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-[#3d5278] mt-6">
          Your data from each school is kept completely separate.
        </p>
      </motion.div>
    </div>
  );
}
