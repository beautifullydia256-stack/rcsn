import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  ArrowLeft,
  X,
  Save,
  Loader2,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Layers,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useToast } from '@/components/Toast';
import {
  fetchStaffSalaryObligations,
  StaffObligationRow,
  StaffKind,
  PayFrequency,
} from '@/features/payroll-obligations/services/salaryObligationService';

function fmtUGX(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function HrSalariesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const schoolId = useAuthStore((s) => s.schoolId);
  const { isTertiary } = useSchoolType();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [activeTab, setActiveTab] = useState<'all' | 'teachers' | 'non_teaching'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected employee modal for editing salary setup
  const [editingStaff, setEditingStaff] = useState<StaffObligationRow | null>(null);
  const [formSalary, setFormSalary] = useState<string>('');
  const [formFrequency, setFormFrequency] = useState<PayFrequency>('monthly');

  // Fetch salary obligations
  const {
    data: salaryData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['hr', 'salary-obligations-setup', schoolId, currentYear, currentMonth],
    queryFn: () =>
      schoolId
        ? fetchStaffSalaryObligations(schoolId, currentYear, currentMonth, 0)
        : Promise.resolve({ rows: [], summary: {} as any }),
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(schoolId),
  });

  const { rows = [], summary } = salaryData || {};

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Tab filter
      if (activeTab === 'teachers' && r.kind !== 'teacher') return false;
      if (activeTab === 'non_teaching' && r.kind !== 'other_staff') return false;

      // Frequency filter
      if (frequencyFilter !== 'all' && r.pay_frequency !== frequencyFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesRole = (r.role_or_title || '').toLowerCase().includes(q);
        const matchesPhone = (r.phone || '').includes(q);
        if (!matchesName && !matchesRole && !matchesPhone) return false;
      }

      return true;
    });
  }, [rows, activeTab, frequencyFilter, searchQuery]);

  // Open modal
  const openEditModal = (staff: StaffObligationRow) => {
    setEditingStaff(staff);
    setFormSalary(String(staff.base_salary || 0));
    setFormFrequency(staff.pay_frequency || 'monthly');
  };

  // Close modal
  const closeModal = () => {
    setEditingStaff(null);
  };

  // Update Salary Scale Mutation
  const updateSalaryMutation = useMutation({
    mutationFn: async () => {
      if (!editingStaff || !schoolId) throw new Error('Missing employee data');
      const numericSalary = Math.max(0, Number(formSalary) || 0);

      if (editingStaff.kind === 'teacher') {
        const { error } = await supabase
          .from('teachers')
          .update({
            salary: numericSalary,
          })
          .eq('teacher_id', editingStaff.id)
          .eq('school_id', schoolId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('other_staff_members')
          .update({
            salary_amount: numericSalary,
            pay_frequency: formFrequency,
          })
          .eq('id', editingStaff.id)
          .eq('school_id', schoolId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Salary scale updated successfully');
      queryClient.invalidateQueries({ queryKey: ['hr', 'salary-obligations-setup'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'salary-commitments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-obligations'] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update salary');
    },
  });

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
              style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
            >
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider"
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    borderColor: 'rgba(16, 185, 129, 0.25)',
                    color: '#10b981',
                  }}
                >
                  Compensation & Payroll Scales
                </span>
                <span className="text-xs font-semibold" style={{ color: t.textMuted }}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: t.textPrimary }}>
                Staff Salary & Wage Configuration
              </h1>
              <p className="text-xs font-semibold mt-0.5" style={{ color: t.textMuted }}>
                Configure base salaries, wage frequencies, and contractual pay scales for academic tutors and support personnel.
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

        {/* Informative Separation of Duty Notice */}
        <div
          className="mt-5 p-3.5 rounded-xl border flex items-center gap-3 text-xs"
          style={{ background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.2)' }}
        >
          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
          <span style={{ color: t.textPrimary }}>
            <strong>Human Resource Authority:</strong> As HR Manager, you define and manage employee salary scales and contracts. Actual payment vouchers and bank disbursements are executed separately by the Bursar / Finance Office.
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monthly Payroll Obligation */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Total Monthly Obligation
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: '#10b981' }}>
              {fmtUGX(summary?.total_monthly_payroll_obligation || 0)}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              All {summary?.total_staff_count || 0} active employees
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}
          >
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Tutors Monthly Obligation */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              {isTertiary ? 'Tutors Commitment' : 'Teachers Commitment'}
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandBlue }}>
              {fmtUGX(summary?.teachers_monthly_obligation || 0)}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {summary?.total_teachers_count || 0} faculty members
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Support Staff Commitment */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Support Staff Commitment
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandGold }}>
              {fmtUGX(summary?.other_staff_monthly_obligation || 0)}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {summary?.total_other_staff_count || 0} support workers
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Daily Casual Wage Liability */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Daily Wage Rate
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: '#8b5cf6' }}>
              {fmtUGX(summary?.daily_wage_obligation || 0)}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Casual/daily worker rate
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
          >
            <Clock className="w-5 h-5" />
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
            onClick={() => setActiveTab('all')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            style={{
              background: activeTab === 'all' ? t.brandBlue : t.surface,
              borderColor: activeTab === 'all' ? t.brandBlue : t.border,
              color: activeTab === 'all' ? '#ffffff' : t.textMuted,
            }}
          >
            All Staff ({rows.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            style={{
              background: activeTab === 'teachers' ? t.brandBlue : t.surface,
              borderColor: activeTab === 'teachers' ? t.brandBlue : t.border,
              color: activeTab === 'teachers' ? '#ffffff' : t.textMuted,
            }}
          >
            {isTertiary ? 'Tutors & Lecturers' : 'Teachers'} ({summary?.total_teachers_count || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('non_teaching')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            style={{
              background: activeTab === 'non_teaching' ? t.brandBlue : t.surface,
              borderColor: activeTab === 'non_teaching' ? t.brandBlue : t.border,
              color: activeTab === 'non_teaching' ? '#ffffff' : t.textMuted,
            }}
          >
            Support Staff ({summary?.total_other_staff_count || 0})
          </button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1 hidden sm:block" />

          {/* Pay Frequency Dropdown */}
          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 shadow-sm"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          >
            <option value="all">All Frequencies</option>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="termly">Termly</option>
            <option value="annual">Annual</option>
          </select>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee name, role, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          />
        </div>
      </div>

      {/* Salary Configuration Table */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: t.border }}>
          <div>
            <h2 className="text-sm font-black" style={{ color: t.textPrimary }}>
              Staff Remuneration Roster
            </h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
              Select an employee to adjust base remuneration and frequency.
            </p>
          </div>
          <div
            className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg border bg-black/5 dark:bg-white/5"
            style={{ borderColor: t.border }}
          >
            {filteredRows.length} Employees Shown
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3" style={{ color: t.textMuted }}>
            <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
            <span className="text-sm font-semibold">Loading compensation records...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center" style={{ color: t.textMuted }}>
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
            <p className="text-sm font-bold" style={{ color: t.textPrimary }}>
              No staff members found
            </p>
            <p className="text-xs mt-1">Try resetting the filter or search query.</p>
          </div>
        ) : (
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
                  <th className="p-3 font-bold uppercase tracking-wider w-32" style={{ color: t.textMuted }}>
                    Category
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-32" style={{ color: t.textMuted }}>
                    Pay Frequency
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-36 text-right" style={{ color: t.textMuted }}>
                    Base Remuneration
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-36 text-right bg-emerald-500/5" style={{ color: '#10b981' }}>
                    Monthly Commitment
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-32 text-center" style={{ color: t.textMuted }}>
                    Finance Status
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-24 text-center" style={{ color: t.textMuted }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.border }}>
                {filteredRows.map((staff, idx) => (
                  <tr
                    key={staff.id}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="p-3 text-center font-bold text-xs" style={{ color: t.textMuted }}>
                      {idx + 1}
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                        {staff.name}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                        {staff.role_or_title} {staff.department ? `· ${staff.department}` : ''}
                      </div>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          staff.kind === 'teacher'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {staff.kind === 'teacher' ? (isTertiary ? 'Tutor' : 'Teacher') : 'Support Staff'}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="capitalize font-semibold text-xs" style={{ color: t.textPrimary }}>
                        {staff.pay_frequency}
                      </span>
                    </td>

                    <td className="p-3 text-right font-mono font-bold" style={{ color: t.textPrimary }}>
                      {staff.base_salary > 0 ? fmtUGX(staff.base_salary) : 'Not Set'}
                    </td>

                    <td className="p-3 text-right font-mono font-black bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                      {staff.monthly_equivalent > 0 ? fmtUGX(staff.monthly_equivalent) : '–'}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          staff.payment_status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                            : staff.payment_status === 'partial'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                        }`}
                      >
                        {staff.payment_status === 'paid' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span className="capitalize">{staff.payment_status}</span>
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => openEditModal(staff)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        Set Salary
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Compensation Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: t.border }}>
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-5 h-5 text-teal-500" />
                <div>
                  <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>
                    Configure Compensation
                  </h3>
                  <p className="text-xs" style={{ color: t.textMuted }}>
                    {editingStaff.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSalaryMutation.mutate();
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
                  Employee Category & Role
                </label>
                <div
                  className="p-2.5 rounded-xl border text-xs font-semibold"
                  style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
                >
                  {editingStaff.kind === 'teacher' ? (isTertiary ? 'Tutor / Faculty Member' : 'Teacher') : 'Support Staff'} · {editingStaff.role_or_title}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
                  Base Salary (UGX)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value)}
                  placeholder="e.g. 1500000"
                  className="w-full px-3.5 py-2 rounded-xl border font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
                  Pay Frequency
                </label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value as PayFrequency)}
                  className="w-full px-3.5 py-2 rounded-xl border font-semibold text-xs outline-none focus:ring-2 focus:ring-teal-500"
                  style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily (Day-rate / Casual)</option>
                  <option value="termly">Termly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                  style={{ borderColor: t.border, color: t.textMuted }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSalaryMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {updateSalaryMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Compensation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
