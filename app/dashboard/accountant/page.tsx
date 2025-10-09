"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface StudentBalance {
  balance_id: string;
  student_id: string;
  term_id: string;
  total_fees: number;
  total_paid: number;
  balance: number;
  last_payment_date: string | null;
  students: {
    name: string;
    admission_number: string;
  };
  classes: {
    class_name: string;
  };
  school_terms: {
    year: number;
    term: number;
    academic_year: string;
  };
}

interface Payment {
  payment_id: string;
  student_id: string;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  transaction_ref: string;
  notes: string;
  students: {
    name: string;
    admission_number: string;
  };
  classes: {
    class_name: string;
  };
}

export default function AccountantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"balances" | "payments">("balances");

  // KPIs
  const [kpiCollectedToday, setKpiCollectedToday] = useState<number>(0);
  const [kpiCollectedThisTerm, setKpiCollectedThisTerm] = useState<number>(0);
  const [kpiOutstanding, setKpiOutstanding] = useState<number>(0);
  const [kpiDebtorsCount, setKpiDebtorsCount] = useState<number>(0);

  // Data
  const [balances, setBalances] = useState<StudentBalance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentTermId, setCurrentTermId] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes, setClasses] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

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
          .select("school_id, role, name")
          .eq("user_id", user.id)
          .single();
        if (!userRow?.school_id) {
          setError("School not found for user");
          return;
        }
        setSchoolId(userRow.school_id);
        setRole(userRow.role || null);
        setUserName(userRow.name || "User");

        // Load school name
        const { data: schoolData } = await supabase
          .from("schools")
          .select("name")
          .eq("school_id", userRow.school_id)
          .single();
        setSchoolName(schoolData?.name || "School");

        // Role guard: only accountant or admin
        if (userRow.role !== "accountant" && userRow.role !== "admin") {
          setError("Access denied. Accountant or Admin only.");
          return;
        }

        // Get current term
        const today = new Date().toISOString().slice(0, 10);
        const { data: allTerms } = await supabase
          .from('school_terms')
          .select('id, start_date, end_date, year, term')
          .eq('school_id', userRow.school_id)
          .order('year', { ascending: false })
          .order('term', { ascending: false });
        
        const currentTerm = (allTerms || []).find((t: any) => 
          t.start_date && t.end_date &&
          t.start_date <= today && t.end_date >= today
        ) || (allTerms && allTerms[0]) || null;

        if (currentTerm) {
          setCurrentTermId(currentTerm.id);
        }

        // Load classes
        const { data: classesData } = await supabase
          .from("classes")
          .select("class_name")
          .eq("school_id", userRow.school_id)
          .order("class_name");
        const uniqueClasses = (classesData || []).map(c => c.class_name);
        setClasses(uniqueClasses);

        // Fetch student balances for current term
        const { data: balancesData } = await supabase
          .from("student_balances")
          .select(`
            balance_id,
            student_id,
            term_id,
            total_fees,
            total_paid,
            balance,
            last_payment_date,
            students!inner(name, admission_number),
            classes!inner(class_name),
            school_terms!inner(year, term, academic_year)
          `)
          .eq("school_id", userRow.school_id)
          .eq("term_id", currentTerm?.id || "")
          .order("balance", { ascending: false });

        setBalances(balancesData as any || []);

        // Fetch all payments for this term
        const { data: paymentsData } = await supabase
          .from("student_payments")
          .select(`
            payment_id,
            student_id,
            amount_paid,
            payment_method,
            payment_date,
            transaction_ref,
            notes,
            students!inner(name, admission_number),
            classes(class_name)
          `)
          .eq("school_id", userRow.school_id)
          .eq("term_id", currentTerm?.id || "")
          .order("payment_date", { ascending: false });

        setPayments(paymentsData as any || []);

        // Calculate KPIs
        const todayISO = today;
        
        // Collected Today
        const collectedToday = (paymentsData || [])
          .filter(p => p.payment_date === todayISO)
          .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        setKpiCollectedToday(collectedToday);

        // Collected This Term (all payments in current term)
        const collectedThisTerm = (paymentsData || [])
          .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        setKpiCollectedThisTerm(collectedThisTerm);

        // Outstanding and debtors from balances
        const outstanding = (balancesData || [])
          .reduce((sum, b: any) => sum + Number(b.balance || 0), 0);
        const debtors = (balancesData || [])
          .filter((b: any) => Number(b.balance || 0) > 0).length;
        
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

  const filteredBalances = useMemo(() => {
    const q = search.toLowerCase();
    return balances.filter(b => {
      const matchClass = selectedClass ? (b.classes.class_name === selectedClass) : true;
      const matchSearch = !q || 
        b.students.name.toLowerCase().includes(q) || 
        (b.students.admission_number || "").toLowerCase().includes(q);
      
      let matchStatus = true;
      if (statusFilter === "fully_paid") {
        matchStatus = b.balance <= 0;
      } else if (statusFilter === "partial") {
        matchStatus = b.total_paid > 0 && b.balance > 0;
      } else if (statusFilter === "not_paid") {
        matchStatus = b.total_paid === 0;
      }
      
      return matchClass && matchSearch && matchStatus;
    });
  }, [balances, search, selectedClass, statusFilter]);

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(p => {
      const matchClass = selectedClass ? (p.classes?.class_name === selectedClass) : true;
      const matchSearch = !q || 
        p.students.name.toLowerCase().includes(q) || 
        (p.students.admission_number || "").toLowerCase().includes(q);
      return matchClass && matchSearch;
    });
  }, [payments, search, selectedClass]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <div className="text-red-400 bg-red-500/10 border border-red-400/30 rounded-lg px-6 py-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      
      {/* Header */}
      <div className="relative border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                <span className="text-emerald-300 text-lg">💰</span>
              </div>
              <div>
                <h1 className="text-white text-xl font-semibold">{schoolName}</h1>
                <p className="text-white/60 text-sm">Accountant Dashboard • {userName}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-white text-2xl font-semibold mb-2">Student Accounting System</h2>
          <p className="text-white/70 text-sm">Multi-payment tracking with automatic balance calculation</p>
        </motion.div>

        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <KpiCard title="Collected Today" value={formatCurrency(kpiCollectedToday)} accent="bg-emerald-500" />
          <KpiCard title="Collected This Term" value={formatCurrency(kpiCollectedThisTerm)} accent="bg-blue-500" />
          <KpiCard title="Outstanding Balances" value={formatCurrency(kpiOutstanding)} accent="bg-orange-500" />
          <KpiCard title="Students with Balances" value={String(kpiDebtorsCount)} accent="bg-red-500" />
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 mb-6"
        >
          <button
            onClick={() => setActiveTab("balances")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "balances"
                ? "bg-white text-indigo-900 shadow-lg"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Student Balances
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "payments"
                ? "bg-white text-indigo-900 shadow-lg"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Payment History
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-4 mb-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by name or admission number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
            />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
            >
              <option value="" className="bg-slate-800">All Classes</option>
              {classes.map(c => (
                <option key={c} value={c} className="bg-slate-800">{c}</option>
              ))}
            </select>
            {activeTab === "balances" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
              >
                <option value="" className="bg-slate-800">All Status</option>
                <option value="fully_paid" className="bg-slate-800">Fully Paid</option>
                <option value="partial" className="bg-slate-800">Partial Payment</option>
                <option value="not_paid" className="bg-slate-800">Not Paid</option>
              </select>
            )}
          </div>
        </motion.div>

        {/* Content based on active tab */}
        {activeTab === "balances" ? (
          <BalancesTable balances={filteredBalances} />
        ) : (
          <PaymentsTable payments={filteredPayments} />
        )}
      </div>
    </div>
  );
}

function BalancesTable({ balances }: { balances: StudentBalance[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/80">
            <tr>
              <Th>Student</Th>
              <Th>Admission #</Th>
              <Th>Class</Th>
              <Th>Term</Th>
              <Th>Total Fees</Th>
              <Th>Total Paid</Th>
              <Th>Balance</Th>
              <Th>Last Payment</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {balances.map((b) => {
              const status = b.balance <= 0 ? "Fully Paid" : b.total_paid === 0 ? "Not Paid" : "Partial";
              const statusColor = b.balance <= 0 ? "text-emerald-400" : b.total_paid === 0 ? "text-red-400" : "text-yellow-400";
              
              return (
                <tr key={b.balance_id} className="border-t border-white/10">
                  <Td>{b.students.name}</Td>
                  <Td>{b.students.admission_number || "-"}</Td>
                  <Td>{b.classes.class_name}</Td>
                  <Td>T{b.school_terms.term} {b.school_terms.year}</Td>
                  <Td>{formatCurrency(b.total_fees)}</Td>
                  <Td>{formatCurrency(b.total_paid)}</Td>
                  <Td className={b.balance > 0 ? "text-red-400 font-semibold" : "text-emerald-400"}>
                    {formatCurrency(b.balance)}
                  </Td>
                  <Td>{b.last_payment_date ? new Date(b.last_payment_date).toLocaleDateString() : "-"}</Td>
                  <Td className={statusColor}>{status}</Td>
                </tr>
              );
            })}
            {balances.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-white/60 py-10">No balance records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/80">
            <tr>
              <Th>Date</Th>
              <Th>Student</Th>
              <Th>Admission #</Th>
              <Th>Class</Th>
              <Th>Amount</Th>
              <Th>Method</Th>
              <Th>Transaction Ref</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {payments.map((p) => (
              <tr key={p.payment_id} className="border-t border-white/10">
                <Td>{new Date(p.payment_date).toLocaleDateString()}</Td>
                <Td>{p.students.name}</Td>
                <Td>{p.students.admission_number || "-"}</Td>
                <Td>{p.classes?.class_name || "-"}</Td>
                <Td className="text-emerald-400 font-semibold">{formatCurrency(p.amount_paid)}</Td>
                <Td>{p.payment_method || "-"}</Td>
                <Td className="text-xs text-white/60">{p.transaction_ref || "-"}</Td>
                <Td className="text-xs text-white/60">{p.notes || "-"}</Td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-white/60 py-10">No payment records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function KpiCard({ title, value, accent }: { title: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
      <div className="text-white/60 text-xs uppercase tracking-wide mb-2">{title}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-semibold text-white">{value}</div>
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

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-white/90 ${className}`}>{children}</td>
  );
}

function formatCurrency(amount: number | null | undefined): string {
  const n = Number(amount || 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(n);
}
