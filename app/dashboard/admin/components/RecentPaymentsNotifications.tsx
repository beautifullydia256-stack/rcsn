'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { DollarSign, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RecentPaymentsNotifications() {
  const [payments, setPayments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
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
          .select('start_date, end_date')
          .eq('school_id', u.school_id)
          .order('year', { ascending: false })
          .order('term', { ascending: false });
        
        const currentTermData = (allTerms || []).find((t: any) => 
          t.start_date ? 
            (t.start_date <= currentTerm.today && t.end_date >= currentTerm.today) : 
            (t.end_date >= currentTerm.today)
        ) || (allTerms && allTerms[0]) || null;

        const [paymentsResult, notificationsResult] = await Promise.all([
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
              .limit(5) :
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
              .limit(5),
          supabase.from("notifications")
            .select("*")
            .eq("school_id", u.school_id)
            .order("created_at", { ascending: false })
            .limit(5)
        ]);

        setPayments(paymentsResult.data || []);
        setNotifications(notificationsResult.data || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentTerm.today]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Recent Payments */}
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: '#4dabff' }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(77, 171, 255, 0.2)' }}>
                <DollarSign className="w-5 h-5" style={{ color: '#4dabff' }} />
              </div>
              <h2 className="text-lg font-semibold text-white">Recent Payments</h2>
            </div>
            <button
              onClick={() => router.push('/dashboard/admin/payments/recent')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-white/85">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="text-sm text-white/85">No recent payments</div>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.payment_id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                >
                  <div>
                    <div className="font-medium text-white text-sm">{payment.students?.name || 'Unknown'}</div>
                    <div className="text-xs text-white/70">{payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm font-semibold text-white">{formatCurrency(payment.amount_paid)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </GlassCard>

      {/* Notifications */}
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: '#ae79ff' }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(174, 121, 255, 0.2)' }}>
                <Bell className="w-5 h-5" style={{ color: '#ae79ff' }} />
              </div>
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
            </div>
            <button
              onClick={() => router.push('/dashboard/admin/notifications')}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-white/85">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-sm text-white/85">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 rounded-xl"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                >
                  <div className="font-medium text-white text-sm mb-1">{notification.title}</div>
                  <div className="text-xs text-white/70">{notification.message}</div>
                  <div className="text-xs text-white/55 mt-1">{new Date(notification.created_at).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

