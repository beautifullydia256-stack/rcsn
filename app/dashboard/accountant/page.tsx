"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";

export default function AccountantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // KPIs
  const [kpiCollectedToday, setKpiCollectedToday] = useState<number>(0);
  const [kpiCollectedThisTerm, setKpiCollectedThisTerm] = useState<number>(0);
  const [kpiOutstanding, setKpiOutstanding] = useState<number>(0);
  const [kpiDebtorsCount, setKpiDebtorsCount] = useState<number>(0);

  // Payments listing
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes, setClasses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [minBalance, setMinBalance] = useState<string>("0");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: userRow } = await supabase
          .from("users")
          .select("school_id, role")
          .eq("user_id", user.id)
          .single();
        if (!userRow?.school_id) {
          setError("School not found for user");
          return;
        }
        setSchoolId(userRow.school_id);
        setRole(userRow.role || null);

        // Role guard: only accountant or admin
        if (userRow.role !== "accountant" && userRow.role !== "admin") {
          setError("Access denied. Accountant or Admin only.");
          return;
        }

        // Load classes
        const { data: students } = await supabase
          .from("students")
          .select("current_class")
          .eq("school_id", userRow.school_id);
        const uniqueClasses = [...new Set((students || []).map(s => s.current_class).filter(Boolean))].sort();
        setClasses(uniqueClasses as string[]);

        // Initial payments list (latest 50)
        const { data: pay } = await supabase
          .from("student_fees")
          .select("*, students(name, current_class, admission_number)")
          .eq("school_id", userRow.school_id)
          .order("created_at", { ascending: false })
          .limit(50);
        setPayments(pay || []);

        // TODO: Replace with term-aware queries
        // KPIs placeholders (computed on client for now)
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const collectedToday = (pay || [])
          .filter(p => (p.created_at || "").slice(0,10) === todayISO)
          .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        setKpiCollectedToday(collectedToday);

        const collectedThisTerm = (pay || []).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        setKpiCollectedThisTerm(collectedThisTerm);

        // Outstanding: expected - paid (simple placeholder; refine later)
        const { data: expectedFees } = await supabase
          .from("school_fees_expected")
          .select("student_id, expected_amount")
          .eq("school_id", userRow.school_id);
        const byStudentPaid = new Map<string, number>();
        for (const p of pay || []) {
          const key = p.student_id;
          byStudentPaid.set(key, (byStudentPaid.get(key) || 0) + (p.amount_paid || 0));
        }
        let outstanding = 0;
        let debtors = 0;
        for (const row of expectedFees || []) {
          const paid = byStudentPaid.get(row.student_id) || 0;
          const bal = Math.max((row.expected_amount || 0) - paid, 0);
          outstanding += bal;
          if (bal > 0) debtors += 1;
        }
        setKpiOutstanding(outstanding);
        setKpiDebtorsCount(debtors);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(p => {
      const s = p.students || {};
      const matchClass = selectedClass ? (s.current_class === selectedClass) : true;
      const matchSearch = !q || String(s.name || "").toLowerCase().includes(q) || String(s.admission_number || "").toLowerCase().includes(q) || String(p.student_id || "").toLowerCase().includes(q);
      return matchClass && matchSearch;
    });
  }, [payments, search, selectedClass]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Accountant Dashboard</h1>
            <p className="text-slate-500 text-sm">Manage fees collection, balances, and receipts</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard title="Collected Today" value={formatCurrency(kpiCollectedToday)} accent="bg-emerald-500" />
          <KpiCard title="Collected This Term" value={formatCurrency(kpiCollectedThisTerm)} accent="bg-blue-500" />
          <KpiCard title="Outstanding Balances" value={formatCurrency(kpiOutstanding)} accent="bg-orange-500" />
          <KpiCard title="Students with Balances" value={String(kpiDebtorsCount)} accent="bg-red-500" />
        </div>

        {/* Filters / Quick actions */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search student by name/admission/ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80 rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={method}
            onChange={(e)=>setMethod(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
          >
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="mobile_money">Mobile Money</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e)=>setStartDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e)=>setEndDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
          />
          <input
            type="number"
            placeholder="Min Balance"
            value={minBalance}
            onChange={(e)=>setMinBalance(e.target.value)}
            className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
          />
          <div className="flex-1" />
          <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">Record Payment</button>
          <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">Generate Receipt</button>
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={()=>{
              const q = new URLSearchParams();
              if (startDate) q.set('start', startDate);
              if (endDate) q.set('end', endDate);
              if (selectedClass) q.set('class', selectedClass);
              if (method) q.set('method', method);
              window.open(`/api/accountant/collections.pdf?${q.toString()}`,'_blank');
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
          >Download Collections (PDF)</button>

          <button
            onClick={()=>{
              const q = new URLSearchParams();
              if (selectedClass) q.set('class', selectedClass);
              if (minBalance) q.set('minBalance', minBalance);
              window.open(`/api/accountant/balances.pdf?${q.toString()}`,'_blank');
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
          >Download Balances (PDF)</button>

          <button
            onClick={()=>{
              const q = new URLSearchParams();
              if (startDate) q.set('start', startDate);
              if (endDate) q.set('end', endDate);
              if (selectedClass) q.set('class', selectedClass);
              window.open(`/api/accountant/term-summary.pdf?${q.toString()}`,'_blank');
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
          >Download Term Summary (PDF)</button>
        </div>

        {/* Payments table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Admission</Th>
                <Th>Amount</Th>
                <Th>Method</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p, idx) => {
                const s = p.students || {};
                return (
                  <tr key={p.id || idx} className="border-t border-slate-100">
                    <Td>{s.name}</Td>
                    <Td>{s.current_class}</Td>
                    <Td>{s.admission_number}</Td>
                    <Td>{formatCurrency(p.amount_paid)}</Td>
                    <Td>{p.payment_method || "-"}</Td>
                    <Td>{new Date(p.created_at).toLocaleString()}</Td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-10">No records</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, accent }: { title: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="text-slate-500 text-xs uppercase tracking-wide mb-2">{title}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-semibold text-slate-800">{value}</div>
        <div className={`w-2 h-8 rounded ${accent}`} />
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left font-medium px-4 py-3">{children}</th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3">{children}</td>
  );
}

function formatCurrency(amount: number | null | undefined): string {
  const n = Number(amount || 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(n);
}


