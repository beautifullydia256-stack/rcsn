import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { ArrowLeft } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

const NURSERY_PRIMARY_CLASSES = [
  'Baby Class',
  'Middle Class',
  'Top Class',
  ...Array.from({ length: 7 }, (_, i) => `Primary ${i + 1}`),
];

const SECONDARY_CLASSES = Array.from({ length: 6 }, (_, i) => `Senior ${i + 1}`);

async function fetchSchoolAndFees(userId: string) {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return { schoolId: null as string | null, schoolType: null as 'Nursery/Primary' | 'Secondary' | null, feeByClass: {} as Record<string, number> };

  const [schoolRes, feeRes] = await Promise.all([
    supabase.from('schools').select('type').eq('school_id', u.school_id).single(),
    supabase.from('school_fee_structure').select('class_name, tuition_amount').eq('school_id', u.school_id),
  ]);
  const schoolType = (schoolRes.data?.type as 'Nursery/Primary' | 'Secondary') || null;
  const feeByClass: Record<string, number> = {};
  (feeRes.data || []).forEach((row: { class_name: string; tuition_amount?: number }) => {
    if (row.class_name && row.class_name !== 'ADMISSION') {
      feeByClass[row.class_name] = Number(row.tuition_amount || 0) || 0;
    }
  });
  return { schoolId: u.school_id, schoolType, feeByClass };
}

export default function AddStudentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [currentClass, setCurrentClass] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'add-student', 'school', user?.id ?? ''],
    queryFn: () => fetchSchoolAndFees(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = data?.schoolId ?? null;
  const schoolType = data?.schoolType ?? null;
  const feeByClass = data?.feeByClass ?? {};
  const classOptions = schoolType === 'Secondary' ? SECONDARY_CLASSES : NURSERY_PRIMARY_CLASSES;

  useEffect(() => {
    if (classOptions.length && !currentClass) setCurrentClass(classOptions[0]);
  }, [classOptions.length, currentClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Student name is required.');
      return;
    }
    if (!schoolId) {
      setError('School not found.');
      return;
    }
    setSubmitting(true);
    try {
      const baseFee = feeByClass[currentClass] ?? 0;
      const percent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
      const expectedFee =
        baseFee > 0
          ? Math.round(baseFee * (1 - percent / 100))
          : null;
      const { data: inserted, error: insertError } = await supabase
        .from('students')
        .insert({
          school_id: schoolId,
          name: trimmedName,
          current_class: currentClass || classOptions[0],
          status: 'active',
          ...(admissionNumber.trim() ? { admission_number: admissionNumber.trim() } : {}),
          ...(expectedFee != null && expectedFee >= 0 ? { expected_fee_amount: expectedFee } : {}),
          ...(percent > 0 ? { fee_discount_percent: percent } : {}),
        })
        .select('student_id')
        .single();
      if (insertError) throw insertError;
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });
      navigate('/dashboard/admin/students');
    } catch (err: any) {
      setError(err?.message || 'Failed to add student.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading && !data) {
    return (
      <AdminPageWrapper title="Add Student">
        <div className="flex items-center justify-center py-12 text-gray-500">Loading...</div>
      </AdminPageWrapper>
    );
  }

  if (!schoolId) {
    return (
      <AdminPageWrapper title="Add Student">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">You are not linked to a school. Please contact support.</div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper title="Add Student">
      <div className="max-w-xl space-y-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/students')}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Student name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g. John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="current_class" className="mb-1 block text-sm font-medium text-gray-700">
                Class
              </label>
              <select
                id="current_class"
                value={currentClass}
                onChange={(e) => setCurrentClass(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="admission_number" className="mb-1 block text-sm font-medium text-gray-700">
                Admission number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="admission_number"
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Leave blank to auto-generate later"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Discount / Bursary
              </label>
              <p className="mb-3 text-xs text-gray-500">
                Some students pay reduced tuition. Set the percentage discount (0 = full fee, 100 = full bursary).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[0, 10, 25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDiscountPercent(p)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      discountPercent === p
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p === 0 ? 'No discount' : p === 100 ? 'Full bursary (100%)' : `${p}%`}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label htmlFor="discount_percent" className="text-sm text-gray-600">Custom %:</label>
                <input
                  id="discount_percent"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              {(() => {
                const base = feeByClass[currentClass] ?? 0;
                const payable = base > 0 ? Math.round(base * (1 - discountPercent / 100)) : 0;
                if (base > 0) {
                  return (
                    <p className="mt-3 text-sm text-gray-700">
                      Class fee: UGX {base.toLocaleString()}
                      {discountPercent > 0 && (
                        <> → After {discountPercent}% discount: <strong>UGX {payable.toLocaleString()}</strong></>
                      )}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add Student'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/students')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminPageWrapper>
  );
}
