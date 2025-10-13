"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";

export function AdminWidgets() {
  const formatCurrency = new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 });
  const [payments, setPayments] = useState<any[]>([]);
  const [outstanding, setOutstanding] = useState<any[]>([]);
  const [totals, setTotals] = useState<{ totalPaid: number; totalOutstanding: number }>({ totalPaid: 0, totalOutstanding: 0 });
  const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!u?.school_id) return;

      // Get current term date range - fetch all and filter in JS to handle NULL dates
      const today = new Date().toISOString().slice(0,10);
      const { data: allTerms } = await supabase
        .from('school_terms')
        .select('start_date, end_date')
        .eq('school_id', u.school_id)
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      
      const currentTerm = (allTerms || []).find((t: any) => 
        t.start_date ? 
          (t.start_date <= today && t.end_date >= today) : 
          (t.end_date >= today)
      ) || null;

      // Build queries conditionally to avoid NULL date filters
      let paymentsQuery = supabase.from("payments").select("*, student_id").eq("school_id", u.school_id);
      let reportsQuery = supabase.from("reports").select("*");
      
      if (currentTerm) {
        if (currentTerm.start_date) {
          paymentsQuery = paymentsQuery.gte('created_at', currentTerm.start_date);
          reportsQuery = reportsQuery.gte('created_at', currentTerm.start_date);
        }
        if (currentTerm.end_date) {
          paymentsQuery = paymentsQuery.lte('created_at', currentTerm.end_date);
          reportsQuery = reportsQuery.lte('created_at', currentTerm.end_date);
        }
      }
      
      paymentsQuery = paymentsQuery.order("created_at", { ascending: false }).limit(10);
      reportsQuery = reportsQuery.order("created_at", { ascending: false }).limit(10);

      const [p, r, n] = await Promise.all([
        paymentsQuery,
        reportsQuery,
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      setPayments(p.data || []);
      setReports(r.data || []);
      setNotes(n.data || []);

      const { data: studs } = await supabase.from("students").select("student_id,name,expected_fee_amount,status").eq("school_id", u.school_id);
      const studentMap = new Map((studs || []).map((s: any) => [s.student_id, s.name]));
      const pending = (p.data || []).filter((row: any) => (row.status || "Pending") === "Pending");
      setOutstanding(pending.map((row: any) => ({ ...row, student_name: studentMap.get(row.student_id) })));

      // Compute totals: sum of approved payments and total outstanding across active students
      const totalPaid = (p.data || [])
        .filter((row: any) => (row.status || "Pending") === "Approved")
        .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

      const totalExpected = (studs || [])
        .filter((s: any) => (s.status || 'active') === 'active')
        .reduce((sum: number, s: any) => sum + Number(s.expected_fee_amount || 0), 0);

      const totalOutstanding = Math.max(0, totalExpected - totalPaid);
      setTotals({ totalPaid, totalOutstanding });

      const { data: att } = await supabase.from("attendance").select("teacher_id,timestamp,type").eq("school_id", u.school_id).gte("timestamp", new Date(new Date().toDateString()).toISOString());
      setTeacherAttendance(att || []);
    };
    run();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/20 to-sky-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm font-medium mb-2 text-white flex items-center justify-between">
          <span>Recent Payments</span>
          <a href="/dashboard/admin/payments/recent" className="text-xs text-white/80 hover:text-white underline-offset-4 hover:underline">View all</a>
        </div>
        <div className="space-y-2">
          {payments.slice(0,2).map((p) => (
            <a href={`/dashboard/admin/payments/recent#${p.payment_id}`} key={p.payment_id} className="flex items-center justify-between text-sm hover:underline underline-offset-4">
              <div>
                <div className="font-medium text-white">{p.student_name || p.student_id}</div>
                <div className="text-xs text-white/80">{p.payment_method} • {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div className="text-xs text-white/80">{formatCurrency.format(p.amount)}</div>
            </a>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-rose-500/20 to-rose-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-white">Notifications</div>
          {notes.length > 3 && (
            <a 
              href="/dashboard/admin/notifications" 
              className="text-xs text-blue-300 hover:text-blue-200 underline"
            >
              View all ({notes.length})
            </a>
          )}
        </div>
        <div className="space-y-2">
          {notes.length === 0 ? (
            <div className="text-sm text-white/80">No notifications.</div>
          ) : (
            notes.slice(0, 3).map((n) => (
              <div key={n.id} className="text-sm">
                <div className="font-medium text-white">{n.title}</div>
                <div className="text-xs text-white/80">{n.message}</div>
              </div>
            ))
          )}
        </div>
        {notes.length > 3 && (
          <div className="mt-3 pt-3 border-t border-white/10 text-center">
            <a 
              href="/dashboard/admin/notifications" 
              className="text-xs text-white/60 hover:text-white/80"
            >
              + {notes.length - 3} more notifications
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}



