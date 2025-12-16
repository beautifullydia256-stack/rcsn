'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';

interface StudentBalance {
  balance_id: string;
  student_id: string;
  term_id: string;
  total_fees: number;
  total_paid: number;
  balance: number;
  students: {
    name: string;
    admission_number: string;
  };
  classes?: {
    class_name: string;
  } | null;
  school_terms: {
    year: number;
    term: number;
  };
}

export default function BalancesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [currentTermId, setCurrentTermId] = useState<string | null>(null);
  const [balances, setBalances] = useState<StudentBalance[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userRow } = await supabase
        .from('users')
        .select('school_id, role')
        .eq('user_id', user.id)
        .single();

      if (!userRow?.school_id) {
        setError('School not found for user');
        return;
      }

      setSchoolId(userRow.school_id);

      if (userRow.role !== 'accountant' && userRow.role !== 'admin') {
        setError('Access denied. Accountant or Admin only.');
        return;
      }

      // Get current term
      const today = new Date().toISOString().slice(0, 10);
      const { data: allTerms } = await supabase
        .from('school_terms')
        .select('id, start_date, end_date')
        .eq('school_id', userRow.school_id)
        .order('year', { ascending: false })
        .order('term', { ascending: false });

      let currentTerm = (allTerms || []).find((t: any) =>
        t.start_date && t.end_date &&
        t.start_date <= today && t.end_date >= today
      );

      if (!currentTerm && allTerms && allTerms.length > 0) {
        currentTerm = allTerms[0];
      }

      if (currentTerm) {
        setCurrentTermId(currentTerm.id);
      }

      // Load classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('class_name')
        .eq('school_id', userRow.school_id)
        .order('class_name');
      const uniqueClasses = (classesData || []).map(c => c.class_name);
      setClasses(uniqueClasses);

      // Load balances
      let balancesQuery = supabase
        .from('student_balances')
        .select(`
          balance_id,
          student_id,
          term_id,
          total_fees,
          total_paid,
          balance,
          students!inner(name, admission_number),
          classes(class_name),
          school_terms(year, term)
        `)
        .eq('school_id', userRow.school_id);

      if (currentTerm?.id) {
        balancesQuery = balancesQuery.eq('term_id', currentTerm.id);
      }

      const { data: balancesData } = await balancesQuery
        .order('balance', { ascending: false });

      setBalances(balancesData as any || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const filteredBalances = useMemo(() => {
    const q = search.toLowerCase();
    return balances.filter(b => {
      const matchClass = selectedClass ? (b.classes?.class_name === selectedClass) : true;
      const matchSearch = !q ||
        b.students.name.toLowerCase().includes(q) ||
        (b.students.admission_number || '').toLowerCase().includes(q);
      let matchStatus = true;
      if (statusFilter === 'fully_paid') {
        matchStatus = b.balance <= 0 && b.total_fees > 0;
      } else if (statusFilter === 'partial') {
        matchStatus = b.total_paid > 0 && b.balance > 0;
      } else if (statusFilter === 'not_paid') {
        matchStatus = b.total_paid === 0;
      }
      return matchClass && matchSearch && matchStatus;
    });
  }, [balances, search, selectedClass, statusFilter]);

  const totalOutstanding = filteredBalances.reduce((sum, b) => sum + Math.max(0, Number(b.balance || 0)), 0);

  const exportToCSV = () => {
    const headers = ['Student', 'Admission Number', 'Class', 'Total Fees', 'Total Paid', 'Balance'];
    const rows = filteredBalances.map(b => [
      b.students.name,
      b.students.admission_number || '',
      b.classes?.class_name || '',
      b.total_fees.toString(),
      b.total_paid.toString(),
      b.balance.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balances_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 border-t-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-6 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Student Balances</h1>
            <p className="text-white/85">View outstanding balances for all students</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Total Outstanding</div>
          <div className="text-2xl font-semibold text-white">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(totalOutstanding)}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Students with Balances</div>
          <div className="text-2xl font-semibold text-white">
            {filteredBalances.filter(b => b.balance > 0).length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Fully Paid</div>
          <div className="text-2xl font-semibold text-emerald-400">
            {filteredBalances.filter(b => b.balance <= 0 && b.total_fees > 0).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search by name or admission number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          >
            <option value="" className="bg-slate-800">All Classes</option>
            {classes.map(c => (
              <option key={c} value={c} className="bg-slate-800">{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          >
            <option value="" className="bg-slate-800">All Status</option>
            <option value="fully_paid" className="bg-slate-800">Fully Paid</option>
            <option value="partial" className="bg-slate-800">Partial Payment</option>
            <option value="not_paid" className="bg-slate-800">Not Paid</option>
          </select>
        </div>
      </div>

      {/* Balances Table */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left font-medium px-4 py-3 text-white/90">Student</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Admission #</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Class</th>
                <th className="text-right font-medium px-4 py-3 text-white/90">Total Fees</th>
                <th className="text-right font-medium px-4 py-3 text-white/90">Total Paid</th>
                <th className="text-right font-medium px-4 py-3 text-white/90">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/60">
                    No balances found
                  </td>
                </tr>
              ) : (
                filteredBalances.map((balance) => (
                  <tr key={balance.balance_id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white/90">{balance.students.name}</td>
                    <td className="px-4 py-3 text-white/90">{balance.students.admission_number || '-'}</td>
                    <td className="px-4 py-3 text-white/90">{balance.classes?.class_name || '-'}</td>
                    <td className="px-4 py-3 text-right text-white/90">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(balance.total_fees)}
                    </td>
                    <td className="px-4 py-3 text-right text-white/90">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(balance.total_paid)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      balance.balance > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(balance.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


