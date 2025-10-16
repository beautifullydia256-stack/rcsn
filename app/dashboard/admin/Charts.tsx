"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, LabelList } from "recharts";

const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#f87171"];

export function AdminCharts() {
  const [fees, setFees] = useState<any[]>([]);
  const [enroll, setEnroll] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [feesStatus, setFeesStatus] = useState<any[]>([]);
  const [teacherAtt, setTeacherAtt] = useState<{ name: string; present: number; absent: number } | null>(null);
  const [studentAtt, setStudentAtt] = useState<{ name: string; present: number; absent: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoize current year and month keys
  const chartData = useMemo(() => {
    const now = new Date();
    const yearStr = now.getFullYear().toString();
    const monthKeys = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const todayStr = new Date().toISOString().slice(0,10);
    return { yearStr, monthKeys, todayStr };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
        if (!u?.school_id) return;

        // Execute all queries in parallel for maximum performance
        const [
          paymentsResult,
          studentsResult,
          attendanceResult,
          teachersCountResult,
          teacherPunchesResult,
          studentsCountResult,
          studentAttendanceResult,
          activeStudentsResult,
          approvedPaymentsResult
        ] = await Promise.all([
          // Payments for fee trends
          supabase.from("student_payments")
            .select("amount_paid, payment_date")
            .eq("school_id", u.school_id),
          
          // Students for enrollment and expected fees
          supabase.from('students')
            .select('expected_fee_amount, admission_date, student_id')
            .eq('school_id', u.school_id)
            .eq('status','active'),
          
          // General attendance data
          supabase.from("attendance")
            .select("type")
            .eq("school_id", u.school_id),
          
          // Teachers count for today's attendance
          supabase.from('teachers')
            .select('teacher_id', { count: 'exact', head: true })
            .eq('school_id', u.school_id),
          
          // Teacher punches today
          supabase.from('attendance')
            .select('teacher_id,timestamp')
            .eq('school_id', u.school_id)
            .eq('type', 'punch_in')
            .gte('timestamp', chartData.todayStr + ' 00:00:00')
            .lte('timestamp', chartData.todayStr + ' 23:59:59'),
          
          // Students count for today's attendance
          supabase.from('students')
            .select('student_id', { count: 'exact', head: true })
            .eq('school_id', u.school_id)
            .eq('status', 'active'),
          
          // Student attendance today
          supabase.from('student_attendance')
            .select('student_id')
            .eq('school_id', u.school_id)
            .eq('date', chartData.todayStr)
            .eq('present', true),
          
          // Active students for fee status
          supabase.from("students")
            .select("student_id, expected_fee_amount")
            .eq("school_id", u.school_id)
            .eq("status", "active"),
          
          // Approved payments for fee status
          supabase.from("student_payments")
            .select("student_id, amount_paid")
            .eq("school_id", u.school_id)
        ]);

        // Process fee collection trends
        const paidByMonth: Record<string, number> = Object.fromEntries(chartData.monthKeys.map(m=>[chartData.yearStr + '-' + m,0]));
        (paymentsResult.data || []).forEach((p: any) => {
          const ym = new Date(p.payment_date).toISOString().slice(0,7);
          if (ym.startsWith(chartData.yearStr)) paidByMonth[ym] = (paidByMonth[ym] || 0) + Number(p.amount_paid || 0);
        });

        const expectedByMonth: Record<string, number> = Object.fromEntries(chartData.monthKeys.map(m=>[chartData.yearStr + '-' + m,0]));
        (studentsResult.data || []).forEach((s: any) => {
          if (!s.admission_date) return;
          const ym = new Date(s.admission_date).toISOString().slice(0,7);
          if (ym.startsWith(chartData.yearStr)) expectedByMonth[ym] = (expectedByMonth[ym] || 0) + Number(s.expected_fee_amount || 0);
        });

        const feesRows = chartData.monthKeys.map((m, idx) => {
          const key = chartData.yearStr + '-' + m;
          const paid = paidByMonth[key] || 0;
          const expected = expectedByMonth[key] || 0;
          const pending = Math.max(0, expected - paid);
          const monthLabel = new Date(parseInt(chartData.yearStr), idx, 1).toLocaleString(undefined, { month: 'short' });
          return { month: monthLabel, paid, pending };
        });
        setFees(feesRows);

        // Process enrollment growth
        const enrollByMonth: Record<string, number> = Object.fromEntries(chartData.monthKeys.map(m=>[chartData.yearStr + '-' + m,0]));
        (studentsResult.data || []).forEach((s: any) => {
          if (!s.admission_date) return;
          const ym = new Date(s.admission_date).toISOString().slice(0,7);
          if (ym.startsWith(chartData.yearStr)) enrollByMonth[ym] = (enrollByMonth[ym] || 0) + 1;
        });
        const enrollRows = chartData.monthKeys.map((m, idx) => ({
          month: new Date(parseInt(chartData.yearStr), idx, 1).toLocaleString(undefined, { month: 'short' }),
          count: enrollByMonth[chartData.yearStr + '-' + m] || 0
        }));
        setEnroll(enrollRows);

        // Process attendance by type
        const byType: Record<string, number> = {};
        (attendanceResult.data || []).forEach((a: any) => {
          byType[a.type] = (byType[a.type] || 0) + 1;
        });
        setAttendance(Object.entries(byType).map(([name, value]) => ({ name, value })));

        // Process today's attendance
        const presentTeachers = new Set((teacherPunchesResult.data || []).map((p: any) => p.teacher_id)).size;
        const absentTeachers = Math.max(0, (teachersCountResult.count || 0) - presentTeachers);
        setTeacherAtt({ name: 'Teachers', present: presentTeachers, absent: absentTeachers });

        const presentStudents = new Set((studentAttendanceResult.data || []).map((s: any) => s.student_id)).size;
        const absentStudents = Math.max(0, (studentsCountResult.count || 0) - presentStudents);
        setStudentAtt({ name: 'Students', present: presentStudents, absent: absentStudents });

        // Process fee status
        const studentIds: string[] = (activeStudentsResult.data || []).map((s: any) => s.student_id);
        const expectedById = new Map((activeStudentsResult.data || []).map((s: any) => [s.student_id, Number(s.expected_fee_amount || 0)]));

        const paidApproved: Record<string, number> = {};
        (approvedPaymentsResult.data || []).forEach((p: any) => {
          if (!studentIds.includes(p.student_id)) return;
          paidApproved[p.student_id] = (paidApproved[p.student_id] || 0) + Number(p.amount_paid || 0);
        });

        let pendingCount = 0;
        let fullyPaidCount = 0;
        studentIds.forEach((id) => {
          const expected = expectedById.get(id) || 0;
          const paid = paidApproved[id] || 0;
          if (expected > 0 && paid < expected) pendingCount += 1; else fullyPaidCount += 1;
        });

        setFeesStatus([
          { name: "Fully Paid", value: fullyPaidCount },
          { name: "Pending Fees", value: pendingCount },
        ]);
      } catch (error) {
        console.error('Error loading admin charts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [chartData.yearStr, chartData.monthKeys, chartData.todayStr]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-purple-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm text-white/90 mb-2">Fee Collection Trends</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fees}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="paid" name="Paid" fill="#60a5fa" />
              <Bar dataKey="pending" name="Pending" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-teal-500/20 to-teal-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm text-white/90 mb-2">Student Enrollment Growth</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={enroll}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-orange-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm text-white/90 mb-2">Attendance (Today): Teachers & Students</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[teacherAtt, studentAtt].filter(Boolean) as any[]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="present" name="Present" fill="#34d399" />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-indigo-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm text-white/90 mb-2">Fully Paid vs Pending Fees (Active Students)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={feesStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                {feesStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.name === 'Pending Fees' ? '#ef4444' : '#22c55e'} />
                ))}
                <LabelList dataKey="value" position="outside" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
