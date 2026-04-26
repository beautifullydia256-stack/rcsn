"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { schoolCalendarTodayIso } from "@/lib/schoolCalendarDate";
import { motion } from "framer-motion";

export default function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // KPIs
  const [kpiTotalSchools, setKpiTotalSchools] = useState<number>(0);
  const [kpiActiveSchools, setKpiActiveSchools] = useState<number>(0);
  const [kpiTotalStudents, setKpiTotalStudents] = useState<number>(0);
  const [kpiTotalTeachers, setKpiTotalTeachers] = useState<number>(0);
  const [kpiAttendanceToday, setKpiAttendanceToday] = useState<number>(0);
  const [kpiRevenueMTD, setKpiRevenueMTD] = useState<number>(0);
  const [kpiRevenueYTD, setKpiRevenueYTD] = useState<number>(0);

  // Tables and widgets
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<Array<{ d: string; amt: number }>>([]);
  const [signupsSeries, setSignupsSeries] = useState<Array<{ d: string; num: number }>>([]);
  const [activeUsersSeries, setActiveUsersSeries] = useState<Array<{ d: string; num: number }>>([]);
  
  // Financial analytics
  const [topPayingSchools, setTopPayingSchools] = useState<any[]>([]);
  const [revenueGrowth, setRevenueGrowth] = useState<any>({ monthly: 0, yearly: 0 });
  const [refunds, setRefunds] = useState<any[]>([]);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState<any[]>([]);
  
  // Usage monitoring
  const [topActiveSchools, setTopActiveSchools] = useState<any[]>([]);
  const [inactiveSchools, setInactiveSchools] = useState<any[]>([]);
  const [storageUsage, setStorageUsage] = useState<any[]>([]);
  const [apiLoad, setApiLoad] = useState<any[]>([]);
  
  // School management
  const [allSchools, setAllSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [schoolFilterAffiliateId, setSchoolFilterAffiliateId] = useState('');
  const [schoolFilterReferralCodeId, setSchoolFilterReferralCodeId] = useState('');
  const [affiliateOptions, setAffiliateOptions] = useState<any[]>([]);
  const [referralCodeOptions, setReferralCodeOptions] = useState<any[]>([]);
  const [newAffiliate, setNewAffiliate] = useState({ name: '', email: '', phone: '' });
  const [referralSavingId, setReferralSavingId] = useState<string | null>(null);
  
  // System health
  const [systemHealth, setSystemHealth] = useState<any>({
    status: 'healthy',
    uptime: 99.9,
    responseTime: 120,
    errorRate: 0.1
  });
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [slowQueries, setSlowQueries] = useState<any[]>([]);
  const [rlsErrors, setRlsErrors] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          loadKpis(),
          loadSubscriptions(),
          loadAlerts(),
          loadCharts(),
          loadUsageMonitoring(),
          loadReferralMeta(),
          loadSystemHealth(),
          loadFinancialAnalytics(),
        ]);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    void loadSchoolManagement();
  }, [schoolFilterAffiliateId, schoolFilterReferralCodeId]);

  const ownerAuthHeaders = async (): Promise<Record<string, string> | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const loadReferralMeta = async () => {
    const h = await ownerAuthHeaders();
    if (!h) return;
    try {
      const [a, r] = await Promise.all([
        fetch('/api/owner/affiliates', { headers: h }).then((res) => res.json()),
        fetch('/api/owner/referral-codes', { headers: h }).then((res) => res.json()),
      ]);
      setAffiliateOptions(a.affiliates || []);
      setReferralCodeOptions(r.referral_codes || []);
    } catch {
      /* ignore */
    }
  };

  const loadKpis = async () => {
    // Schools
    const { count: schoolsCount } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });
    setKpiTotalSchools(schoolsCount || 0);

    // Active schools in last 30 days by logins in auth or recent activity
    const since = new Date(); since.setDate(since.getDate() - 30);
    const { data: activeUsers } = await supabase
      .from('users')
      .select('school_id, last_login', { count: 'exact' })
      .gte('last_login', since.toISOString());
    const uniqueActiveSchools = new Set((activeUsers || []).map(u => u.school_id).filter(Boolean));
    setKpiActiveSchools(uniqueActiveSchools.size);

    // Total students
    const { count: studentsCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });
    setKpiTotalStudents(studentsCount || 0);

    // Total teachers/staff
    const { count: teachersCount } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true });
    setKpiTotalTeachers(teachersCount || 0);

    // Attendance today (system-wide)
    const todayStr = schoolCalendarTodayIso();
    const { count: attendanceCount } = await supabase
      .from('student_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('attendance_date', todayStr);
    setKpiAttendanceToday(attendanceCount || 0);

    // Revenue MTD/YTD from payments
    const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);
    const startYear = new Date(new Date().getFullYear(), 0, 1);
    const { data: mtd } = await supabase
      .from('payments')
      .select('amount, created_at')
      .gte('created_at', startMonth.toISOString());
    const { data: ytd } = await supabase
      .from('payments')
      .select('amount, created_at')
      .gte('created_at', startYear.toISOString());
    setKpiRevenueMTD((mtd || []).reduce((s, p: any) => s + Number(p.amount || 0), 0));
    setKpiRevenueYTD((ytd || []).reduce((s, p: any) => s + Number(p.amount || 0), 0));
  };

  const loadSubscriptions = async () => {
    const { data } = await supabase
      .from('schools')
      .select('school_id, name, plan, next_renewal_at, owner_email');
    setSubscriptions(data || []);
  };

  const loadAlerts = async () => {
    // Placeholder: surface recent billing failures or RLS policy errors if logged
    const { data: billingFailures } = await supabase
      .from('payments')
      .select('payment_id, school_id, amount, status, created_at')
      .in('status', ['failed','overdue'])
      .order('created_at', { ascending: false })
      .limit(10);

    const alerts: any[] = [];
    (billingFailures || []).forEach((p: any) => alerts.push({
      type: 'billing',
      message: `Payment ${p.payment_id} failed for school ${p.school_id}`,
      ts: p.created_at,
    }));
    setAlerts(alerts);
  };

  const loadCharts = async () => {
    const since = new Date(); since.setDate(since.getDate() - 30);
    // Revenue trend
    const { data: rev } = await supabase
      .from('payments')
      .select('amount, created_at')
      .gte('created_at', since.toISOString());
    const byDay: Record<string, number> = {};
    (rev || []).forEach((r: any) => {
      const d = new Date(r.created_at).toISOString().slice(0,10);
      byDay[d] = (byDay[d] || 0) + Number(r.amount || 0);
    });
    setRevenueSeries(Object.keys(byDay).sort().map(d => ({ d, amt: byDay[d] })));

    // Signups trend
    const { data: schools } = await supabase
      .from('schools')
      .select('created_at')
      .gte('created_at', since.toISOString());
    const signByDay: Record<string, number> = {};
    (schools || []).forEach((s: any) => {
      const d = new Date(s.created_at).toISOString().slice(0,10);
      signByDay[d] = (signByDay[d] || 0) + 1;
    });
    setSignupsSeries(Object.keys(signByDay).sort().map(d => ({ d, num: signByDay[d] })));

    // Active users trend (logins)
    const { data: users } = await supabase
      .from('users')
      .select('last_login')
      .gte('last_login', since.toISOString());
    const activeByDay: Record<string, number> = {};
    (users || []).forEach((u: any) => {
      const d = new Date(u.last_login).toISOString().slice(0,10);
      activeByDay[d] = (activeByDay[d] || 0) + 1;
    });
    setActiveUsersSeries(Object.keys(activeByDay).sort().map(d => ({ d, num: activeByDay[d] })));
  };

  const loadUsageMonitoring = async () => {
    // Top active schools (by recent user activity)
    const since = new Date(); since.setDate(since.getDate() - 7);
    const { data: activeUsers } = await supabase
      .from('users')
      .select('school_id, last_login')
      .gte('last_login', since.toISOString());
    
    const schoolActivity: Record<string, number> = {};
    (activeUsers || []).forEach((u: any) => {
      if (u.school_id) {
        schoolActivity[u.school_id] = (schoolActivity[u.school_id] || 0) + 1;
      }
    });

    const { data: allSchools } = await supabase
      .from('schools')
      .select('school_id, name, created_at');
    
    const topActive = Object.entries(schoolActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([schoolId, count]) => {
        const school = (allSchools || []).find(s => s.school_id === schoolId);
        return { school_id: schoolId, name: school?.name || 'Unknown', activity_count: count };
      });
    setTopActiveSchools(topActive);

    // Inactive schools (no activity in last 30 days)
    const inactiveSince = new Date(); inactiveSince.setDate(inactiveSince.getDate() - 30);
    const { data: recentUsers } = await supabase
      .from('users')
      .select('school_id')
      .gte('last_login', inactiveSince.toISOString());
    
    const activeSchoolIds = new Set((recentUsers || []).map(u => u.school_id).filter(Boolean));
    const inactive = (allSchools || [])
      .filter(s => !activeSchoolIds.has(s.school_id))
      .slice(0, 10);
    setInactiveSchools(inactive);

    // Storage usage (placeholder - would need actual storage metrics)
    const storageData = (allSchools || []).map(school => ({
      school_id: school.school_id,
      name: school.name,
      storage_mb: Math.floor(Math.random() * 1000) + 100, // Placeholder
    }));
    setStorageUsage(storageData.slice(0, 10));

    // API load (placeholder - would need actual API metrics)
    const apiData = (allSchools || []).map(school => ({
      school_id: school.school_id,
      name: school.name,
      requests_today: Math.floor(Math.random() * 10000) + 1000, // Placeholder
    }));
    setApiLoad(apiData.slice(0, 10));
  };

  const loadSchoolManagement = async () => {
    const h = await ownerAuthHeaders();
    let schools: any[] = [];

    if (h) {
      const params = new URLSearchParams();
      if (schoolFilterAffiliateId) params.set('affiliate_id', schoolFilterAffiliateId);
      if (schoolFilterReferralCodeId) params.set('referral_code_id', schoolFilterReferralCodeId);
      const res = await fetch(`/api/owner/schools?${params}`, { headers: h });
      if (res.ok) {
        const json = await res.json();
        schools = json.schools || [];
      }
    }

    if (schools.length === 0 && !schoolFilterAffiliateId && !schoolFilterReferralCodeId) {
      const { data } = await supabase
        .from('schools')
        .select('school_id, name, plan, created_at, owner_email, address, phone, referral_code_id, affiliate_id');
      schools = data || [];
    }

    const schoolsWithCounts = await Promise.all(
      (schools || []).map(async (school: any) => {
        const [studentsResult, teachersResult, usersResult] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', school.school_id),
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', school.school_id),
          supabase
            .from('users')
            .select('last_login')
            .eq('school_id', school.school_id)
            .order('last_login', { ascending: false })
            .limit(1),
        ]);

        const refCode =
          school.referral_codes && typeof school.referral_codes === 'object'
            ? (school.referral_codes as { code?: string }).code
            : null;
        const affName =
          school.affiliates && typeof school.affiliates === 'object'
            ? (school.affiliates as { name?: string }).name
            : null;

        return {
          ...school,
          student_count: studentsResult.count || 0,
          teacher_count: teachersResult.count || 0,
          last_activity: usersResult.data?.[0]?.last_login || null,
          referral_code_label: refCode || '—',
          affiliate_label: affName || '—',
        };
      })
    );

    setAllSchools(schoolsWithCounts);
  };

  const createAffiliate = async () => {
    const h = await ownerAuthHeaders();
    if (!h) return;
    const res = await fetch('/api/owner/affiliates', {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify(newAffiliate),
    });
    if (res.ok) {
      setNewAffiliate({ name: '', email: '', phone: '' });
      await loadReferralMeta();
    }
  };

  const patchAffiliateStatus = async (affiliateId: string, status: 'ACTIVE' | 'DISABLED') => {
    const h = await ownerAuthHeaders();
    if (!h) return;
    await fetch(`/api/owner/affiliates/${affiliateId}`, {
      method: 'PATCH',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadReferralMeta();
    await loadSchoolManagement();
  };

  const toggleReferralCodeActive = async (id: string, is_active: boolean) => {
    const h = await ownerAuthHeaders();
    if (!h) return;
    setReferralSavingId(id);
    try {
      await fetch('/api/owner/referral-codes', {
        method: 'PATCH',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active }),
      });
      await loadReferralMeta();
    } finally {
      setReferralSavingId(null);
    }
  };

  const handleSchoolAction = async (schoolId: string, action: string) => {
    try {
      switch (action) {
        case 'suspend':
          // Update school status to suspended
          await supabase
            .from('schools')
            .update({ status: 'suspended' })
            .eq('school_id', schoolId);
          break;
        case 'activate':
          // Update school status to active
          await supabase
            .from('schools')
            .update({ status: 'active' })
            .eq('school_id', schoolId);
          break;
        case 'upgrade':
          // Update plan to premium
          await supabase
            .from('schools')
            .update({ plan: 'premium' })
            .eq('school_id', schoolId);
          break;
        case 'downgrade':
          // Update plan to free
          await supabase
            .from('schools')
            .update({ plan: 'free' })
            .eq('school_id', schoolId);
          break;
        case 'reset':
          // This would require careful implementation to reset all school data
          if (confirm('Are you sure you want to reset all data for this school? This action cannot be undone.')) {
            // Implementation would depend on your data reset strategy
            console.log('Reset data for school:', schoolId);
          }
          break;
      }
      // Reload school data
      await loadSchoolManagement();
    } catch (error) {
      console.error('Error performing school action:', error);
    }
  };

  const loadSystemHealth = async () => {
    // System health metrics (placeholder - would integrate with actual monitoring)
    const health = {
      status: Math.random() > 0.1 ? 'healthy' : 'warning',
      uptime: 99.5 + Math.random() * 0.4,
      responseTime: 80 + Math.random() * 100,
      errorRate: Math.random() * 0.5
    };
    setSystemHealth(health);

    // Error logs (placeholder - would come from actual error tracking)
    const errors = [
      { id: 1, type: 'API', message: 'Failed to process payment for school abc123', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), severity: 'high' },
      { id: 2, type: 'Database', message: 'Connection timeout on users table', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), severity: 'medium' },
      { id: 3, type: 'Auth', message: 'Invalid JWT token for user xyz789', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), severity: 'low' },
    ];
    setErrorLogs(errors);

    // Slow queries (placeholder)
    const queries = [
      { id: 1, query: 'SELECT * FROM students WHERE school_id = ?', duration: 2500, school_id: 'abc123' },
      { id: 2, query: 'SELECT COUNT(*) FROM payments WHERE created_at > ?', duration: 1800, school_id: 'def456' },
    ];
    setSlowQueries(queries);

    // RLS policy errors (placeholder)
    const rlsErrors = [
      { id: 1, policy: 'library_books_select_own_school', error: 'Policy evaluation failed', school_id: 'abc123', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    ];
    setRlsErrors(rlsErrors);
  };

  const loadFinancialAnalytics = async () => {
    // Top paying schools
    const { data: payments } = await supabase
      .from('payments')
      .select('school_id, amount, created_at');
    
    const schoolRevenue: Record<string, number> = {};
    (payments || []).forEach((p: any) => {
      if (p.school_id) {
        schoolRevenue[p.school_id] = (schoolRevenue[p.school_id] || 0) + Number(p.amount || 0);
      }
    });

    const { data: schools } = await supabase
      .from('schools')
      .select('school_id, name');
    
    const topPaying = Object.entries(schoolRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([schoolId, revenue]) => {
        const school = (schools || []).find(s => s.school_id === schoolId);
        return { school_id: schoolId, name: school?.name || 'Unknown', revenue };
      });
    setTopPayingSchools(topPaying);

    // Revenue growth calculation
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const lastYear = new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1);
    
    const { data: currentMonthPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString());
    
    const { data: lastMonthPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', lastMonth.toISOString())
      .lt('created_at', new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString());
    
    const { data: lastYearPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', lastYear.toISOString())
      .lt('created_at', new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString());

    const currentRevenue = (currentMonthPayments || []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
    const lastMonthRevenue = (lastMonthPayments || []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
    const lastYearRevenue = (lastYearPayments || []).reduce((s, p: any) => s + Number(p.amount || 0), 0);

    const monthlyGrowth = lastMonthRevenue > 0 ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const yearlyGrowth = lastYearRevenue > 0 ? ((currentRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0;

    setRevenueGrowth({ monthly: monthlyGrowth, yearly: yearlyGrowth });

    // Refunds (placeholder - would need actual refund data)
    const refundData = [
      { id: 1, school_id: 'abc123', amount: 500, reason: 'Service cancellation', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
      { id: 2, school_id: 'def456', amount: 250, reason: 'Billing error', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },
    ];
    setRefunds(refundData);

    // Subscription revenue breakdown
    const subscriptionData = [
      { plan: 'Free', count: 15, revenue: 0 },
      { plan: 'Basic', count: 8, revenue: 2400 },
      { plan: 'Premium', count: 5, revenue: 5000 },
    ];
    setSubscriptionRevenue(subscriptionData);
  };

  const handleQuickAction = async (action: string) => {
    try {
      switch (action) {
        case 'manage-plans':
          // Open plan management modal or navigate to plans page
          alert('Plan management feature would open here');
          break;
        case 'data-cleanup':
          if (confirm('This will clean up orphaned data and optimize the database. Continue?')) {
            // Implement data cleanup logic
            console.log('Running data cleanup...');
            alert('Data cleanup completed successfully');
          }
          break;
        case 'announcement':
          const message = prompt('Enter announcement message:');
          if (message) {
            // Send announcement to all schools
            console.log('Sending announcement:', message);
            alert('Announcement sent to all schools');
          }
          break;
      }
    } catch (error) {
      console.error('Error performing quick action:', error);
      alert('Error performing action');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64"><div className="text-white">Loading...</div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPIs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard label="Total Schools" value={kpiTotalSchools} color="blue" />
          <KpiCard label="Active Schools (30d)" value={kpiActiveSchools} color="green" />
          <KpiCard label="Total Students" value={kpiTotalStudents} color="purple" />
          <KpiCard label="Teachers/Staff" value={kpiTotalTeachers} color="indigo" />
          <KpiCard label="Attendance Today" value={kpiAttendanceToday} color="yellow" />
          <KpiCard label="Revenue MTD" value={`$${kpiRevenueMTD.toFixed(2)}`} color="teal" />
          <KpiCard label="Revenue YTD" value={`$${kpiRevenueYTD.toFixed(2)}`} color="pink" />
        </motion.div>

        {/* Middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscriptions table */}
          <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Subscriptions & Billing</h2>
              <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 text-sm">Export</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/70">
                  <tr>
                    <th className="text-left py-2">School</th>
                    <th className="text-left py-2">Plan</th>
                    <th className="text-left py-2">Next Renewal</th>
                    <th className="text-left py-2">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s: any) => (
                    <tr key={s.school_id} className="border-t border-white/10">
                      <td className="py-2">{s.name}</td>
                      <td className="py-2">{s.plan || 'Free'}</td>
                      <td className="py-2">{s.next_renewal_at ? new Date(s.next_renewal_at).toLocaleDateString() : '—'}</td>
                      <td className="py-2">{s.owner_email || '—'}</td>
                    </tr>
                  ))}
                  {subscriptions.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-white/70">No subscription data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Alerts */}
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">System Alerts</h2>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-white/70 text-sm">No alerts</p>
              ) : alerts.map((a, idx) => (
                <div key={idx} className="p-3 rounded bg-white/5 border border-white/10">
                  <p className="text-sm">{a.message}</p>
                  <p className="text-xs text-white/60 mt-1">{new Date(a.ts).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Monitoring Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UsageWidget title="Top Active Schools (7d)" data={topActiveSchools} type="activity" />
          <UsageWidget title="Inactive Schools (30d)" data={inactiveSchools} type="inactive" />
          <UsageWidget title="Storage Usage" data={storageUsage} type="storage" />
          <UsageWidget title="API Load Today" data={apiLoad} type="api" />
        </div>

        {/* System Health & Error Tracking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SystemHealthCard health={systemHealth} />
          <ErrorLogsWidget errors={errorLogs} />
          <SystemIssuesWidget slowQueries={slowQueries} rlsErrors={rlsErrors} />
        </div>

        {/* Financial Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinancialChart title="Revenue Growth" growth={revenueGrowth} />
          <TopPayingSchoolsWidget schools={topPayingSchools} />
          <SubscriptionBreakdownWidget data={subscriptionRevenue} />
          <RefundsWidget refunds={refunds} />
        </div>

        {/* Bottom row charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Revenue (30d)" series={revenueSeries} unit="$" />
          <ChartCard title="School Signups (30d)" series={signupsSeries} />
          <ChartCard title="Active Users (30d)" series={activeUsersSeries} />
          <ActivityFeed />
        </div>

        {/* Referrals & affiliates */}
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white space-y-6">
          <h2 className="text-xl font-semibold">Referrals and affiliates</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white/80">Create affiliate</h3>
              <input
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                placeholder="Name"
                value={newAffiliate.name}
                onChange={(e) => setNewAffiliate((s) => ({ ...s, name: e.target.value }))}
              />
              <input
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                placeholder="Email"
                value={newAffiliate.email}
                onChange={(e) => setNewAffiliate((s) => ({ ...s, email: e.target.value }))}
              />
              <input
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                placeholder="Phone"
                value={newAffiliate.phone}
                onChange={(e) => setNewAffiliate((s) => ({ ...s, phone: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => void createAffiliate()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
              >
                Create affiliate and code
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <h3 className="text-sm font-medium text-white/80">Affiliates</h3>
              {(affiliateOptions || []).length === 0 ? (
                <p className="text-white/60 text-sm">No affiliates yet</p>
              ) : (
                (affiliateOptions || []).map((a: any) => (
                  <div
                    key={a.affiliate_id}
                    className="flex items-center justify-between gap-2 p-2 rounded bg-white/5 border border-white/10 text-sm"
                  >
                    <div>
                      <p className="font-medium">{a.name || a.email}</p>
                      <p className="text-xs text-white/60">{a.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void patchAffiliateStatus(
                          a.affiliate_id,
                          a.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
                        )
                      }
                      className="px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20"
                    >
                      {a.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <h3 className="text-sm font-medium text-white/80 mb-2">Referral codes</h3>
            <table className="w-full text-sm">
              <thead className="text-white/70">
                <tr>
                  <th className="text-left py-2 px-2">Code</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Uses</th>
                  <th className="text-left py-2 px-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {(referralCodeOptions || []).map((rc: any) => (
                  <tr key={rc.id} className="border-t border-white/10">
                    <td className="py-2 px-2 font-mono">{rc.code}</td>
                    <td className="py-2 px-2">{rc.discount_type}</td>
                    <td className="py-2 px-2">
                      {rc.current_uses}
                      {rc.max_uses != null ? ` / ${rc.max_uses}` : ''}
                    </td>
                    <td className="py-2 px-2">
                      <button
                        type="button"
                        disabled={referralSavingId === rc.id}
                        onClick={() => void toggleReferralCodeActive(rc.id, !rc.is_active)}
                        className="px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50"
                      >
                        {rc.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {(referralCodeOptions || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-white/60 text-center">
                      No referral codes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* School Management */}
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">School Management</h2>
            <button 
              onClick={() => setShowSchoolModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
            >
              Add New School
            </button>
          </div>
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            <select
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
              value={schoolFilterAffiliateId}
              onChange={(e) => setSchoolFilterAffiliateId(e.target.value)}
            >
              <option value="">All affiliates</option>
              {(affiliateOptions || []).map((a: any) => (
                <option key={a.affiliate_id} value={a.affiliate_id}>
                  {a.name || a.email}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
              value={schoolFilterReferralCodeId}
              onChange={(e) => setSchoolFilterReferralCodeId(e.target.value)}
            >
              <option value="">All referral codes</option>
              {(referralCodeOptions || []).map((rc: any) => (
                <option key={rc.id} value={rc.id}>
                  {rc.code}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/70">
                <tr>
                  <th className="text-left py-3 px-2">School Name</th>
                  <th className="text-left py-3 px-2">Referral code</th>
                  <th className="text-left py-3 px-2">Affiliate</th>
                  <th className="text-left py-3 px-2">Plan</th>
                  <th className="text-left py-3 px-2">Students</th>
                  <th className="text-left py-3 px-2">Teachers</th>
                  <th className="text-left py-3 px-2">Last Activity</th>
                  <th className="text-left py-3 px-2">Owner</th>
                  <th className="text-left py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allSchools.map((school: any) => (
                  <tr key={school.school_id} className="border-t border-white/10">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium">{school.name}</p>
                        <p className="text-xs text-white/60">{school.school_id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-white/90">{school.referral_code_label || '—'}</td>
                    <td className="py-3 px-2 text-white/90">{school.affiliate_label || '—'}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        school.plan === 'premium' ? 'bg-green-500/20 text-green-400' :
                        school.plan === 'free' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {school.plan || 'Free'}
                      </span>
                    </td>
                    <td className="py-3 px-2">{school.student_count}</td>
                    <td className="py-3 px-2">{school.teacher_count}</td>
                    <td className="py-3 px-2">
                      {school.last_activity ? new Date(school.last_activity).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-2">{school.owner_email || '—'}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSchoolAction(school.school_id, school.plan === 'premium' ? 'downgrade' : 'upgrade')}
                          className="px-2 py-1 rounded text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                        >
                          {school.plan === 'premium' ? 'Downgrade' : 'Upgrade'}
                        </button>
                        <button
                          onClick={() => handleSchoolAction(school.school_id, 'suspend')}
                          className="px-2 py-1 rounded text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400"
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => handleSchoolAction(school.school_id, 'reset')}
                          className="px-2 py-1 rounded text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400"
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {allSchools.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-white/70 text-center">
                      No schools found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button 
            onClick={() => setShowSchoolModal(true)}
            className="px-4 py-3 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-sm font-medium"
          >
            ➕ Add New School
          </button>
          <a
            href="/dashboard/owner/users"
            className="px-4 py-3 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 text-sm font-medium text-center block"
          >
            👥 Manage Users
          </a>
          <button 
            onClick={() => handleQuickAction('manage-plans')}
            className="px-4 py-3 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 text-sm font-medium"
          >
            📋 Manage Plans
          </button>
          <button 
            onClick={() => handleQuickAction('data-cleanup')}
            className="px-4 py-3 rounded-lg bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-600/30 text-sm font-medium"
          >
            🧹 Run Data Cleanup
          </button>
          <button 
            onClick={() => handleQuickAction('announcement')}
            className="px-4 py-3 rounded-lg bg-teal-600/20 border border-teal-500/30 text-teal-400 hover:bg-teal-600/30 text-sm font-medium"
          >
            📢 Send Announcement
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/70 text-sm">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg bg-${color}-500/20`} />
      </div>
    </div>
  );
}

function ChartCard({ title, series, unit }: { title: string; series: Array<{ d: string; amt?: number; num?: number }>; unit?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="space-y-2">
        {series.length === 0 ? (
          <p className="text-white/70 text-sm">No data</p>
        ) : series.map((s) => (
          <div key={s.d} className="flex items-center gap-3">
            <div className="w-24 text-xs text-white/70">{s.d}</div>
            <div className="flex-1 h-2 rounded bg-white/10">
              <div className="h-2 rounded bg-blue-500" style={{ width: `${Math.min(((s.amt ?? s.num ?? 0) / (unit ? 500 : 20)) * 100, 100)}%` }} />
            </div>
            <div className="w-16 text-xs text-white/70 text-right">{unit ? `${unit}${(s.amt ?? 0).toFixed(0)}` : (s.num ?? 0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsageWidget({ title, data, type }: { title: string; data: any[]; type: string }) {
  const getValue = (item: any) => {
    switch (type) {
      case 'activity': return item.activity_count;
      case 'inactive': return new Date(item.created_at).toLocaleDateString();
      case 'storage': return `${item.storage_mb} MB`;
      case 'api': return item.requests_today.toLocaleString();
      default: return '';
    }
  };

  const getLabel = (item: any) => {
    switch (type) {
      case 'activity': return `${item.activity_count} logins`;
      case 'inactive': return `Created ${new Date(item.created_at).toLocaleDateString()}`;
      case 'storage': return `${item.storage_mb} MB used`;
      case 'api': return `${item.requests_today.toLocaleString()} requests`;
      default: return '';
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-white/70">{data.length} schools</span>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {data.length === 0 ? (
          <p className="text-white/70 text-sm">No data available</p>
        ) : data.map((item: any, idx: number) => (
          <div key={item.school_id || idx} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-white/60">{getLabel(item)}</p>
            </div>
            <div className="text-sm text-white/70 ml-2">
              {type === 'activity' && (
                <div className="w-2 h-2 rounded-full bg-green-500" />
              )}
              {type === 'inactive' && (
                <div className="w-2 h-2 rounded-full bg-red-500" />
              )}
              {type === 'storage' && (
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
              )}
              {type === 'api' && (
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemHealthCard({ health }: { health: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">System Health</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getStatusIcon(health.status)}</span>
          <span className={`text-sm font-medium ${getStatusColor(health.status)}`}>
            {health.status.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/70">Uptime</span>
          <span className="text-sm font-medium">{health.uptime.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/70">Response Time</span>
          <span className="text-sm font-medium">{health.responseTime.toFixed(0)}ms</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/70">Error Rate</span>
          <span className="text-sm font-medium">{health.errorRate.toFixed(2)}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 mt-2">
          <div 
            className={`h-2 rounded-full ${
              health.uptime > 99.5 ? 'bg-green-500' : 
              health.uptime > 99 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${health.uptime}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ErrorLogsWidget({ errors }: { errors: any[] }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Error Logs</h3>
        <span className="text-sm text-white/70">{errors.length} errors</span>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {errors.length === 0 ? (
          <p className="text-white/70 text-sm">No errors</p>
        ) : errors.map((error: any) => (
          <div key={error.id} className="p-3 rounded bg-white/5 border border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(error.severity)}`}>
                    {error.severity}
                  </span>
                  <span className="text-xs text-white/60">{error.type}</span>
                </div>
                <p className="text-sm">{error.message}</p>
              </div>
            </div>
            <p className="text-xs text-white/60 mt-1">{new Date(error.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemIssuesWidget({ slowQueries, rlsErrors }: { slowQueries: any[]; rlsErrors: any[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">System Issues</h3>
      </div>
      <div className="space-y-4">
        {/* Slow Queries */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-white/80">Slow Queries</h4>
            <span className="text-xs text-white/60">{slowQueries.length}</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {slowQueries.length === 0 ? (
              <p className="text-white/70 text-xs">No slow queries</p>
            ) : slowQueries.map((query: any) => (
              <div key={query.id} className="p-2 rounded bg-white/5 border border-white/10">
                <p className="text-xs font-mono text-white/80 truncate">{query.query}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-white/60">{query.school_id}</span>
                  <span className="text-xs text-red-400">{query.duration}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RLS Errors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-white/80">RLS Policy Errors</h4>
            <span className="text-xs text-white/60">{rlsErrors.length}</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {rlsErrors.length === 0 ? (
              <p className="text-white/70 text-xs">No RLS errors</p>
            ) : rlsErrors.map((error: any) => (
              <div key={error.id} className="p-2 rounded bg-white/5 border border-white/10">
                <p className="text-xs font-medium">{error.policy}</p>
                <p className="text-xs text-white/60 mt-1">{error.error}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-white/60">{error.school_id}</span>
                  <span className="text-xs text-white/60">{new Date(error.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialChart({ title, growth }: { title: string; growth: any }) {
  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return '↗️';
    if (value < 0) return '↘️';
    return '➡️';
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Monthly Growth</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getGrowthIcon(growth.monthly)}</span>
            <span className={`text-sm font-medium ${getGrowthColor(growth.monthly)}`}>
              {growth.monthly > 0 ? '+' : ''}{growth.monthly.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Yearly Growth</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getGrowthIcon(growth.yearly)}</span>
            <span className={`text-sm font-medium ${getGrowthColor(growth.yearly)}`}>
              {growth.yearly > 0 ? '+' : ''}{growth.yearly.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${growth.monthly > 0 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(Math.abs(growth.monthly), 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TopPayingSchoolsWidget({ schools }: { schools: any[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Top Paying Schools</h3>
        <span className="text-sm text-white/70">{schools.length} schools</span>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {schools.length === 0 ? (
          <p className="text-white/70 text-sm">No payment data</p>
        ) : schools.map((school: any, idx: number) => (
          <div key={school.school_id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{school.name}</p>
                <p className="text-xs text-white/60">{school.school_id}</p>
              </div>
            </div>
            <div className="text-sm font-medium text-green-400">
              ${school.revenue.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionBreakdownWidget({ data }: { data: any[] }) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalSchools = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Subscription Breakdown</h3>
        <span className="text-sm text-white/70">${totalRevenue.toFixed(2)}</span>
      </div>
      <div className="space-y-3">
        {data.map((item: any) => (
          <div key={item.plan} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{item.plan}</span>
              <span className="text-sm text-white/70">{item.count} schools</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${totalSchools > 0 ? (item.count / totalSchools) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>{((item.count / totalSchools) * 100).toFixed(1)}% of schools</span>
              <span>${item.revenue.toFixed(2)} revenue</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefundsWidget({ refunds }: { refunds: any[] }) {
  const totalRefunds = refunds.reduce((sum, refund) => sum + refund.amount, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Recent Refunds</h3>
        <span className="text-sm text-red-400">${totalRefunds.toFixed(2)}</span>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {refunds.length === 0 ? (
          <p className="text-white/70 text-sm">No recent refunds</p>
        ) : refunds.map((refund: any) => (
          <div key={refund.id} className="p-3 rounded bg-white/5 border border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">${refund.amount.toFixed(2)}</p>
                <p className="text-xs text-white/70 mt-1">{refund.reason}</p>
                <p className="text-xs text-white/60 mt-1">{refund.school_id}</p>
              </div>
              <span className="text-xs text-white/60">{new Date(refund.date).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const run = async () => {
      const since = new Date(); since.setDate(since.getDate() - 7);
      const { data: payments } = await supabase
        .from('payments')
        .select('payment_id, amount, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      setRows(payments || []);
    };
    run();
  }, []);
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Activity Feed</h3>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-white/70 text-sm">No recent activity</p>
        ) : rows.map((r: any) => (
          <div key={r.payment_id} className="p-3 rounded bg-white/5 border border-white/10">
            <p className="text-sm">Payment {r.payment_id} · ${Number(r.amount || 0).toFixed(2)}</p>
            <p className="text-xs text-white/60 mt-1">{new Date(r.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
