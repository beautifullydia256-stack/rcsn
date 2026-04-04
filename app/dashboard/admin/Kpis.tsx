"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/src/lib/supabase";
import { resolveCurrentSchoolTerm } from "@/lib/adminFinanceTerm";
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

        const currentTermData = await resolveCurrentSchoolTerm(supabase, u.school_id, currentTerm.today);

        // Parallel counts; finance KPIs use the same ledger as Outstanding (student_balances / term_id).
        const [studentsResult, teachersResult, attendanceResult] = await Promise.all([
          supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("school_id", u.school_id)
            .eq("status", "active"),
          supabase.from("teachers").select("*", { count: "exact", head: true }).eq("school_id", u.school_id),
          supabase
            .from("student_attendance")
            .select("student_id")
            .eq("school_id", u.school_id)
            .eq("date", currentTerm.today)
            .eq("present", true),
        ]);

        let outstanding = 0;
        let receipts = 0;
        const termId = currentTermData && (currentTermData as { id?: string }).id;
        if (termId) {
          const balQ = await supabase
            .from("student_balances")
            .select("balance")
            .eq("school_id", u.school_id)
            .eq("term_id", termId);
          outstanding = (balQ.data || []).reduce(
            (sum, r) => sum + Math.max(0, Number((r as { balance?: number }).balance ?? 0)),
            0
          );
          const payQ = await supabase
            .from("student_payments")
            .select("amount_paid")
            .eq("school_id", u.school_id)
            .eq("term_id", termId)
            .is("reversed_at", null);
          receipts = (payQ.data || []).reduce(
            (sum, r) => sum + Number((r as { amount_paid?: number }).amount_paid ?? 0),
            0
          );
        } else {
          const balQ = await supabase.from("student_balances").select("balance").eq("school_id", u.school_id);
          outstanding = (balQ.data || []).reduce(
            (sum, r) => sum + Math.max(0, Number((r as { balance?: number }).balance ?? 0)),
            0
          );
          const payQ = await supabase
            .from("student_payments")
            .select("amount_paid")
            .eq("school_id", u.school_id)
            .is("reversed_at", null);
          receipts = (payQ.data || []).reduce(
            (sum, r) => sum + Number((r as { amount_paid?: number }).amount_paid ?? 0),
            0
          );
        }

        setK({
          students: studentsResult.count || 0,
          teachers: teachersResult.count || 0,
          outstanding,
          receipts,
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
    { label: "Fees collected (this term)", value: new Intl.NumberFormat().format(k.receipts), accent: "from-rose-500/30 to-rose-700/20", href: undefined },
    { label: "Attendance Today", value: k.attendance, accent: "from-indigo-500/30 to-indigo-700/20", href: undefined },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <button
          type="button"
          key={c.label}
          onClick={() => c.href && router.push(c.href)}
          className={`text-left rounded-xl border border-white/10 bg-gradient-to-br ${c.accent} bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20 ${c.href ? 'hover:ring-1 hover:ring-white/20 cursor-pointer' : ''}`}
        >
          <div className="text-xs text-white/80">{c.label}</div>
          <div className="text-2xl font-semibold mt-1 text-white">
            {loading ? <span className="text-white/50">…</span> : c.value}
          </div>
        </button>
      ))}
    </div>
  );
}



