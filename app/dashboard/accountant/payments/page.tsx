'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Plus } from 'lucide-react';

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
    current_class?: string;
  };
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

export default function PaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [currentTermId, setCurrentTermId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userRow } = await supabase
        .from('users')
        .select('school_id, role, name, user_id')
        .eq('user_id', user.id)
        .single();

      if (!userRow?.school_id) {
        setError('School not found for user');
        return;
      }

      setSchoolId(userRow.school_id);
      setUserId(userRow.user_id);

      if (userRow.role !== 'accountant' && userRow.role !== 'admin') {
        setError('Access denied. Accountant or Admin only.');
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

      let currentTerm = (allTerms || []).find((t: any) =>
        t.start_date && t.end_date &&
        t.start_date <= today && t.end_date >= today
      );

      if (!currentTerm && allTerms && allTerms.length > 0) {
        currentTerm = allTerms[0];
      }

      if (currentTerm) {
        setCurrentTermId(currentTerm.id);
      }

      // Load students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('student_id, name, admission_number, current_class')
        .eq('school_id', userRow.school_id)
        .eq('status', 'active')
        .order('name');
      
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
        .from('classes')
        .select('class_name')
        .eq('school_id', userRow.school_id)
        .order('class_name');
      const uniqueClasses = (classesData || []).map(c => c.class_name);
      setClasses(uniqueClasses);

      // Fetch payments
      let paymentsQuery = supabase
        .from('student_payments')
        .select('payment_id, student_id, amount_paid, payment_method, payment_date, transaction_ref, notes')
        .eq('school_id', userRow.school_id);

      if (currentTerm?.id) {
        paymentsQuery = paymentsQuery.eq('term_id', currentTerm.id);
      }

      const { data: paymentsData, error: paymentsError } = await paymentsQuery
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.error('Error loading payments:', paymentsError);
      }

      // Map payments with student info from already loaded students
      const paymentsWithStudents = (paymentsData || []).map(p => {
        const student = mappedStudents.find(s => s.student_id === p.student_id);
        return {
          ...p,
          students: student ? {
            name: student.name,
            admission_number: student.admission_number,
            current_class: student.classes?.class_name || ''
          } : { name: 'Unknown', admission_number: '', current_class: '' }
        };
      });

      setPayments(paymentsWithStudents as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(p => {
      const matchClass = selectedClass ? (p.students?.current_class === selectedClass) : true;
      const matchSearch = !q ||
        p.students.name.toLowerCase().includes(q) ||
        (p.students.admission_number || '').toLowerCase().includes(q) ||
        (p.transaction_ref || '').toLowerCase().includes(q);
      const matchDateFrom = !dateFrom || p.payment_date >= dateFrom;
      const matchDateTo = !dateTo || p.payment_date <= dateTo;
      const matchMethod = !paymentMethodFilter || p.payment_method === paymentMethodFilter;
      return matchClass && matchSearch && matchDateFrom && matchDateTo && matchMethod;
    });
  }, [payments, search, selectedClass, dateFrom, dateTo, paymentMethodFilter]);

  const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  const exportToCSV = () => {
    const headers = ['Date', 'Student', 'Admission Number', 'Class', 'Amount', 'Method', 'Reference', 'Notes'];
    const rows = filteredPayments.map(p => [
      p.payment_date,
      p.students.name,
      p.students.admission_number || '',
      p.students?.current_class || '',
      p.amount_paid.toString(),
      p.payment_method,
      p.transaction_ref || '',
      p.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 border-t-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-6 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Payments</h1>
            <p className="text-white/85">View and manage all payment records</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Total Payments</div>
          <div className="text-2xl font-semibold text-white">{filteredPayments.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Total Amount</div>
          <div className="text-2xl font-semibold text-white">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(totalAmount)}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Average Payment</div>
          <div className="text-2xl font-semibold text-white">
            {filteredPayments.length > 0
              ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(totalAmount / filteredPayments.length)
              : 'UGX 0'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search by name or admission number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
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
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          >
            <option value="" className="bg-slate-800">All Methods</option>
            <option value="cash" className="bg-slate-800">Cash</option>
            <option value="bank" className="bg-slate-800">Bank</option>
            <option value="mobile_money" className="bg-slate-800">Mobile Money</option>
            <option value="cheque" className="bg-slate-800">Cheque</option>
            <option value="other" className="bg-slate-800">Other</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From Date"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To Date"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left font-medium px-4 py-3 text-white/90">Date</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Student</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Admission #</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Class</th>
                <th className="text-right font-medium px-4 py-3 text-white/90">Amount</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Method</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Reference</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/60">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.payment_id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white/90">{new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-white/90">{payment.students.name}</td>
                    <td className="px-4 py-3 text-white/90">{payment.students.admission_number || '-'}</td>
                    <td className="px-4 py-3 text-white/90">{payment.students?.current_class || '-'}</td>
                    <td className="px-4 py-3 text-right text-white/90 font-medium">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(payment.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-white/90 capitalize">{payment.payment_method}</td>
                    <td className="px-4 py-3 text-white/90 text-sm">{payment.transaction_ref || '-'}</td>
                    <td className="px-4 py-3 text-white/60 text-sm">{payment.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
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
      )}
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
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filteredStudents = studentSearch.trim() === '' 
    ? students.slice(0, 20) // Show first 20 students when search is empty
    : students.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.admission_number || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.classes?.class_name || '').toLowerCase().includes(studentSearch.toLowerCase())
      );

  const selectedStudentObj = students.find(s => s.student_id === selectedStudent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!selectedStudent || !amount || !schoolId || !termId) {
        setError('Please fill all required fields');
        return;
      }

      const student = students.find(s => s.student_id === selectedStudent);

      let finalTransactionRef = transactionRef;
      if (paymentMethod === 'cash' && !transactionRef) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const studentObj = students.find(s => s.student_id === selectedStudent);
        const studentRef = studentObj?.admission_number
          ? studentObj.admission_number.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
          : ('STU' + studentObj?.student_id.slice(-4).toUpperCase());
        const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        finalTransactionRef = `CASH-${dateStr}-${studentRef}-${randomNum}`;
      }

      const { data: insertedPayment, error: insertError } = await supabase
        .from('student_payments')
        .insert({
          student_id: selectedStudent,
          school_id: schoolId,
          term_id: termId,
          amount_paid: parseFloat(amount),
          payment_method: paymentMethod,
          transaction_ref: finalTransactionRef || null,
          recorded_by: userId,
          notes: notes || null,
          payment_date: new Date().toISOString().split('T')[0]
        })
        .select('payment_id')
        .single();

      if (insertError) throw insertError;

      // Reset form
      setSelectedStudent('');
      setStudentSearch('');
      setShowStudentDropdown(false);
      setAmount('');
      setPaymentMethod('cash');
      setTransactionRef('');
      setNotes('');

      // Auto-generate receipt PDF
      if (insertedPayment?.payment_id) {
        window.open(`/api/accountant/receipt.pdf?payment_id=${insertedPayment.payment_id}`, '_blank');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
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
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 max-w-md w-full shadow-2xl"
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
                      setSelectedStudent('');
                      setStudentSearch('');
                    }}
                    className="text-white/60 hover:text-white"
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
                    placeholder="Search student..."
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
                  />
                  {showStudentDropdown && filteredStudents.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 rounded-lg border border-white/20 bg-slate-900 max-h-60 overflow-y-auto">
                      {filteredStudents.map(s => (
                        <button
                          key={s.student_id}
                          type="button"
                          onClick={() => {
                            setSelectedStudent(s.student_id);
                            setStudentSearch(s.name);
                            setShowStudentDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-white/10 text-white"
                        >
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-white/60">
                            {s.classes?.class_name} • {s.admission_number}
                          </div>
                        </button>
                      ))}
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
                placeholder="0"
                min="0"
                step="0.01"
                required
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
              >
                <option value="cash" className="bg-slate-800">Cash</option>
                <option value="bank" className="bg-slate-800">Bank</option>
                <option value="mobile_money" className="bg-slate-800">Mobile Money</option>
                <option value="cheque" className="bg-slate-800">Cheque</option>
                <option value="other" className="bg-slate-800">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Transaction Reference</label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Auto-generated for cash payments"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={3}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
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
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


