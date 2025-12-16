'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Receipt, Download } from 'lucide-react';

interface Payment {
  payment_id: string;
  student_id: string;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  transaction_ref: string;
  students: {
    name: string;
    admission_number: string;
  };
  classes?: {
    class_name: string;
  } | null;
}

export default function ReceiptsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [currentTermId, setCurrentTermId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: userRow } = await supabase
          .from('users')
          .select('school_id, role')
          .eq('user_id', user.id)
          .single();

        if (!userRow?.school_id) {
          setError('School not found for user');
          return;
        }

        setSchoolId(userRow.school_id);

        if (userRow.role !== 'accountant' && userRow.role !== 'admin') {
          setError('Access denied. Accountant or Admin only.');
          return;
        }

        // Get current term
        const today = new Date().toISOString().slice(0, 10);
        const { data: allTerms } = await supabase
          .from('school_terms')
          .select('id, start_date, end_date')
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

        // Load payments
        let paymentsQuery = supabase
          .from('student_payments')
          .select(`
            payment_id,
            student_id,
            amount_paid,
            payment_method,
            payment_date,
            transaction_ref,
            students!inner(name, admission_number),
            classes(class_name)
          `)
          .eq('school_id', userRow.school_id);

        if (currentTerm?.id) {
          paymentsQuery = paymentsQuery.eq('term_id', currentTerm.id);
        }

        const { data: paymentsData } = await paymentsQuery
          .order('payment_date', { ascending: false });

        setPayments(paymentsData as any || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const generateReceipt = (paymentId: string) => {
    const q = new URLSearchParams();
    q.set('payment_id', paymentId);
    window.open(`/api/accountant/receipt.pdf?${q.toString()}`, '_blank');
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Receipts</h1>
        <p className="text-white/85">Generate and download payment receipts</p>
      </div>

      {/* Payments List */}
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
                <th className="text-center font-medium px-4 py-3 text-white/90">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/60">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.payment_id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white/90">{new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-white/90">{payment.students.name}</td>
                    <td className="px-4 py-3 text-white/90">{payment.students.admission_number || '-'}</td>
                    <td className="px-4 py-3 text-white/90">{payment.classes?.class_name || '-'}</td>
                    <td className="px-4 py-3 text-right text-white/90 font-medium">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(payment.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-white/90 capitalize">{payment.payment_method}</td>
                    <td className="px-4 py-3 text-white/90 text-sm">{payment.transaction_ref || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => generateReceipt(payment.payment_id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition-colors"
                      >
                        <Receipt className="w-4 h-4" />
                        Generate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


