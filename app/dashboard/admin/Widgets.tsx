"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";

export function AdminWidgets() {
  const formatCurrency = new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 });
  const [payments, setPayments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Memoize current term detection
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
          .select('start_date, end_date, year, term')
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
          paymentsResult,
          reportsResult,
          notificationsResult
        ] = await Promise.all([
          // Recent payments - use student_payments table for consistency
          currentTermData ? 
            supabase.from("student_payments")
              .select(`
                payment_id,
                amount_paid,
                payment_date,
                payment_method,
                student_id,
                students!inner(name)
              `)
              .eq("school_id", u.school_id)
              .gte('payment_date', currentTermData.start_date || '1900-01-01')
              .lte('payment_date', currentTermData.end_date || '2100-12-31')
              .order("payment_date", { ascending: false })
              .limit(10) :
            supabase.from("student_payments")
              .select(`
                payment_id,
                amount_paid,
                payment_date,
                payment_method,
                student_id,
                students!inner(name)
              `)
              .eq("school_id", u.school_id)
              .order("payment_date", { ascending: false })
              .limit(10),
          
          // Recent reports
          currentTermData ? 
            supabase.from("reports")
              .select("*")
              .eq("school_id", u.school_id)
              .gte('created_at', currentTermData.start_date || '1900-01-01')
              .lte('created_at', currentTermData.end_date || '2100-12-31')
              .order("created_at", { ascending: false })
              .limit(10) :
            supabase.from("reports")
              .select("*")
              .eq("school_id", u.school_id)
              .order("created_at", { ascending: false })
              .limit(10),
          
          // Recent notifications
          supabase.from("notifications")
            .select("*")
            .eq("school_id", u.school_id)
            .order("created_at", { ascending: false })
            .limit(10)
        ]);

        setPayments(paymentsResult.data || []);
        setReports(reportsResult.data || []);
        setNotes(notificationsResult.data || []);
      } catch (error) {
        console.error('Error loading admin widgets:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentTerm.today]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/20 to-sky-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm font-medium mb-2 text-white flex items-center justify-between">
          <span>Recent Payments</span>
          <a href="/dashboard/admin/payments/recent" className="text-xs text-white/80 hover:text-white underline-offset-4 hover:underline">View all</a>
        </div>
        <div className="space-y-2">
          {loading ? (
            <div className="text-sm text-white/80">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="text-sm text-white/80">No recent payments.</div>
          ) : (
            payments.slice(0, 2).map((p) => (
              <a href={`/dashboard/admin/payments/recent#${p.payment_id}`} key={p.payment_id} className="flex items-center justify-between text-sm hover:underline underline-offset-4">
                <div>
                  <div className="font-medium text-white">{p.students?.name || p.student_id}</div>
                  <div className="text-xs text-white/80">{p.payment_method} • {new Date(p.payment_date).toLocaleString()}</div>
                </div>
                <div className="text-xs text-white/80">{formatCurrency.format(p.amount_paid)}</div>
              </a>
            ))
          )}
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
          {loading ? (
            <div className="text-sm text-white/80">Loading...</div>
          ) : notes.length === 0 ? (
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



