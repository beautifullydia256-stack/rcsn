import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Users, GraduationCap, DollarSign, CalendarCheck, ArrowUpRight } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

type Kpis = {
  students: number;
  teachers: number;
  outstanding: number;
  feesCollected: number;
  attendance: number;
};

async function fetchAdminKpis(schoolId: string): Promise<Kpis> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: allTerms } = await supabase
    .from('school_terms')
    .select('id, start_date, end_date, year, term')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: false });

  const currentTermData =
    (allTerms || []).find(
      (t: { start_date?: string; end_date: string }) =>
        t.start_date ? t.start_date <= today && t.end_date >= today : t.end_date >= today
    ) || (allTerms?.[0] as { start_date?: string; end_date: string }) || null;

  const [
    studentsResult,
    teachersResult,
    attendanceResult,
    balancesResult,
    feesCollectedResult,
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('student_attendance').select('student_id').eq('school_id', schoolId).eq('date', today).eq('present', true),
    supabase.from('students').select('student_id, expected_fee_amount').eq('school_id', schoolId).eq('status', 'active'),
    currentTermData
      ? supabase
          .from('student_payments')
          .select('amount_paid')
          .eq('school_id', schoolId)
          .gte('payment_date', currentTermData.start_date || '1900-01-01')
          .lte('payment_date', currentTermData.end_date || '2100-12-31')
      : supabase.from('student_payments').select('amount_paid').eq('school_id', schoolId),
  ]);

  const studentIds = (balancesResult.data || []).map((s: { student_id: string }) => s.student_id);
  const { data: payments } = await supabase
    .from('student_payments')
    .select('student_id, amount_paid')
    .in('student_id', studentIds)
    .eq('school_id', schoolId);

  const paidByStudent: Record<string, number> = {};
  (payments || []).forEach((p: { student_id: string; amount_paid: number }) => {
    if (studentIds.includes(p.student_id)) {
      paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount_paid || 0);
    }
  });

  const outstanding = (balancesResult.data || [])
    .map(
      (s: { student_id: string; expected_fee_amount?: number }) =>
        Math.max(0, Number(s.expected_fee_amount || 0) - (paidByStudent[s.student_id] || 0))
    )
    .reduce((sum: number, b: number) => sum + b, 0);

  const feesCollected = (feesCollectedResult.data || []).reduce(
    (sum: number, p: { amount_paid?: number }) => sum + Number(p.amount_paid || 0),
    0
  );

  return {
    students: studentsResult.count ?? 0,
    teachers: teachersResult.count ?? 0,
    outstanding,
    feesCollected,
    attendance: new Set((attendanceResult.data || []).map((x: { student_id: string }) => x.student_id)).size,
  };
}

interface AdminKPICardsProps {
  schoolId: string;
}

export default function AdminKPICards({ schoolId }: AdminKPICardsProps) {
  const navigate = useNavigate();
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin', 'kpis', schoolId],
    queryFn: () => fetchAdminKpis(schoolId),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  const cards = kpis
    ? [
        { label: 'Total Students', value: kpis.students, icon: Users, color: '#16a34a', href: '/dashboard/admin/students' },
        { label: 'Total Teachers', value: kpis.teachers, icon: GraduationCap, color: '#16a34a', href: '/dashboard/admin/teachers' },
        {
          label: 'Fees Collected',
          value: new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(kpis.feesCollected),
          icon: DollarSign,
          color: '#16a34a',
          href: '/dashboard/admin/outstanding',
        },
        {
          label: 'Outstanding Balances',
          value: new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(kpis.outstanding),
          icon: DollarSign,
          color: '#dc2626',
          href: '/dashboard/admin/outstanding',
        },
        { label: 'Attendance Today', value: kpis.attendance, icon: CalendarCheck, color: '#16a34a', href: undefined },
        { label: 'Placeholder 1', value: '---', icon: Users, color: '#6b7280', href: undefined },
        { label: 'Placeholder 2', value: '---', icon: Users, color: '#6b7280', href: undefined },
        { label: 'Placeholder 3', value: '---', icon: Users, color: '#6b7280', href: undefined },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c, index) => {
        const Icon = c.icon;
        const isFirstCard = index === 0;
        const isPlaceholder = c.label.startsWith('Placeholder');
        
        return (
          <div
            key={c.label}
            className={`rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md ${
              isFirstCard 
                ? 'bg-gradient-to-br from-green-500 to-green-600' 
                : isPlaceholder
                ? 'bg-gray-100 border border-gray-200 opacity-60'
                : 'bg-white border border-gray-200'
            }`}
          >
            <button
              type="button"
              onClick={() => !isPlaceholder && c.href && navigate(c.href)}
              disabled={isPlaceholder}
              className={`w-full p-5 sm:p-6 text-left transition-all ${
                isFirstCard 
                  ? 'hover:from-green-600 hover:to-green-700' 
                  : isPlaceholder
                  ? 'cursor-default'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="space-y-3">
                <div className={`text-xs font-medium uppercase tracking-wide ${
                  isFirstCard ? 'text-green-100' : isPlaceholder ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {c.label}
                </div>
                
                <div className={`text-3xl sm:text-4xl font-bold ${
                  isFirstCard ? 'text-white' : isPlaceholder ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {isLoading && !isPlaceholder ? (
                    <div className={`animate-pulse rounded h-9 w-20 ${
                      isFirstCard ? 'bg-white/20' : 'bg-gray-200'
                    }`} />
                  ) : (
                    c.value
                  )}
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
