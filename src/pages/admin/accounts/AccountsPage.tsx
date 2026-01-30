import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { UserPlus, Shield, BookOpen, Calculator } from 'lucide-react';

interface UserAccount {
  user_id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  department?: string;
  position?: string;
  created_at: string;
  last_sign_in_at?: string;
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) return;
    const loadAccounts = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('school_id, role')
        .eq('user_id', authUser.id)
        .single();
      if (!userData?.school_id || userData.role !== 'admin') return;
      const { data: accountsData } = await supabase
        .from('users')
        .select('*')
        .eq('school_id', userData.school_id)
        .in('role', ['admin', 'librarian', 'accountant'])
        .order('created_at', { ascending: false });
      setAccounts(accountsData || []);
      setLoading(false);
    };
    loadAccounts();
  }, [authUser]);

  const filteredAccounts = useMemo(() => {
    let result = accounts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.department?.toLowerCase().includes(q)
      );
    }
    if (roleFilter) result = result.filter((a) => a.role === roleFilter);
    return result;
  }, [accounts, searchQuery, roleFilter]);

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the account for ${email}? This action cannot be undone.`)) return;
    setDeleting(userId);
    try {
      const { error } = await supabase.from('users').delete().eq('user_id', userId);
      if (error) throw error;
      setAccounts((prev) => prev.filter((a) => a.user_id !== userId));
    } catch (err: any) {
      alert(`Error: ${err.message}. You may need to remove this user via Supabase dashboard or API.`);
    } finally {
      setDeleting(null);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      case 'librarian': return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'accountant': return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
      default: return 'bg-white/10 text-white/80 border-white/20';
    }
  };

  if (loading) {
    return (
      <AdminPageWrapper title="Staff Accounts">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white" />
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Staff Accounts"
      subtitle="Manage admin, librarian, and accountant accounts"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div />
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/accounts/add')}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
        >
          <UserPlus className="w-5 h-5" />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`${adminCardClass} flex items-center gap-3`} style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)' }}>
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-white/70 text-sm">Admins</p>
            <p className="text-xl font-bold text-white">{accounts.filter((a) => a.role === 'admin').length}</p>
          </div>
        </div>
        <div className={`${adminCardClass} flex items-center gap-3`} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)' }}>
          <div className="p-2 rounded-lg bg-blue-500/20">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-white/70 text-sm">Librarians</p>
            <p className="text-xl font-bold text-white">{accounts.filter((a) => a.role === 'librarian').length}</p>
          </div>
        </div>
        <div className={`${adminCardClass} flex items-center gap-3`} style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)' }}>
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <Calculator className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white/70 text-sm">Accountants</p>
            <p className="text-xl font-bold text-white">{accounts.filter((a) => a.role === 'accountant').length}</p>
          </div>
        </div>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-48 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="librarian">Librarian</option>
            <option value="accountant">Accountant</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 bg-white/5 text-left">
                <th className="px-4 py-2 font-medium text-white/85">Name</th>
                <th className="px-4 py-2 font-medium text-white/85">Email</th>
                <th className="px-4 py-2 font-medium text-white/85">Role</th>
                <th className="px-4 py-2 font-medium text-white/85">Department</th>
                <th className="px-4 py-2 font-medium text-white/85">Last Sign-in</th>
                <th className="px-4 py-2 font-medium text-white/85">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/70">No accounts found.</td>
                </tr>
              ) : (
                filteredAccounts.map((a) => (
                  <tr key={a.user_id} className="border-b border-white/10 hover:bg-white/5">
                    <td className="px-4 py-2 text-white">{a.name || '-'}</td>
                    <td className="px-4 py-2 text-white/90">{a.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded border text-xs ${getRoleBadgeClass(a.role)}`}>{a.role}</span>
                    </td>
                    <td className="px-4 py-2 text-white/90">{a.department || '-'}</td>
                    <td className="px-4 py-2 text-white/90">
                      {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(a.user_id, a.email)}
                        disabled={deleting === a.user_id}
                        className="rounded bg-red-600/90 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {deleting === a.user_id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
