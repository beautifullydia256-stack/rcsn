import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { loadOutstandingBalanceAggByStudent } from '../../../lib/adminFinanceTerm';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

interface Row {
  student_id: string;
  student_name: string;
  current_class: string;
  parent_name?: string;
  parent_email?: string;
  amount_paid: number;
  balance: number;
  has_pending: boolean;
}

export async function fetchOutstanding(userId: string): Promise<Row[]> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return [];

  const balanceByStudent = await loadOutstandingBalanceAggByStudent(supabase, data.school_id);

  const [studsRes, parentsRes] = await Promise.all([
    supabase
      .from('students')
      .select('student_id,name,current_class,status')
      .eq('school_id', data.school_id)
      .eq('status', 'active'),
    supabase.from('parents').select('student_id,name,email').eq('school_id', data.school_id),
  ]);
  const studs = studsRes.data || [];
  const parents = parentsRes.data || [];
  const parentByStudent = new Map(parents.map((p: any) => [p.student_id, { name: p.name, email: p.email }]));

  const computed: Row[] = (studs || []).map((s: any) => {
    const agg = balanceByStudent.get(s.student_id);
    const balance = agg?.balance ?? 0;
    const paid = agg?.total_paid ?? 0;
    const parent = parentByStudent.get(s.student_id) || {};
    return {
      student_id: s.student_id,
      student_name: s.name,
      current_class: s.current_class,
      parent_name: (parent as any).name,
      parent_email: (parent as any).email,
      amount_paid: paid,
      balance,
      has_pending: balance > 0,
    };
  });
  return computed.filter((r) => r.has_pending);
}

export default function OutstandingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'outstanding', user?.id ?? ''],
    queryFn: () => fetchOutstanding(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.student_name.toLowerCase().includes(t) ||
        r.current_class.toLowerCase().includes(t) ||
        (r.parent_name || '').toLowerCase().includes(t) ||
        (r.parent_email || '').toLowerCase().includes(t)
    );
  }, [q, rows]);

  const loading = isLoading;

  return (
    <AdminPageWrapper title="Outstanding Balances" subtitle="Students with pending fee balances">
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <input
          className="ac-input w-full md:max-w-md rounded-xl px-3 py-2 text-sm min-h-0"
          placeholder="Search by student, class, parent name/email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="overflow-x-auto rounded-xl overflow-hidden ac-glass-card border border-[var(--ac-border)]">
          <table className="min-w-full text-sm ac-table-wrap">
            <thead>
              <tr className="border-b border-[var(--ac-border)] ac-text-muted text-left">
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Class</th>
                <th className="px-4 py-2 font-medium">Amount Paid</th>
                <th className="px-4 py-2 font-medium">Balance</th>
                <th className="px-4 py-2 font-medium">Parent Name</th>
                <th className="px-4 py-2 font-medium">Parent Email</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-[var(--ac-border)]">
                    <td colSpan={7} className="px-4 py-3"><div className="h-5 rounded ac-skeleton-block animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center ac-text-muted">
                    No pending balances found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const total = r.amount_paid + r.balance;
                  const pct = total > 0 ? Math.round((r.amount_paid / total) * 100) : 0;
                  return (
                    <tr key={r.student_id} className="border-b border-[var(--ac-border)]">
                      <td className="px-4 py-2 font-medium ac-text-primary">{r.student_name}</td>
                      <td className="px-4 py-2 ac-text-secondary">{r.current_class}</td>
                      <td className="px-4 py-2 ac-text-secondary">{new Intl.NumberFormat().format(r.amount_paid)}</td>
                      <td className="px-4 py-2 ac-text-secondary">{new Intl.NumberFormat().format(r.balance)}</td>
                      <td className="px-4 py-2 ac-text-secondary">{r.parent_name || '-'}</td>
                      <td className="px-4 py-2 ac-text-secondary">{r.parent_email || '-'}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 text-xs rounded border bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300">
                          {pct}% paid
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
