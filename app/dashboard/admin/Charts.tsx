"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!u?.school_id) return;

      const now = new Date();
      const yearStr = now.getFullYear().toString();
      const monthKeys = ['01','02','03','04','05','06','07','08','09','10','11','12'];

      // Paid in month (Approved payments)
      const { data: pay } = await supabase
        .from("payments")
        .select("amount, created_at, status")
        .eq("school_id", u.school_id)
        .eq('status','Approved');
      const paidByMonth: Record<string, number> = Object.fromEntries(monthKeys.map(m=>[`${yearStr}-${m}`,0]));
      (pay || []).forEach((p: any) => {
        const ym = new Date(p.created_at).toISOString().slice(0,7);
        if (ym.startsWith(yearStr)) paidByMonth[ym] = (paidByMonth[ym] || 0) + Number(p.amount || 0);
      });

      // Expected in month (sum expected_fee_amount for students admitted that month)
      const { data: studsForExpected } = await supabase
        .from('students')
        .select('expected_fee_amount, admission_date')
        .eq('school_id', u.school_id)
        .eq('status','active');
      const expectedByMonth: Record<string, number> = Object.fromEntries(monthKeys.map(m=>[`${yearStr}-${m}`,0]));
      (studsForExpected || []).forEach((s: any) => {
        if (!s.admission_date) return;
        const ym = new Date(s.admission_date).toISOString().slice(0,7);
        if (ym.startsWith(yearStr)) expectedByMonth[ym] = (expectedByMonth[ym] || 0) + Number(s.expected_fee_amount || 0);
      });

      const feesRows = monthKeys.map((m, idx) => {
        const key = `${yearStr}-${m}`;
        const paid = paidByMonth[key] || 0;
        const expected = expectedByMonth[key] || 0;
        const pending = Math.max(0, expected - paid);
        const monthLabel = new Date(parseInt(yearStr), idx, 1).toLocaleString(undefined, { month: 'short' });
        return { month: monthLabel, paid, pending };
      });
      setFees(feesRows);

      // Enrollment Growth: number of students admitted per month (current year), using admission_date
      const { data: studs } = await supabase
        .from("students")
        .select("admission_date")
        .eq("school_id", u.school_id)
        .eq('status','active');
      const enrollByMonth: Record<string, number> = Object.fromEntries(monthKeys.map(m=>[`${yearStr}-${m}`,0]));
      (studs || []).forEach((s: any) => {
        if (!s.admission_date) return;
        const ym = new Date(s.admission_date).toISOString().slice(0,7);
        if (ym.startsWith(yearStr)) enrollByMonth[ym] = (enrollByMonth[ym] || 0) + 1;
      });
      const enrollRows = monthKeys.map((m, idx) => ({
        month: new Date(parseInt(yearStr), idx, 1).toLocaleString(undefined, { month: 'short' }),
        count: enrollByMonth[`${yearStr}-${m}`] || 0
      }));
      setEnroll(enrollRows);

      const { data: att } = await supabase.from("attendance").select("type").eq("school_id", u.school_id);
      const byType: Record<string, number> = {};
      (att || []).forEach((a: any) => {
        byType[a.type] = (byType[a.type] || 0) + 1;
      });
      setAttendance(Object.entries(byType).map(([name, value]) => ({ name, value })));

      // Attendance breakdown for today (Teachers vs Students)
      const todayStr = new Date().toISOString().slice(0,10);
      // Teachers: total vs present today (punch_in today)
      const { count: totalTeachers } = await supabase
        .from('teachers')
        .select('teacher_id', { count: 'exact', head: true })
        .eq('school_id', u.school_id);
      const { data: teacherPunches } = await supabase
        .from('attendance')
        .select('teacher_id,timestamp')
        .eq('school_id', u.school_id)
        .eq('type', 'punch_in')
        .gte('timestamp', `${todayStr} 00:00:00`)
        .lte('timestamp', `${todayStr} 23:59:59`);
      const presentTeachers = new Set((teacherPunches || []).map((p: any) => p.teacher_id)).size;
      const absentTeachers = Math.max(0, (totalTeachers || 0) - presentTeachers);
      setTeacherAtt({ name: 'Teachers', present: presentTeachers, absent: absentTeachers });

      // Students: total active vs present today in student_attendance
      const { count: totalStudents } = await supabase
        .from('students')
        .select('student_id', { count: 'exact', head: true })
        .eq('school_id', u.school_id)
        .eq('status', 'active');
      const { data: stAtt } = await supabase
        .from('student_attendance')
        .select('student_id')
        .eq('school_id', u.school_id)
        .eq('date', todayStr)
        .eq('present', true);
      const presentStudents = new Set((stAtt || []).map((s: any) => s.student_id)).size;
      const absentStudents = Math.max(0, (totalStudents || 0) - presentStudents);
      setStudentAtt({ name: 'Students', present: presentStudents, absent: absentStudents });

      // Fully Paid vs Pending among ACTIVE students using expected vs approved payments
      const { data: activeStudents } = await supabase
        .from("students")
        .select("student_id, expected_fee_amount")
        .eq("school_id", u.school_id)
        .eq("status", "active");

      const studentIds: string[] = (activeStudents || []).map((s: any) => s.student_id);
      const expectedById = new Map((activeStudents || []).map((s: any) => [s.student_id, Number(s.expected_fee_amount || 0)]));

      const { data: approvedPays } = await supabase
        .from("payments")
        .select("student_id, amount, status")
        .eq("school_id", u.school_id)
        .eq("status", "Approved");

      const paidApproved: Record<string, number> = {};
      (approvedPays || []).forEach((p: any) => {
        if (!studentIds.includes(p.student_id)) return;
        paidApproved[p.student_id] = (paidApproved[p.student_id] || 0) + Number(p.amount || 0);
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
    };
    run();
  }, []);

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



