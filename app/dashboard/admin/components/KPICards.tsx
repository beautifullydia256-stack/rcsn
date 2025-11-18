'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, DollarSign, Receipt, CalendarCheck } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function AdminKPICards() {
  const [kpis, setKpis] = useState({
    students: 0,
    teachers: 0,
    outstanding: 0,
    feesCollected: 0,
    attendance: 0
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
        if (!u?.school_id) return;

        const { data: allTerms } = await supabase
          .from('school_terms')
          .select('id, start_date, end_date, year, term')
          .eq('school_id', u.school_id)
          .order('year', { ascending: false })
          .order('term', { ascending: false });
        
        const currentTermData = (allTerms || []).find((t: any) => 
          t.start_date ? 
            (t.start_date <= currentTerm.today && t.end_date >= currentTerm.today) : 
            (t.end_date >= currentTerm.today)
        ) || (allTerms && allTerms[0]) || null;

        const [
          studentsResult,
          teachersResult,
          attendanceResult,
          balancesResult,
          feesCollectedResult
        ] = await Promise.all([
          supabase.from("students")
            .select("*", { count: "exact", head: true })
            .eq("school_id", u.school_id)
            .eq('status', 'active'),
          supabase.from("teachers")
            .select("*", { count: "exact", head: true })
            .eq("school_id", u.school_id),
          supabase.from('student_attendance')
            .select('student_id')
            .eq('school_id', u.school_id)
            .eq('date', currentTerm.today)
            .eq('present', true),
          supabase.from('students')
            .select('student_id, expected_fee_amount')
            .eq('school_id', u.school_id)
            .eq('status', 'active'),
          currentTermData ? 
            supabase.from("student_payments")
              .select("amount_paid")
              .eq("school_id", u.school_id)
              .gte('payment_date', currentTermData.start_date || '1900-01-01')
              .lte('payment_date', currentTermData.end_date || '2100-12-31') :
            supabase.from("student_payments")
              .select("amount_paid")
              .eq("school_id", u.school_id)
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
          .map((s: any) => Math.max(0, Number(s.expected_fee_amount || 0) - (paidByStudent[s.student_id] || 0)))
          .reduce((sum: number, balance: number) => sum + balance, 0);

        // Calculate total fees collected this term
        const feesCollected = (feesCollectedResult.data || [])
          .reduce((sum: number, payment: any) => sum + Number(payment.amount_paid || 0), 0);

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
      label: "Total Students", 
      value: kpis.students, 
      icon: Users,
      color: '#4dabff',
      href: "/dashboard/admin/students" 
    },
    { 
      label: "Total Teachers", 
      value: kpis.teachers, 
      icon: GraduationCap,
      color: '#10b981',
      href: "/dashboard/admin/teachers" 
    },
    { 
      label: "Fees Collected", 
      value: new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(kpis.feesCollected), 
      icon: DollarSign,
      color: '#ae79ff',
      href: "/dashboard/admin/payments/recent" 
    },
    { 
      label: "Outstanding Balances", 
      value: new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(kpis.outstanding), 
      icon: DollarSign,
      color: '#f59e0b',
      href: "/dashboard/admin/outstanding" 
    },
    { 
      label: "Attendance Today", 
      value: kpis.attendance, 
      icon: CalendarCheck,
      color: '#00d4ff',
      href: undefined 
    },
  ];

  // Separate money cards from count cards for different layouts
  const moneyCards = cards.filter(c => c.label === "Fees Collected" || c.label === "Outstanding Balances");
  const countCards = cards.filter(c => c.label !== "Fees Collected" && c.label !== "Outstanding Balances");

  return (
    <div className="space-y-4 mb-6">
      {/* Count Cards - Compact layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {countCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.03, y: -4 }}
            >
              <GlassCard
                className="p-4 sm:p-6 cursor-pointer relative overflow-hidden"
                hover
                onClick={() => c.href && router.push(c.href)}
                style={{
                  background: `linear-gradient(135deg, rgba(${c.color === '#4dabff' ? '77, 171, 255' : c.color === '#10b981' ? '16, 185, 129' : c.color === '#f59e0b' ? '245, 158, 11' : c.color === '#ae79ff' ? '174, 121, 255' : '0, 212, 255'}, 0.25) 0%, rgba(${c.color === '#4dabff' ? '77, 171, 255' : c.color === '#10b981' ? '16, 185, 129' : c.color === '#f59e0b' ? '245, 158, 11' : c.color === '#ae79ff' ? '174, 121, 255' : '0, 212, 255'}, 0.15) 100%)`,
                }}
              >
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
                  style={{ background: c.color }}
                />
                <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl flex-shrink-0" style={{ background: `${c.color}20` }}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: c.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm text-white/85 mb-1">{c.label}</div>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {loading ? (
                        <div className="animate-pulse bg-white/20 rounded h-6 sm:h-7 w-16 sm:w-20"></div>
                      ) : (
                        c.value
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Money Cards - Full width layout for better digit display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {moneyCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (countCards.length + i) * 0.05 }}
              whileHover={{ scale: 1.02, y: -4 }}
            >
              <GlassCard
                className="p-4 sm:p-6 cursor-pointer relative"
                hover
                onClick={() => c.href && router.push(c.href)}
                style={{
                  background: `linear-gradient(135deg, rgba(${c.color === '#ae79ff' ? '174, 121, 255' : '245, 158, 11'}, 0.25) 0%, rgba(${c.color === '#ae79ff' ? '174, 121, 255' : '245, 158, 11'}, 0.15) 100%)`,
                  overflow: 'visible',
                  minHeight: 'auto',
                }}
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
                  style={{ background: c.color }}
                />
                <div className="relative z-10" style={{ overflow: 'visible' }}>
                  {/* Mobile: Stack vertically */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:flex-col sm:items-start flex-shrink-0">
                      <div className="p-2 sm:p-3 rounded-xl flex-shrink-0" style={{ background: `${c.color}20` }}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: c.color }} />
                      </div>
                      <div className="text-xs sm:text-sm text-white/85 font-medium sm:font-normal whitespace-nowrap">
                        {c.label}
                      </div>
                    </div>
                    <div className="flex-1 w-full min-w-0" style={{ overflow: 'visible', maxWidth: '100%' }}>
                      <div 
                        className="font-bold text-white leading-tight"
                        style={{
                          fontSize: 'clamp(0.875rem, 2vw + 0.5rem, 1.875rem)',
                          wordBreak: 'keep-all',
                          overflowWrap: 'anywhere',
                          whiteSpace: 'normal',
                          overflow: 'visible',
                          textOverflow: 'clip',
                        }}
                      >
                        {loading ? (
                          <div className="animate-pulse bg-white/20 rounded h-8 sm:h-10 w-32 sm:w-40"></div>
                        ) : (
                          <span className="inline-block" style={{ maxWidth: '100%' }}>
                            {c.value}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

