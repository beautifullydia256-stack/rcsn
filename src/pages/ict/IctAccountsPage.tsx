import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  KeyRound,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  User,
  GraduationCap,
  BookOpen,
  Phone,
  Mail,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';
import { registerApiUrl } from '@/lib/registerApiOrigin';

interface AccountUser {
  user_id: string;
  name: string | null;
  email: string;
  role: string;
  extra_roles?: string[];
  phone: string | null;
  is_active: boolean;
  department: string | null;
  position: string | null;
  student_id: string | null;
  employee_id: string | null;
  created_at: string;
}

export default function IctAccountsPage() {
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');

  // Modal State
  const [selectedUser, setSelectedUser] = useState<AccountUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [notifySms, setNotifySms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ password: string; name: string; smsSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch Users
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['ict-accounts-list', schoolId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_id, name, email, role, extra_roles, phone, is_active, department, position, student_id, employee_id, created_at')
          .or(`school_id.eq.${schoolId},school_id.is.null`)
          .order('name', { ascending: true })
          .limit(300);

        if (error) {
          console.warn('IctAccountsPage fetch warning:', error);
          return [];
        }
        return (data || []) as AccountUser[];
      } catch (err) {
        console.warn('IctAccountsPage fetch error:', err);
        return [];
      }
    },
  });

  // Filter Users
  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase().trim();
    const matchSearch =
      !term ||
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.phone && u.phone.includes(term)) ||
      (u.student_id && u.student_id.toLowerCase().includes(term));

    const roleNorm = (u.role || '').toLowerCase();
    const matchRole =
      roleFilter === 'all' ||
      (roleFilter === 'student' && roleNorm === 'student') ||
      (roleFilter === 'teacher' && (roleNorm === 'teacher' || roleNorm === 'tutor' || roleNorm === 'lecturer'));

    return matchSearch && matchRole;
  });

  // Security Check: Is user an Administrator/Bursar?
  const isProtectedRole = (u: AccountUser) => {
    const FORBIDDEN = ['admin', 'owner', 'head_teacher', 'accountant', 'bursar', 'academic_registrar', 'principal'];
    const r = (u.role || '').toLowerCase();
    const extras = Array.isArray(u.extra_roles) ? u.extra_roles.map((x) => x.toLowerCase()) : [];
    return FORBIDDEN.includes(r) || extras.some((x) => FORBIDDEN.includes(x));
  };

  const handleOpenResetModal = (u: AccountUser) => {
    setSelectedUser(u);
    setErrorMsg(null);
    setSuccessResult(null);
    setCopied(false);
    // Generate a default high-security friendly password
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setNewPassword(`Rcsn@${randomSuffix}`);
  };

  const handleGeneratePassword = () => {
    const words = ['Kofi', 'Rcsn', 'Care', 'Nurse', 'Apex', 'Tech', 'Duty'];
    const word = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setNewPassword(`${word}!${num}`);
  };

  const handleExecuteReset = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token found. Please re-login.');

      const response = await fetch(registerApiUrl('/api/misc?action=ict-password-reset'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: selectedUser.user_id,
          newPassword,
          notifySms,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reset password.');
      }

      setSuccessResult({
        password: newPassword,
        name: selectedUser.name || selectedUser.email,
        smsSent: Boolean(result.smsSent),
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while resetting password.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdminPageWrapper
      eyebrow="USER ASSISTANCE & SECURITY"
      title="Account Help & Password Resets"
      subtitle="Instantly look up students and tutors to issue login credentials and reset forgotten passwords on the spot."
    >
      {/* Search & Filter Controls */}
      <div className={`${adminCardClass} space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or student ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === 'all'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white'
              }`}
            >
              All Accounts
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('student')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === 'student'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white'
              }`}
            >
              Students Only
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('teacher')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white'
              }`}
            >
              Tutors Only
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white"
              title="Refresh users"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className={adminCardClass}>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-600 dark:text-slate-400 text-sm">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
              Loading institutional directory...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-600 dark:text-slate-400 text-sm">
              No matching accounts found for "{searchQuery}".
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Designation</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">ID / Number</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredUsers.map((u) => {
                  const protectedAcc = isProtectedRole(u);
                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30">
                            {u.role === 'student' ? <GraduationCap className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-xs">{u.name || 'Unnamed Account'}</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 uppercase tracking-wide border border-slate-200 dark:border-transparent">
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3 text-slate-700 dark:text-slate-300">
                        {u.phone ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="h-3 w-3 text-slate-500 dark:text-slate-400" /> {u.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400">No phone</span>
                        )}
                      </td>

                      <td className="py-3 font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {u.student_id || u.employee_id || '—'}
                      </td>

                      <td className="py-3">
                        {u.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
                            <AlertTriangle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 text-right">
                        {protectedAcc ? (
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Admin Account
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium text-xs transition-colors"
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Reset Password
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {selectedUser && (
        <NativeModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`Reset Password for ${selectedUser.name || selectedUser.email}`}
          size="md"
        >
          {successResult ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Password Updated Instantly</h3>
                <p className="text-xs text-slate-300">
                  The password has been set immediately in the database. The user can now log in right away.
                </p>
                {successResult.smsSent && (
                  <p className="text-[11px] text-emerald-300 font-medium">
                    SMS notification dispatched to user's phone.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>User Login:</span>
                  <span className="font-mono text-white">{selectedUser.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>New Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-sm">{successResult.password}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(successResult.password)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Copy password"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs space-y-1">
                <p className="text-slate-400">Target User: <strong className="text-white">{selectedUser.name || 'Unnamed'}</strong></p>
                <p className="text-slate-400">Role: <span className="uppercase text-emerald-400 font-semibold">{selectedUser.role}</span></p>
                <p className="text-slate-400">Email: <span className="font-mono text-slate-300">{selectedUser.email}</span></p>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Set New Password</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-900 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              {selectedUser.phone && (
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                    className="rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-0"
                  />
                  <span>Send SMS notification with temporary password to {selectedUser.phone}</span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleExecuteReset}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm"
                >
                  {submitting ? 'Setting Password...' : 'Set Password Immediately'}
                </button>
              </div>
            </div>
          )}
        </NativeModal>
      )}
    </AdminPageWrapper>
  );
}
