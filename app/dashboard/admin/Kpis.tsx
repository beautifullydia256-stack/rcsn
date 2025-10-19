"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export function AdminKpis() {
  const [k, setK] = useState({ students: 0, teachers: 0, outstanding: 0, receipts: 0, attendance: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Memoize current term detection to avoid repeated queries
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

        // Get current term - optimized query
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

        // Execute all queries in parallel for maximum performance
        const [
          studentsResult,
          teachersResult,
          attendanceResult,
          balancesResult,
          receiptsResult
        ] = await Promise.all([
          // Students count
          supabase.from("students")
            .select("*", { count: "exact", head: true })
            .eq("school_id", u.school_id)
            .eq('status', 'active'),
          
          // Teachers count
          supabase.from("teachers")
            .select("*", { count: "exact", head: true })
            .eq("school_id", u.school_id),
          
          // Today's attendance
          supabase.from('student_attendance')
            .select('student_id')
            .eq('school_id', u.school_id)
            .eq('date', currentTerm.today)
            .eq('present', true),
          
          // Outstanding balances - calculate from students and payments
          supabase.from('students')
            .select('student_id, expected_fee_amount')
            .eq('school_id', u.school_id)
            .eq('status', 'active'),
          
          // Receipts count - use current term if available
          currentTermData ? 
            supabase.from("receipts")
              .select("receipt_id", { count: "exact", head: true })
              .eq("school_id", u.school_id)
              .gte('created_at', currentTermData.start_date || '1900-01-01')
              .lte('created_at', currentTermData.end_date || '2100-12-31') :
            supabase.from("receipts")
              .select("receipt_id", { count: "exact", head: true })
              .eq("school_id", u.school_id)
        ]);

        // Calculate outstanding balances from students and payments
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

        setK({
          students: studentsResult.count || 0,
          teachers: teachersResult.count || 0,
          outstanding,
          receipts: receiptsResult.count || 0,
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
    { label: "Total Students", value: k.students, accent: "from-blue-500/30 to-blue-700/20", href: "/dashboard/admin/students" },
    { label: "Total Teachers", value: k.teachers, accent: "from-green-500/30 to-green-700/20", href: "/dashboard/admin/teachers" },
    { label: "Outstanding Balances", value: new Intl.NumberFormat().format(k.outstanding), accent: "from-yellow-500/30 to-yellow-700/20", href: "/dashboard/admin/outstanding" },
    { label: "Receipts This Term", value: k.receipts, accent: "from-rose-500/30 to-rose-700/20", href: undefined },
    { label: "Attendance Today", value: k.attendance, accent: "from-indigo-500/30 to-indigo-700/20", href: undefined },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c, i) => (
        <motion.button
          type="button"
          key={c.label}
          onClick={() => c.href && router.push(c.href)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.03 }}
          className={`text-left rounded-xl border border-white/10 bg-gradient-to-br ${c.accent} bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20 transition-transform ${c.href ? 'hover:ring-1 hover:ring-white/20 cursor-pointer' : ''}`}
        >
          <div className="text-xs text-white/80">{c.label}</div>
          <div className="text-2xl font-semibold mt-1 text-white">
            {loading ? (
              <div className="animate-pulse bg-white/20 rounded h-6 w-16"></div>
            ) : (
              c.value
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
}



