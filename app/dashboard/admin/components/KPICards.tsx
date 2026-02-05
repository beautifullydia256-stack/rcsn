'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, DollarSign, CalendarCheck, ArrowUpRight } from 'lucide-react';

export default function AdminKPICards() {
  const [kpis, setKpis] = useState({
    students: 0,
    teachers: 0,
    outstanding: 0,
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

        const { data: allTerms } = await supabase
          .from('school_terms')
          .select('id, start_date, end_date, year, term')
          .eq('school_id', u.school_id)
          .order('year', { ascending: false })
          .order('term', { ascending: false });

        const currentTermData =
          (allTerms || []).find(
            (t: any) =>
              t.start_date
                ? t.start_date <= currentTerm.today && t.end_date >= currentTerm.today
                : t.end_date >= currentTerm.today
          ) || (allTerms && allTerms[0]) || null;

        const [
          studentsResult,
          teachersResult,
          attendanceResult,
          balancesResult,
          feesCollectedResult,
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
          supabase
            .from('students')
            .select('student_id, expected_fee_amount')
            .eq('school_id', u.school_id)
            .eq('status', 'active'),
          currentTermData
            ? supabase
                .from('student_payments')
                .select('amount_paid')
                .eq('school_id', u.school_id)
                .gte('payment_date', currentTermData.start_date || '1900-01-01')
                .lte('payment_date', currentTermData.end_date || '2100-12-31')
            : supabase.from('student_payments').select('amount_paid').eq('school_id', u.school_id),
        ]);

        const studentIds = (balancesResult.data || []).map((s: any) => s.student_id);
        const { data: payments } = await supabase
          .from('student_payments')
          .select('student_id, amount_paid')
          .in('student_id', studentIds)
          .eq('school_id', u.school_id);

        const paidByStudent: Record<string, number> = {};
        (payments || []).forEach((p: any) => {
          if (studentIds.includes(p.student_id)) {
            const amt = Number(p.amount_paid || 0);
            paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + amt;
          }
        });

        const outstanding = (balancesResult.data || [])
          .map((s: any) =>
            Math.max(0, Number(s.expected_fee_amount || 0) - (paidByStudent[s.student_id] || 0))
          )
          .reduce((sum: number, balance: number) => sum + balance, 0);

        const feesCollected = (feesCollectedResult.data || []).reduce(
          (sum: number, payment: any) => sum + Number(payment.amount_paid || 0),
          0
        );

        setKpis({
          students: studentsResult.count || 0,
          teachers: teachersResult.count || 0,
          outstanding,
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
      label: 'Outstanding Balances',
      value: new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        maximumFractionDigits: 0,
      }).format(kpis.outstanding),
      icon: DollarSign,
      color: '#dc2626',
      href: '/dashboard/admin/outstanding',
      trend: 'to recover',
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => c.href && router.push(c.href)}
              className="w-full p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${c.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                {c.href && (
                  <ArrowUpRight
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    aria-hidden
                  />
                )}
              </div>
              <div className="mt-3">
                <div className="text-xs sm:text-sm text-gray-500 mb-0.5">{c.label}</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  {loading ? (
                    <div className="animate-pulse bg-gray-200 rounded h-7 w-16" />
                  ) : (
                    c.value
                  )}
                </div>
                <div className="mt-1 text-xs text-green-600 font-medium">{c.trend}</div>
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
