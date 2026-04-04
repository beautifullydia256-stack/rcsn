'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { resolveCurrentSchoolTerm, sumTotalOverallOutstandingBalance } from '@/lib/adminFinanceTerm';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, DollarSign, CalendarCheck, ArrowUpRight } from 'lucide-react';

export default function AdminKPICards() {
  const [kpis, setKpis] = useState({
    students: 0,
    teachers: 0,
    outstanding: 0,
    totalOverallBalance: 0,
    feesCollected: 0,
    attendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const currentTerm = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { today };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: u } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();
        if (!u?.school_id) return;

        const currentTermData = await resolveCurrentSchoolTerm(supabase, u.school_id, currentTerm.today);
        const termId = currentTermData?.id as string | undefined;

        const [
          studentsResult,
          teachersResult,
          attendanceResult,
          termBalancesResult,
          feesCollectedResult,
          totalOverallBalance,
        ] = await Promise.all([
          supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', u.school_id)
            .eq('status', 'active'),
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', u.school_id),
          supabase
            .from('student_attendance')
            .select('student_id')
            .eq('school_id', u.school_id)
            .eq('date', currentTerm.today)
            .eq('present', true),
          termId
            ? supabase
                .from('student_balances')
                .select('balance')
                .eq('school_id', u.school_id)
                .eq('term_id', termId)
            : Promise.resolve({ data: [] as { balance?: number }[] }),
          termId
            ? supabase
                .from('student_payments')
                .select('amount_paid')
                .eq('school_id', u.school_id)
                .eq('term_id', termId)
                .is('reversed_at', null)
            : Promise.resolve({ data: [] as { amount_paid?: number }[] }),
          sumTotalOverallOutstandingBalance(supabase, u.school_id),
        ]);

        const outstanding = (termBalancesResult.data || []).reduce(
          (sum: number, row: { balance?: number }) => sum + Math.max(0, Number(row.balance ?? 0)),
          0
        );

        const feesCollected = (feesCollectedResult.data || []).reduce(
          (sum: number, payment: { amount_paid?: number }) => sum + Number(payment.amount_paid || 0),
          0
        );

        setKpis({
          students: studentsResult.count || 0,
          teachers: teachersResult.count || 0,
          outstanding,
          totalOverallBalance,
          feesCollected,
          attendance: new Set((attendanceResult.data || []).map((x: any) => x.student_id)).size,
        });
      } catch (error) {
        console.error('Error loading admin KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentTerm.today]);

  const cards = [
    {
      label: 'Total Students',
      value: kpis.students,
      icon: Users,
      color: '#16a34a',
      href: '/dashboard/admin/students',
      trend: 'vs last term',
    },
    {
      label: 'Total Teachers',
      value: kpis.teachers,
      icon: GraduationCap,
      color: '#16a34a',
      href: '/dashboard/admin/teachers',
      trend: 'vs last term',
    },
    {
      label: 'Fees Collected',
      value: new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        maximumFractionDigits: 0,
      }).format(kpis.feesCollected),
      icon: DollarSign,
      color: '#16a34a',
      href: '/dashboard/admin/payments/recent',
      trend: 'this term',
    },
    {
      label: 'Outstanding Fees',
      value: new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        maximumFractionDigits: 0,
      }).format(kpis.outstanding),
      icon: DollarSign,
      color: '#dc2626',
      href: '/dashboard/admin/outstanding',
      trend: 'this term',
    },
    {
      label: 'Total overall balance',
      value: new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        maximumFractionDigits: 0,
      }).format(kpis.totalOverallBalance),
      icon: DollarSign,
      color: '#0891b2',
      href: '/dashboard/admin/outstanding',
      trend: 'all terms',
    },
    {
      label: 'Attendance Today',
      value: kpis.attendance,
      icon: CalendarCheck,
      color: '#16a34a',
      href: undefined,
      trend: 'present',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            className="bg-[#0b1120] rounded-xl border border-white/10 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => c.href && router.push(c.href)}
              className="w-full p-4 sm:p-5 text-left hover:bg-white/5 transition-colors"
            >
              <div className="h-0.5 w-full" style={{ background: `${c.color}` }} />
              <div className="flex items-start justify-between gap-2">
                <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${c.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                {c.href && (
                  <ArrowUpRight
                    className="w-4 h-4 text-white/50 flex-shrink-0"
                    aria-hidden
                  />
                )}
              </div>
              <div className="mt-3">
                <div className="text-xs sm:text-sm text-white/60 mb-0.5">{c.label}</div>
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {loading ? (
                    <div className="animate-pulse bg-white/15 rounded h-7 w-16" />
                  ) : (
                    c.value
                  )}
                </div>
                <div className="mt-1 text-xs text-white/60 font-medium">{c.trend}</div>
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
