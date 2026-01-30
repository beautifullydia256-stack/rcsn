import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
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

async function fetchOutstanding(userId: string): Promise<Row[]> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return [];

  const { data: studs } = await supabase
    .from('students')
    .select('student_id,name,current_class,status,expected_fee_amount')
    .eq('school_id', data.school_id)
    .eq('status', 'active');
  const studentIds = (studs || []).map((s: any) => s.student_id);

  const [paysRes, parentsRes] = await Promise.all([
    supabase.from('student_payments').select('student_id, amount_paid, payment_date, payment_method').eq('school_id', data.school_id),
    supabase.from('parents').select('student_id,name,email').eq('school_id', data.school_id),
  ]);
  const pays = paysRes.data || [];
  const parents = parentsRes.data || [];
  const parentByStudent = new Map(parents.map((p: any) => [p.student_id, { name: p.name, email: p.email }]));

  const paidByStudent: Record<string, number> = {};
  pays.forEach((p: any) => {
    if (!studentIds.includes(p.student_id)) return;
    const amt = Number(p.amount_paid || 0);
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + amt;
  });

  const computed: Row[] = (studs || []).map((s: any) => {
    const parent = parentByStudent.get(s.student_id) || {};
    return {
      student_id: s.student_id,
      student_name: s.name,
      current_class: s.current_class,
      parent_name: (parent as any).name,
      parent_email: (parent as any).email,
      amount_paid: paidByStudent[s.student_id] || 0,
      balance: Math.max(0, (Number(s.expected_fee_amount || 0) - (paidByStudent[s.student_id] || 0))),
      has_pending: Number(s.expected_fee_amount || 0) > (paidByStudent[s.student_id] || 0),
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
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <input
          className="w-full md:max-w-md rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by student, class, parent name/email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 bg-white/5 text-left">
                <th className="px-4 py-2 font-medium text-white/85">Student</th>
                <th className="px-4 py-2 font-medium text-white/85">Class</th>
                <th className="px-4 py-2 font-medium text-white/85">Amount Paid</th>
                <th className="px-4 py-2 font-medium text-white/85">Balance</th>
                <th className="px-4 py-2 font-medium text-white/85">Parent Name</th>
                <th className="px-4 py-2 font-medium text-white/85">Parent Email</th>
                <th className="px-4 py-2 font-medium text-white/85">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td colSpan={7} className="px-4 py-3"><div className="h-5 rounded bg-white/15 animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-white/70">
                    No pending balances found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const total = r.amount_paid + r.balance;
                  const pct = total > 0 ? Math.round((r.amount_paid / total) * 100) : 0;
                  return (
                    <tr key={r.student_id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-4 py-2 text-white">{r.student_name}</td>
                      <td className="px-4 py-2 text-white/90">{r.current_class}</td>
                      <td className="px-4 py-2 text-white">{new Intl.NumberFormat().format(r.amount_paid)}</td>
                      <td className="px-4 py-2 text-white">{new Intl.NumberFormat().format(r.balance)}</td>
                      <td className="px-4 py-2 text-white/90">{r.parent_name || '-'}</td>
                      <td className="px-4 py-2 text-white/90">{r.parent_email || '-'}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 text-xs rounded bg-amber-500/30 border border-amber-300/30 text-white">
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
