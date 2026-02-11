import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface StudentBalance {
  balance_id: string;
  student_id: string;
  term_id: string;
  class_id: string;
  total_fees: number;
  total_paid: number;
  balance: number;
  last_payment_date: string | null;
  students: {
    name: string;
    admission_number: string;
  };
  classes?: {
    class_name: string;
  } | null;
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
  classes?: {
    class_name: string;
  } | null;
}

interface Student {
  student_id: string;
  name: string;
  admission_number: string;
  class_id: string;
  classes?: {
    class_name: string;
  } | null;
}

interface Expense {
  expense_id: string;
  category_name: string;
  description: string;
  amount: number;
  payment_method: string;
  expense_date: string;
  reference_number: string;
  status: string;
  recorded_by: string;
  approved_by: string | null;
  approved_at: string | null;
}

interface ExpenseCategory {
  category_id: string;
  category_name: string;
  description: string;
}

export default function AccountantDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  // KPIs
  const [kpiCollectedToday, setKpiCollectedToday] = useState<number>(0);
  const [kpiCollectedThisTerm, setKpiCollectedThisTerm] = useState<number>(0);
  const [kpiOutstanding, setKpiOutstanding] = useState<number>(0);
  const [kpiOutstandingAllTime, setKpiOutstandingAllTime] = useState<number>(0);
  const [kpiDebtorsCount, setKpiDebtorsCount] = useState<number>(0);
  const [kpiExpensesThisTerm, setKpiExpensesThisTerm] = useState<number>(0);
  const [kpiNetBalance, setKpiNetBalance] = useState<number>(0);

  // Data
  const [balances, setBalances] = useState<StudentBalance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [currentTermId, setCurrentTermId] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes, setClasses] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<string>("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>("");

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("school_id, role, name, user_id")
        .eq("user_id", user.id)
        .single();
      if (!userRow?.school_id) {
        setError("School not found for user");
        return;
      }
      setSchoolId(userRow.school_id);
      setRole(userRow.role || null);
      setUserName(userRow.name || "User");
      setUserId(userRow.user_id);

      // Load school name
      const { data: schoolData } = await supabase
        .from("schools")
        .select("name")
        .eq("school_id", userRow.school_id)
        .single();
      setSchoolName(schoolData?.name || "School");

      // Role guard
      if (userRow.role !== "accountant" && userRow.role !== "admin") {
        setError("Access denied. Accountant or Admin only.");
        return;
      }

      // Get current term
      const today = new Date().toISOString().slice(0, 10);
      const { data: allTerms, error: termsError } = await supabase
        .from('school_terms')
        .select('id, start_date, end_date, year, term')
        .eq('school_id', userRow.school_id)
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      
      if (termsError) {
        console.error('Error loading terms:', termsError);
      }
      
      // Try to find current term by date range first, then fallback to most recent
      let currentTerm = (allTerms || []).find((t: any) => 
        t.start_date && t.end_date &&
        t.start_date <= today && t.end_date >= today
      );
      
      // If no current term by date, use the most recent term
      if (!currentTerm && allTerms && allTerms.length > 0) {
        currentTerm = allTerms[0];
      }

      if (currentTerm) {
        setCurrentTermId(currentTerm.id);
      } else {
        console.warn('No terms found for school:', userRow.school_id);
        // Still set a placeholder so queries don't fail
        setCurrentTermId("");
      }

      // Load students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("student_id, name, admission_number, current_class")
        .eq("school_id", userRow.school_id)
        .eq("status", "active")
        .order("name");
      
      if (studentsError) {
        console.error('Error loading students:', studentsError);
      }
      
      // Map current_class to classes.class_name for compatibility
      const mappedStudents = (studentsData || []).map(s => ({
        ...s,
        class_id: null,
        classes: s.current_class ? { class_name: s.current_class } : null
      }));
      setStudents(mappedStudents as any);

      // Load classes
      const { data: classesData } = await supabase
        .from("classes")
        .select("class_name")
        .eq("school_id", userRow.school_id)
        .order("class_name");
      const uniqueClasses = (classesData || []).map(c => c.class_name);
      setClasses(uniqueClasses);

      // Fetch student balances
      let balancesQuery = supabase
        .from("student_balances")
        .select(`
          balance_id,
          student_id,
          term_id,
          class_id,
          total_fees,
          total_paid,
          balance,
          last_payment_date,
          students!inner(name, admission_number),
          classes(class_name),
          school_terms!inner(year, term, academic_year)
        `)
        .eq("school_id", userRow.school_id);
      
      // Only filter by term if we have a current term
      if (currentTerm?.id) {
        balancesQuery = balancesQuery.eq("term_id", currentTerm.id);
      }
      
      const { data: balancesData, error: balancesError } = await balancesQuery
        .order("balance", { ascending: false });

      if (balancesError) {
        console.error('Error loading balances:', balancesError);
      }
      setBalances(balancesData as any || []);

      // Fetch payments
      let paymentsQuery = supabase
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
        .eq("school_id", userRow.school_id);
      
      // Only filter by term if we have a current term
      if (currentTerm?.id) {
        paymentsQuery = paymentsQuery.eq("term_id", currentTerm.id);
      }
      
      const { data: paymentsData, error: paymentsError } = await paymentsQuery
        .order("payment_date", { ascending: false });

      if (paymentsError) {
        console.error('Error loading payments:', paymentsError);
      }
      setPayments(paymentsData as any || []);

      // Calculate KPIs
      const todayISO = today;
      const collectedToday = (paymentsData || [])
        .filter(p => p.payment_date === todayISO)
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      setKpiCollectedToday(collectedToday);

      const collectedThisTerm = (paymentsData || [])
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      setKpiCollectedThisTerm(collectedThisTerm);

      // Current Term Outstanding: only positive balances where fees were set
      const outstanding = (balancesData || [])
        .filter((b: any) => Number(b.total_fees || 0) > 0 && Number(b.balance || 0) > 0)
        .reduce((sum, b: any) => sum + Number(b.balance || 0), 0);
      const debtors = (balancesData || [])
        .filter((b: any) => Number(b.total_fees || 0) > 0 && Number(b.balance || 0) > 0).length;
      
      setKpiOutstanding(outstanding);
      setKpiDebtorsCount(debtors);

      // Fetch ALL TIME balances (across all terms)
      const { data: allTimeBalancesData } = await supabase
        .from("student_balances")
        .select("total_fees, balance")
        .eq("school_id", userRow.school_id);
      
      const outstandingAllTime = (allTimeBalancesData || [])
        .filter((b: any) => Number(b.total_fees || 0) > 0 && Number(b.balance || 0) > 0)
        .reduce((sum, b: any) => sum + Math.max(0, Number(b.balance || 0)), 0);
      
      setKpiOutstandingAllTime(outstandingAllTime);

      // Load expense categories
      const { data: categoriesData } = await supabase
        .from("expense_categories")
        .select("category_id, category_name, description")
        .eq("school_id", userRow.school_id)
        .eq("is_active", true)
        .order("category_name");
      setExpenseCategories(categoriesData as any || []);

      // Load expenses
      let expensesQuery = supabase
        .from("school_expenses")
        .select("*")
        .eq("school_id", userRow.school_id);
      
      // Only filter by term if we have a current term
      if (currentTerm?.id) {
        expensesQuery = expensesQuery.eq("term_id", currentTerm.id);
      }
      
      const { data: expensesData, error: expensesError } = await expensesQuery
        .order("expense_date", { ascending: false });
      
      if (expensesError) {
        console.error('Error loading expenses:', expensesError);
      }
      setExpenses(expensesData as any || []);

      // Calculate expense KPIs
      const approvedExpenses = (expensesData || [])
        .filter((e: any) => e.status === 'approved' || e.status === 'paid')
        .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      setKpiExpensesThisTerm(approvedExpenses);

      // Calculate net balance (income - expenses)
      const netBalance = collectedThisTerm - approvedExpenses;
      setKpiNetBalance(netBalance);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time sync across accountants for the same school
  useEffect(() => {
    if (!schoolId) return;
    let reloadTimer: any = null;
    const scheduleReload = () => {
      if (reloadTimer) return;
      reloadTimer = setTimeout(() => {
        reloadTimer = null;
        loadData();
      }, 500);
    };

    const channel = (supabase as any)
      .channel(`accountant-sync-${schoolId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_balances', filter: `school_id=eq.${schoolId}` }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_payments', filter: `school_id=eq.${schoolId}` }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'school_expenses', filter: `school_id=eq.${schoolId}` }, scheduleReload)
      .subscribe();

    return () => {
      try { (supabase as any).removeChannel(channel); } catch {}
      if (reloadTimer) { clearTimeout(reloadTimer); reloadTimer = null; }
    };
  }, [schoolId]);

  const filteredBalances = useMemo(() => {
    const q = search.toLowerCase();
    return balances.filter(b => {
      const matchClass = selectedClass ? (b.classes?.class_name === selectedClass) : true;
      const matchSearch = !q || 
        b.students.name.toLowerCase().includes(q) || 
        (b.students.admission_number || "").toLowerCase().includes(q);
      
      let matchStatus = true;
      if (statusFilter === "fully_paid") {
        matchStatus = b.balance <= 0 && b.total_fees > 0;
      } else if (statusFilter === "partial") {
        matchStatus = b.total_paid > 0 && b.balance > 0;
      } else if (statusFilter === "not_paid") {
        matchStatus = b.total_paid === 0 && b.total_fees > 0;
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

  const filteredExpenses = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter(e => {
      const matchCategory = expenseCategoryFilter ? (e.category_name === expenseCategoryFilter) : true;
      const matchStatus = expenseStatusFilter ? (e.status === expenseStatusFilter) : true;
      const matchSearch = !q || 
        e.description.toLowerCase().includes(q) || 
        e.category_name.toLowerCase().includes(q) ||
        (e.reference_number || "").toLowerCase().includes(q);
      return matchCategory && matchStatus && matchSearch;
    });
  }, [expenses, search, expenseStatusFilter, expenseCategoryFilter]);


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
    <div className="relative">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Accountant Dashboard</h1>
        <p className="text-white/85">Manage payments, expenses, and financial records</p>
      </div>

      <div className="relative">
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <KpiCard title="Collected Today" value={formatCurrency(kpiCollectedToday)} accent="bg-emerald-500" />
          <KpiCard title="Collected This Term" value={formatCurrency(kpiCollectedThisTerm)} accent="bg-blue-500" />
          <KpiCard title="Expenses This Term" value={formatCurrency(kpiExpensesThisTerm)} accent="bg-red-500" />
          <KpiCard title="Net Balance (Income - Expenses)" value={formatCurrency(kpiNetBalance)} accent={kpiNetBalance >= 0 ? "bg-emerald-500" : "bg-red-500"} />
        </motion.div>

        {/* Secondary KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <KpiCard title="Outstanding This Term" value={formatCurrency(kpiOutstanding)} accent="bg-orange-500" />
          <KpiCard title="Outstanding All Time" value={formatCurrency(kpiOutstandingAllTime)} accent="bg-rose-500" />
          <KpiCard title="Students with Balances" value={String(kpiDebtorsCount)} accent="bg-purple-500" />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard/accountant/payments')}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6 text-left hover:bg-white/15 transition-colors"
          >
            <div className="text-2xl mb-2">💳</div>
            <div className="text-white font-semibold mb-1">Payments</div>
            <div className="text-white/60 text-sm">View and record payments</div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard/accountant/expenses')}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6 text-left hover:bg-white/15 transition-colors"
          >
            <div className="text-2xl mb-2">💸</div>
            <div className="text-white font-semibold mb-1">Expenses</div>
            <div className="text-white/60 text-sm">Track school expenses</div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard/accountant/balances')}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6 text-left hover:bg-white/15 transition-colors"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="text-white font-semibold mb-1">Balances</div>
            <div className="text-white/60 text-sm">View student balances</div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard/accountant/reports')}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6 text-left hover:bg-white/15 transition-colors"
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="text-white font-semibold mb-1">Reports</div>
            <div className="text-white/60 text-sm">Generate reports</div>
          </motion.button>
        </motion.div>

        {/* Recent Activity Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
        >
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6">
            <h3 className="text-white font-semibold mb-4">Recent Payments</h3>
            {payments.slice(0, 5).length === 0 ? (
              <p className="text-white/60 text-sm">No recent payments</p>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.payment_id} className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <div className="text-white text-sm font-medium">{payment.students.name}</div>
                      <div className="text-white/60 text-xs">{new Date(payment.payment_date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-white font-medium">
                      {formatCurrency(payment.amount_paid)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate('/dashboard/accountant/payments')}
              className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              View All Payments →
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6">
            <h3 className="text-white font-semibold mb-4">Recent Expenses</h3>
            {expenses.slice(0, 5).length === 0 ? (
              <p className="text-white/60 text-sm">No recent expenses</p>
            ) : (
              <div className="space-y-3">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.expense_id} className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <div className="text-white text-sm font-medium">{expense.description}</div>
                      <div className="text-white/60 text-xs">{expense.category_name} • {new Date(expense.expense_date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-white font-medium">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate('/dashboard/accountant/expenses')}
              className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              View All Expenses →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
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

function formatCurrency(amount: number | null | undefined): string {
  const n = Number(amount || 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(n);
}
