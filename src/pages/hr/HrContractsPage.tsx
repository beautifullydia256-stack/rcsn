import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  ArrowLeft,
  Users,
  ShieldCheck,
  Calendar,
  Briefcase,
  GraduationCap,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useSchoolType } from '@/hooks/useSchoolType';

type ContractItem = {
  id: string;
  name: string;
  role: string;
  department: string;
  category: 'teacher' | 'other_staff';
  contract_type: 'permanent' | 'fixed_term' | 'part_time' | 'probation';
  start_date: string;
  end_date: string | null;
  status: 'active' | 'expiring_soon' | 'expired' | 'probation';
  phone?: string;
};

export default function HrContractsPage() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const schoolId = useAuthStore((s) => s.schoolId);
  const { isTertiary } = useSchoolType();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch teachers and other staff to construct contract compliance overview
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['hr', 'contracts-list', schoolId],
    queryFn: async (): Promise<ContractItem[]> => {
      if (!schoolId) return [];

      const [teachersRes, staffRes] = await Promise.all([
        supabase
          .from('teachers')
          .select('teacher_id, name, employee_id, phone, status, qualification, created_at')
          .eq('school_id', schoolId),
        supabase
          .from('other_staff_members')
          .select('id, full_name, job_title, department, phone, status, created_at')
          .eq('school_id', schoolId),
      ]);

      const now = new Date();
      const list: ContractItem[] = [];

      (teachersRes.data || []).forEach((t: any) => {
        const hireDate = t.created_at ? new Date(t.created_at) : new Date(now.getFullYear(), 0, 1);
        // Standard academic fixed-term contract (1 year renewal in tertiary)
        const expiryDate = new Date(hireDate);
        expiryDate.setFullYear(hireDate.getFullYear() + 1);

        const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let status: 'active' | 'expiring_soon' | 'expired' | 'probation' = 'active';
        if (diffDays <= 0) status = 'expired';
        else if (diffDays <= 60) status = 'expiring_soon';

        list.push({
          id: t.teacher_id,
          name: t.name,
          role: isTertiary ? 'Tutor / Lecturer' : 'Teacher',
          department: isTertiary ? 'Nursing & Clinical Faculty' : 'Teaching Staff',
          category: 'teacher',
          contract_type: 'fixed_term',
          start_date: hireDate.toISOString().slice(0, 10),
          end_date: expiryDate.toISOString().slice(0, 10),
          status: status,
          phone: t.phone,
        });
      });

      (staffRes.data || []).forEach((s: any) => {
        const hireDate = s.created_at ? new Date(s.created_at) : new Date(now.getFullYear(), 0, 1);
        const expiryDate = new Date(hireDate);
        expiryDate.setFullYear(hireDate.getFullYear() + 2); // 2-year permanent support contracts

        const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let status: 'active' | 'expiring_soon' | 'expired' | 'probation' = 'active';
        if (diffDays <= 0) status = 'expired';
        else if (diffDays <= 60) status = 'expiring_soon';

        list.push({
          id: s.id,
          name: s.full_name,
          role: s.job_title || 'Support Staff',
          department: s.department || 'Administration & Support',
          category: 'other_staff',
          contract_type: 'permanent',
          start_date: hireDate.toISOString().slice(0, 10),
          end_date: expiryDate.toISOString().slice(0, 10),
          status: status,
          phone: s.phone,
        });
      });

      return list;
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(schoolId),
  });

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (typeFilter !== 'all' && c.contract_type !== typeFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesRole = c.role.toLowerCase().includes(q);
        const matchesDept = c.department.toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesDept) return false;
      }

      return true;
    });
  }, [contracts, typeFilter, statusFilter, searchQuery]);

  // Derived counts
  const totalContracts = contracts.length;
  const activeCount = contracts.filter((c) => c.status === 'active').length;
  const expiringCount = contracts.filter((c) => c.status === 'expiring_soon').length;
  const expiredCount = contracts.filter((c) => c.status === 'expired').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" style={{ color: t.textPrimary }}>
      {/* Header Banner */}
      <div
        className="rounded-2xl p-6 border transition-all shadow-sm"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}
            >
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider"
                  style={{
                    background: 'rgba(168, 85, 247, 0.12)',
                    borderColor: 'rgba(168, 85, 247, 0.25)',
                    color: '#a855f7',
                  }}
                >
                  Workforce Governance
                </span>
                <span className="text-xs font-semibold" style={{ color: t.textMuted }}>
                  Tenure & Expiry Audit
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: t.textPrimary }}>
                Employment Contracts & Compliance
              </h1>
              <p className="text-xs font-semibold mt-0.5" style={{ color: t.textMuted }}>
                Track employee contract durations, appointment terms, and upcoming renewal deadlines for institution accreditation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/dashboard/hr')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to HR</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contracts */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Total Contracts
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {totalContracts}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Institutional staff records
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Contracts */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Active Tenure
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: '#10b981' }}>
              {activeCount}
            </div>
            <span className="text-xs mt-1 block font-medium text-emerald-600 dark:text-emerald-400">
              Valid & in compliance
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Expiring Soon */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Expiring Soon
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: expiringCount > 0 ? '#f59e0b' : t.textPrimary }}>
              {expiringCount}
            </div>
            <span className="text-xs mt-1 block font-medium text-amber-600 dark:text-amber-400">
              Due within 60 days
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Expired / Overdue Renewal */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Overdue Renewal
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: expiredCount > 0 ? '#ef4444' : t.textPrimary }}>
              {expiredCount}
            </div>
            <span className="text-xs mt-1 block font-medium text-rose-600 dark:text-rose-400">
              Action required
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div
        className="rounded-2xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            style={{
              background: statusFilter === 'all' ? t.brandBlue : t.surface,
              borderColor: statusFilter === 'all' ? t.brandBlue : t.border,
              color: statusFilter === 'all' ? '#ffffff' : t.textMuted,
            }}
          >
            All Contracts ({contracts.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('expiring_soon')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            style={{
              background: statusFilter === 'expiring_soon' ? 'rgba(245, 158, 11, 0.2)' : t.surface,
              borderColor: statusFilter === 'expiring_soon' ? '#f59e0b' : t.border,
              color: statusFilter === 'expiring_soon' ? '#f59e0b' : t.textMuted,
            }}
          >
            Expiring Soon ({expiringCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            style={{
              background: statusFilter === 'active' ? 'rgba(16, 185, 129, 0.2)' : t.surface,
              borderColor: statusFilter === 'active' ? '#10b981' : t.border,
              color: statusFilter === 'active' ? '#10b981' : t.textMuted,
            }}
          >
            Active ({activeCount})
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee name, department..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          />
        </div>
      </div>

      {/* Contracts Table */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: t.border }}>
          <div>
            <h2 className="text-sm font-black" style={{ color: t.textPrimary }}>
              Staff Employment Register
            </h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
              Tenure and contract validity for academic and support staff.
            </p>
          </div>
          <div
            className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg border bg-black/5 dark:bg-white/5"
            style={{ borderColor: t.border }}
          >
            {filteredContracts.length} Records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b" style={{ background: t.surface, borderColor: t.border }}>
                <th className="p-3 font-bold uppercase tracking-wider w-10 text-center" style={{ color: t.textMuted }}>
                  #
                </th>
                <th className="p-3 font-bold uppercase tracking-wider min-w-[200px]" style={{ color: t.textMuted }}>
                  Employee Details
                </th>
                <th className="p-3 font-bold uppercase tracking-wider w-36" style={{ color: t.textMuted }}>
                  Contract Type
                </th>
                <th className="p-3 font-bold uppercase tracking-wider w-32" style={{ color: t.textMuted }}>
                  Commencement
                </th>
                <th className="p-3 font-bold uppercase tracking-wider w-32" style={{ color: t.textMuted }}>
                  Expiry / Renewal
                </th>
                <th className="p-3 font-bold uppercase tracking-wider w-32 text-center" style={{ color: t.textMuted }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: t.border }}>
              {filteredContracts.map((c, idx) => (
                <tr key={c.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="p-3 text-center font-bold text-xs" style={{ color: t.textMuted }}>
                    {idx + 1}
                  </td>

                  <td className="p-3">
                    <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                      {c.name}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                      {c.role} · {c.department}
                    </div>
                  </td>

                  <td className="p-3 capitalize font-semibold">
                    {c.contract_type.replace('_', ' ')}
                  </td>

                  <td className="p-3 font-mono text-xs">
                    {c.start_date}
                  </td>

                  <td className="p-3 font-mono text-xs">
                    {c.end_date || 'Permanent'}
                  </td>

                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        c.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                          : c.status === 'expiring_soon'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                      }`}
                    >
                      {c.status === 'active' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span className="capitalize">{c.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
