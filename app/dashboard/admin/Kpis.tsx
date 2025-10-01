"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export function AdminKpis() {
  const [k, setK] = useState({ students: 0, teachers: 0, outstanding: 0, receipts: 0, attendance: 0 });
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!u?.school_id) return;

      // Get current term date range
      const today = new Date().toISOString().slice(0,10);
      // Query all terms and filter in JavaScript to handle NULL start_dates
      const { data: allTerms } = await supabase
        .from('school_terms')
        .select('start_date, end_date')
        .eq('school_id', u.school_id)
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      
      const currentTerm = (allTerms || []).find((t: any) => 
        t.start_date ? 
          (t.start_date <= today && t.end_date >= today) : 
          (t.end_date >= today) // If no start date, consider it current if end date is in future
      ) || null;

      const [students, teachers, payments, receipts] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }).eq("school_id", u.school_id).eq('status','active'),
        supabase.from("teachers").select("*", { count: "exact", head: true }).eq("school_id", u.school_id),
        supabase.from("payments").select("amount,status,student_id").eq("school_id", u.school_id),
        currentTerm ? 
          supabase.from("receipts").select("receipt_id,created_at").eq("school_id", u.school_id)
            .gte('created_at', currentTerm.start_date)
            .lte('created_at', currentTerm.end_date) :
        supabase.from("receipts").select("receipt_id,created_at").eq("school_id", u.school_id),
      ]);
      // Attendance today (students present) based on student_attendance
      const { data: stAtt } = await supabase
        .from('student_attendance')
        .select('student_id')
        .eq('school_id', u.school_id)
        .eq('date', today)
        .eq('present', true);

      // Outstanding = SUM(expected_fee_amount) - SUM(Approved payments) across active students
      const { data: studsRows } = await supabase
        .from('students')
        .select('student_id, expected_fee_amount')
        .eq('school_id', u.school_id)
        .eq('status','active');
      const totalExpected = (studsRows || []).reduce((sum: number, r: any) => sum + Number(r.expected_fee_amount || 0), 0);
      const totalPaidApproved = (payments.data || [])
        .filter((p: any) => (p.status || 'Pending') === 'Approved')
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const outstanding = Math.max(0, totalExpected - totalPaidApproved);
      setK({
        students: students.count || 0,
        teachers: teachers.count || 0,
        outstanding,
        receipts: (receipts.data || []).length,
        attendance: new Set((stAtt || []).map((x: any) => x.student_id)).size,
      });
    };
    run();
  }, []);

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
          <div className="text-2xl font-semibold mt-1 text-white">{c.value}</div>
        </motion.button>
      ))}
    </div>
  );
}



