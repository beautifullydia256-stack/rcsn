import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { DollarSign, Bell } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

type PaymentRow = {
  payment_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  student_id: string;
  students?: { name: string } | { name: string }[] | null;
};

type Payment = { payment_id: string; amount_paid: number; payment_date: string; payment_method: string; student_id: string; students?: { name: string } };
type Notification = { id: string; title: string; message: string; created_at: string; read_at?: string | null };

export async function fetchPaymentsNotifications(userId: string, schoolId: string): Promise<{ payments: Payment[]; notifications: Notification[] }> {
  const today = new Date().toISOString().slice(0, 10);
  if (!schoolId) return { payments: [], notifications: [] };

  const { data: allTerms } = await supabase
    .from('school_terms')
    .select('start_date, end_date')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: false });

  const currentTermData =
    (allTerms || []).find(
      (t: { start_date?: string; end_date: string }) =>
        t.start_date ? t.start_date <= today && t.end_date >= today : t.end_date >= today
    ) || (allTerms?.[0] as { start_date?: string; end_date: string }) || null;

  const [paymentsResult, notificationsResult] = await Promise.all([
    currentTermData
      ? supabase
          .from('student_payments')
          .select('payment_id, amount_paid, payment_date, payment_method, student_id, students!inner(name)')
          .eq('school_id', schoolId)
          .gte('payment_date', currentTermData.start_date || '1900-01-01')
          .lte('payment_date', currentTermData.end_date || '2100-12-31')
          .order('payment_date', { ascending: false })
          .limit(5)
      : supabase
          .from('student_payments')
          .select('payment_id, amount_paid, payment_date, payment_method, student_id, students!inner(name)')
          .eq('school_id', schoolId)
          .order('payment_date', { ascending: false })
          .limit(5),
    supabase
      .from('user_in_app_notifications')
      .select('id, title, body, created_at, read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const rawPayments = (paymentsResult.data || []) as PaymentRow[];
  const payments: Payment[] = rawPayments.map((p) => ({
    payment_id: p.payment_id,
    amount_paid: p.amount_paid,
    payment_date: p.payment_date,
    payment_method: p.payment_method,
    student_id: p.student_id,
    students: Array.isArray(p.students) ? p.students[0] : p.students ?? undefined,
  }));
  const rawInbox = (notificationsResult.data || []) as { id: string; title: string; body: string | null; created_at: string; read_at: string | null }[];
  const notifications: Notification[] = rawInbox.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.body ?? '',
    created_at: n.created_at,
    read_at: n.read_at,
  }));
  return { payments, notifications };
}

export default function RecentPaymentsNotifications() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin', 'paymentsNotifications', user?.id ?? '', schoolId ?? ''],
    queryFn: () => fetchPaymentsNotifications(user!.id, schoolId ?? ''),
    enabled: !!user?.id && !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  const payments = data?.payments ?? [];
  const notifications = data?.notifications ?? [];
  const loading = isLoading;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="ac-glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#10d9a8]/15 border border-[#10d9a8]/25">
              <DollarSign className="w-5 h-5 text-[#10d9a8]" />
            </div>
            <h2 className="text-lg font-semibold ac-text-primary">Recent Payments</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/outstanding')}
            className="text-sm font-medium text-[#10d9a8] hover:text-[#14f0bb] transition-colors"
          >
            View all →
          </button>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm ac-text-muted">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="text-sm ac-text-muted">No recent payments</div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.payment_id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div>
                  <div className="font-medium ac-text-primary text-sm">{(payment.students as { name?: string })?.name || 'Unknown'}</div>
                  <div className="text-xs ac-text-muted">
                    {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm font-semibold ac-text-primary">{formatCurrency(payment.amount_paid)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="ac-glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#10d9a8]/15 border border-[#10d9a8]/25">
              <Bell className="w-5 h-5 text-[#10d9a8]" />
            </div>
            <h2 className="text-lg font-semibold ac-text-primary">Your notifications</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/notifications')}
            className="text-sm font-medium text-[#10d9a8] hover:text-[#14f0bb] transition-colors"
          >
            View all →
          </button>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm ac-text-muted">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-sm ac-text-muted">No notifications</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border border-white/10 ${n.read_at ? 'bg-white/5 opacity-90' : 'bg-[#10d9a8]/10 border-[#10d9a8]/25'}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#10d9a8]" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium ac-text-primary text-sm mb-1">{n.title}</div>
                    <div className="text-xs ac-text-secondary line-clamp-2">{n.message}</div>
                    <div className="text-xs ac-text-muted mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
