"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
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

interface Student {
  student_id: string;
  name: string;
  admission_number: string;
  class_id: string;
  classes: {
    class_name: string;
  };
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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"balances" | "payments">("balances");

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // KPIs
  const [kpiCollectedToday, setKpiCollectedToday] = useState<number>(0);
  const [kpiCollectedThisTerm, setKpiCollectedThisTerm] = useState<number>(0);
  const [kpiOutstanding, setKpiOutstanding] = useState<number>(0);
  const [kpiOutstandingAllTime, setKpiOutstandingAllTime] = useState<number>(0);
  const [kpiDebtorsCount, setKpiDebtorsCount] = useState<number>(0);

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

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
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

      // Load students
      const { data: studentsData } = await supabase
        .from("students")
        .select("student_id, name, admission_number, class_id, classes(class_name)")
        .eq("school_id", userRow.school_id)
        .eq("status", "active")
        .order("name");
      setStudents(studentsData as any || []);

      // Load classes
      const { data: classesData } = await supabase
        .from("classes")
        .select("class_name")
        .eq("school_id", userRow.school_id)
        .order("class_name");
      const uniqueClasses = (classesData || []).map(c => c.class_name);
      setClasses(uniqueClasses);

      // Fetch student balances
      const { data: balancesData } = await supabase
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
          classes!inner(class_name),
          school_terms!inner(year, term, academic_year)
        `)
        .eq("school_id", userRow.school_id)
        .eq("term_id", currentTerm?.id || "")
        .order("balance", { ascending: false });

      setBalances(balancesData as any || []);

      // Fetch payments
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
      const collectedToday = (paymentsData || [])
        .filter(p => p.payment_date === todayISO)
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      setKpiCollectedToday(collectedToday);

      const collectedThisTerm = (paymentsData || [])
        .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      setKpiCollectedThisTerm(collectedThisTerm);

      const outstanding = (balancesData || [])
        .reduce((sum, b: any) => sum + Number(b.balance || 0), 0);
      const debtors = (balancesData || [])
        .filter((b: any) => Number(b.balance || 0) > 0).length;
      
      setKpiOutstanding(outstanding);
      setKpiDebtorsCount(debtors);

      // Fetch ALL TIME balances (across all terms)
      const { data: allTimeBalancesData } = await supabase
        .from("student_balances")
        .select("balance")
        .eq("school_id", userRow.school_id);
      
      const outstandingAllTime = (allTimeBalancesData || [])
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
      const { data: expensesData } = await supabase
        .from("school_expenses")
        .select("*")
        .eq("school_id", userRow.school_id)
        .eq("term_id", currentTerm?.id || "")
        .order("expense_date", { ascending: false });
      setExpenses(expensesData as any || []);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
        >
          <KpiCard title="Collected Today" value={formatCurrency(kpiCollectedToday)} accent="bg-emerald-500" />
          <KpiCard title="Collected This Term" value={formatCurrency(kpiCollectedThisTerm)} accent="bg-blue-500" />
          <KpiCard title="Outstanding This Term" value={formatCurrency(kpiOutstanding)} accent="bg-orange-500" />
          <KpiCard title="Outstanding All Time" value={formatCurrency(kpiOutstandingAllTime)} accent="bg-rose-500" />
          <KpiCard title="Students with Balances" value={String(kpiDebtorsCount)} accent="bg-purple-500" />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center gap-3 mb-6"
        >
          <button 
            onClick={() => setShowPaymentModal(true)}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg font-medium transition-colors"
          >
            📝 Record Payment
          </button>
          <button 
            onClick={() => setShowReceiptModal(true)}
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg font-medium transition-colors"
          >
            🧾 Generate Receipt
          </button>
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg font-medium transition-colors"
          >
            💸 Record Expense
          </button>
        </motion.div>

        {/* Export PDF Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap items-center gap-3 mb-6"
        >
          <button
            onClick={() => {
              const q = new URLSearchParams();
              if (selectedClass) q.set('class', selectedClass);
              window.open(`/api/accountant/collections.pdf?${q.toString()}`, '_blank');
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
          >
            📥 Collections (PDF)
          </button>

          <button
            onClick={() => {
              const q = new URLSearchParams();
              if (selectedClass) q.set('class', selectedClass);
              window.open(`/api/accountant/balances.pdf?${q.toString()}`, '_blank');
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
          >
            📥 Balances (PDF)
          </button>

          <button
            onClick={() => {
              const q = new URLSearchParams();
              if (selectedClass) q.set('class', selectedClass);
              window.open(`/api/accountant/term-summary.pdf?${q.toString()}`, '_blank');
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
          >
            📥 Term Summary (PDF)
          </button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
          transition={{ delay: 0.4 }}
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

        {/* Content */}
        {activeTab === "balances" ? (
          <BalancesTable balances={filteredBalances} />
        ) : (
          <PaymentsTable payments={filteredPayments} />
        )}
      </div>

      {/* Modals */}
      <RecordPaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        students={students}
        schoolId={schoolId}
        termId={currentTermId}
        userId={userId}
        onSuccess={() => {
          setShowPaymentModal(false);
          loadData();
        }}
      />

      <GenerateReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        payments={payments}
        balances={balances}
      />

      <RecordExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        expenseCategories={expenseCategories}
        schoolId={schoolId}
        termId={currentTermId}
        userId={userId}
        onSuccess={() => {
          setShowExpenseModal(false);
          loadData();
        }}
      />
    </div>
  );
}

// Record Payment Modal Component
function RecordPaymentModal({ 
  isOpen, 
  onClose, 
  students, 
  schoolId, 
  termId, 
  userId,
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  students: Student[];
  schoolId: string | null;
  termId: string | null;
  userId: string;
  onSuccess: () => void;
}) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Filter students based on search
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.admission_number || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.classes?.class_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Get selected student object
  const selectedStudentObj = students.find(s => s.student_id === selectedStudent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!selectedStudent || !amount || !schoolId || !termId) {
        setError("Please fill all required fields");
        return;
      }

      const student = students.find(s => s.student_id === selectedStudent);
      
      // Auto-generate transaction reference for cash payments
      let finalTransactionRef = transactionRef;
      if (paymentMethod === 'cash' && !transactionRef) {
        // Generate cash transaction ref: CASH-YYYYMMDD-[ADMISSION]-NN
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        
        // Get student admission number or use last 4 chars of student_id
        const studentObj = students.find(s => s.student_id === selectedStudent);
        const studentRef = studentObj?.admission_number 
          ? studentObj.admission_number.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
          : ('STU' + studentObj?.student_id.slice(-4).toUpperCase());
        
        // Add random 2-digit number to avoid duplicates
        const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        finalTransactionRef = `CASH-${dateStr}-${studentRef}-${randomNum}`;
      }
      
      const { error: insertError } = await supabase
        .from("student_payments")
        .insert({
          student_id: selectedStudent,
          school_id: schoolId,
          term_id: termId,
          class_id: student?.class_id,
          amount_paid: parseFloat(amount),
          payment_method: paymentMethod,
          transaction_ref: finalTransactionRef || null,
          recorded_by: userId,
          notes: notes || null,
          payment_date: new Date().toISOString().split('T')[0]
        });

      if (insertError) throw insertError;

      // Reset form
      setSelectedStudent("");
      setStudentSearch("");
      setShowStudentDropdown(false);
      setAmount("");
      setPaymentMethod("cash");
      setTransactionRef("");
      setNotes("");
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 rounded-xl border border-white/20 p-6 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Record Payment</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-white/80 text-sm mb-2">Student *</label>
              
              {/* Selected Student Display or Search Input */}
              {selectedStudent ? (
                <div className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedStudentObj?.name}</div>
                    <div className="text-xs text-white/60">
                      {selectedStudentObj?.classes?.class_name} • {selectedStudentObj?.admission_number}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent("");
                      setStudentSearch("");
                      setShowStudentDropdown(false);
                    }}
                    className="text-white/60 hover:text-white ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    placeholder="Search by name, admission number, or class..."
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50"
                    required={!selectedStudent}
                  />
                  
                  {/* Dropdown Results */}
                  {showStudentDropdown && studentSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <button
                            key={student.student_id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent(student.student_id);
                              setStudentSearch("");
                              setShowStudentDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                          >
                            <div className="font-medium text-white">{student.name}</div>
                            <div className="text-xs text-white/60 mt-1">
                              {student.classes?.class_name} • {student.admission_number || "No admission #"}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-white/60 text-sm">
                          No students found matching "{studentSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Amount (UGX) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                placeholder="50000"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                required
              >
                <option value="cash" className="bg-slate-800">Cash</option>
                <option value="bank" className="bg-slate-800">Bank Transfer</option>
                <option value="mobile_money" className="bg-slate-800">Mobile Money</option>
                <option value="cheque" className="bg-slate-800">Cheque</option>
                <option value="other" className="bg-slate-800">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">
                Transaction Reference {paymentMethod !== 'cash' && <span className="text-red-400">*</span>}
              </label>
              {paymentMethod === 'cash' ? (
                <div className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-300 text-sm">
                  ✓ Will be auto-generated (e.g., CASH-20251009-STU001-01)
                </div>
              ) : (
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                  placeholder="MM2025001234 or Bank Ref"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
              >
                {submitting ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Generate Receipt Modal Component
function GenerateReceiptModal({ 
  isOpen, 
  onClose,
  payments,
  balances
}: { 
  isOpen: boolean; 
  onClose: () => void;
  payments: Payment[];
  balances: StudentBalance[];
}) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");

  const studentPayments = payments.filter(p => p.student_id === selectedStudent);
  const studentBalance = balances.find(b => b.student_id === selectedStudent);

  // Filter balances based on search
  const filteredBalances = balances.filter(b => 
    b.students.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (b.students.admission_number || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
    b.classes.class_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Get selected student object
  const selectedStudentObj = balances.find(b => b.student_id === selectedStudent);

  const handleGenerateReceipt = () => {
    const payment = payments.find(p => p.payment_id === selectedPaymentId);
    if (!payment) return;

    // Generate receipt content
    const receiptContent = `
========================================
           PAYMENT RECEIPT
========================================
Student: ${payment.students.name}
Admission: ${payment.students.admission_number}
Class: ${payment.classes?.class_name || "N/A"}

Payment Date: ${new Date(payment.payment_date).toLocaleDateString()}
Amount Paid: ${formatCurrency(payment.amount_paid)}
Method: ${payment.payment_method}
Transaction Ref: ${payment.transaction_ref || "N/A"}

${studentBalance ? `
Total Fees: ${formatCurrency(studentBalance.total_fees)}
Total Paid: ${formatCurrency(studentBalance.total_paid)}
Balance: ${formatCurrency(studentBalance.balance)}
` : ''}

Notes: ${payment.notes || "None"}

========================================
      Thank you for your payment!
========================================
    `.trim();

    // Download as text file
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${payment.students.name.replace(/\s+/g, '_')}_${payment.payment_date}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    // Reset and close
    setSelectedStudent("");
    setSelectedPaymentId("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 rounded-xl border border-white/20 p-6 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Generate Receipt</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-white/80 text-sm mb-2">Select Student</label>
              
              {/* Selected Student Display or Search Input */}
              {selectedStudent ? (
                <div className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedStudentObj?.students.name}</div>
                    <div className="text-xs text-white/60">
                      {selectedStudentObj?.classes.class_name} • {selectedStudentObj?.students.admission_number}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent("");
                      setStudentSearch("");
                      setShowStudentDropdown(false);
                      setSelectedPaymentId("");
                    }}
                    className="text-white/60 hover:text-white ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={studentSearch}
                onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    placeholder="Search by name, admission number, or class..."
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50"
                  />
                  
                  {/* Dropdown Results */}
                  {showStudentDropdown && studentSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredBalances.length > 0 ? (
                        filteredBalances.map((balance) => (
                          <button
                            key={balance.student_id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent(balance.student_id);
                              setStudentSearch("");
                              setShowStudentDropdown(false);
                  setSelectedPaymentId("");
                }}
                            className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                          >
                            <div className="font-medium text-white">{balance.students.name}</div>
                            <div className="text-xs text-white/60 mt-1">
                              {balance.classes.class_name} • {balance.students.admission_number || "No admission #"}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-white/60 text-sm">
                          No students found matching "{studentSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedStudent && (
              <div>
                <label className="block text-white/80 text-sm mb-2">Select Payment</label>
                <select
                  value={selectedPaymentId}
                  onChange={(e) => setSelectedPaymentId(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                >
                  <option value="" className="bg-slate-800">Choose a payment</option>
                  {studentPayments.map(p => (
                    <option key={p.payment_id} value={p.payment_id} className="bg-slate-800">
                      {new Date(p.payment_date).toLocaleDateString()} - {formatCurrency(p.amount_paid)} ({p.payment_method})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {studentBalance && selectedStudent && (
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-medium mb-2">Balance Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-white/70">
                    <span>Total Fees:</span>
                    <span>{formatCurrency(studentBalance.total_fees)}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Total Paid:</span>
                    <span>{formatCurrency(studentBalance.total_paid)}</span>
                  </div>
                  <div className="flex justify-between text-white font-medium pt-2 border-t border-white/10">
                    <span>Balance:</span>
                    <span className={studentBalance.balance > 0 ? "text-red-400" : "text-emerald-400"}>
                      {formatCurrency(studentBalance.balance)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReceipt}
                disabled={!selectedPaymentId}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Receipt
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Record Expense Modal Component
function RecordExpenseModal({ 
  isOpen, 
  onClose, 
  expenseCategories, 
  schoolId, 
  termId, 
  userId,
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  expenseCategories: ExpenseCategory[];
  schoolId: string | null;
  termId: string | null;
  userId: string;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!category || !description || !amount || !paymentMethod || !schoolId || !termId) {
        setError("Please fill all required fields");
        return;
      }

      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        setError("Please enter a valid amount");
        return;
      }

      const response = await fetch('/api/accountant/record-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: category,
          description,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          expense_date: expenseDate,
          reference_number: referenceNumber || null,
          term_id: termId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record expense');
      }

      // Reset form
      setCategory("");
      setDescription("");
      setAmount("");
      setPaymentMethod("cash");
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setReferenceNumber("");
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 rounded-xl border border-white/20 p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Record Expense</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                required
              >
                <option value="" className="bg-slate-800">Select category</option>
                {expenseCategories.map(cat => (
                  <option key={cat.category_id} value={cat.category_name} className="bg-slate-800">
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                placeholder="Brief description of the expense..."
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Amount (UGX) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                placeholder="50000"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                required
              >
                <option value="cash" className="bg-slate-800">Cash</option>
                <option value="bank" className="bg-slate-800">Bank Transfer</option>
                <option value="mobile_money" className="bg-slate-800">Mobile Money</option>
                <option value="cheque" className="bg-slate-800">Cheque</option>
                <option value="other" className="bg-slate-800">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Date *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Reference / Receipt Number</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                placeholder="Auto-generated if left empty"
              />
            </div>

            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
              <p className="text-yellow-300 text-sm">
                ⚠️ This expense will require approval from admin/head teacher before being finalized.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
              >
                {submitting ? "Recording..." : "Record Expense"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function BalancesTable({ balances }: { balances: StudentBalance[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
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
      transition={{ delay: 0.5 }}
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
