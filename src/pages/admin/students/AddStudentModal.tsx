import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import NativeModal from '@/components/NativeModal';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { ensureParentLinkForStudent } from '@/lib/ensureParentLink';
import { isValidRealEmail } from '@/lib/realEmail';

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

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddStudentModal({ open, onClose }: AddStudentModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [currentClass, setCurrentClass] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'add-student', 'school', user?.id ?? ''],
    queryFn: () => fetchSchoolAndFees(user!.id),
    enabled: !!user?.id && open,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = data?.schoolId ?? null;
  const schoolType = data?.schoolType ?? null;
  const feeByClass = data?.feeByClass ?? {};
  const classOptions = schoolType === 'Secondary' ? SECONDARY_CLASSES : NURSERY_PRIMARY_CLASSES;

  useEffect(() => {
    if (classOptions.length && !currentClass) setCurrentClass(classOptions[0]);
  }, [classOptions.length, currentClass]);

  useEffect(() => {
    if (open) {
      setName('');
      setStudentEmail('');
      setCurrentClass(classOptions[0] || '');
      setAdmissionNumber('');
      setDiscountPercent(0);
      setShowAdvanced(false);
      setGuardianName('');
      setGuardianPhone('');
      setGuardianEmail('');
      setError(null);
    }
  }, [open, classOptions.length, classOptions[0]]);

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
    const trimEmail = studentEmail.trim();
    if (!trimEmail || !isValidRealEmail(trimEmail)) {
      setError('Enter a valid real email address for the student.');
      return;
    }
    if (guardianName.trim()) {
      const ge = guardianEmail.trim();
      if (!ge || !isValidRealEmail(ge)) {
        setError('When a guardian name is provided, enter a valid real parent email.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const baseFee = feeByClass[currentClass] ?? 0;
      const percent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
      const expectedFee =
        baseFee > 0 ? Math.round(baseFee * (1 - percent / 100)) : null;

      const { data: inserted, error: insertError } = await supabase
        .from('students')
        .insert({
          school_id: schoolId,
          name: trimmedName,
          student_email: trimEmail,
          current_class: currentClass || classOptions[0],
          status: 'active',
          ...(admissionNumber.trim() ? { admission_number: admissionNumber.trim() } : {}),
          ...(expectedFee != null && expectedFee >= 0 ? { expected_fee_amount: expectedFee } : {}),
          ...(percent > 0 ? { fee_discount_percent: percent } : {}),
        })
        .select('student_id')
        .single();
      if (insertError) throw insertError;

      const studentId = inserted?.student_id;
      if (studentId && guardianName.trim() && schoolId) {
        const linkRes = await ensureParentLinkForStudent({
          student_id: studentId,
          school_id: schoolId,
          name: guardianName.trim(),
          email: guardianEmail.trim(),
          phone: guardianPhone.trim() || undefined,
        });
        if (!linkRes.ok) {
          throw new Error(linkRes.error || 'Could not link parent to this student.');
        }
      }

      if (studentId && profilePhoto) {
        try {
          const base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) resolve(result);
              else reject(new Error('Failed to convert file to base64'));
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(profilePhoto);
          });
          await supabase.from('student_photos').insert({
            student_id: studentId,
            school_id: schoolId,
            photo_url: base64String,
            photo_filename: profilePhoto.name,
            photo_size: profilePhoto.size,
            photo_type: profilePhoto.type,
            is_primary: true,
          });
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <NativeModal isOpen={open} onClose={onClose} title="Add Student" size="lg">
      {isLoading && !data ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : !schoolId ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You are not linked to a school. Please contact support.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-500">Enter basic information. Optionally add guardian and photo below, or use the full form for all fields.</p>
          <a
            href="/dashboard/admin/students/add"
            onClick={(e) => {
              e.preventDefault();
              onClose();
              navigate('/dashboard/admin/students/add');
            }}
            className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Add with full form (photo, guardian, fees, medical, etc.)
          </a>

          {/* Basic */}
          <div className="space-y-3">
            <div>
              <label htmlFor="modal-name" className="mb-1 block text-sm font-medium text-gray-700">
                Student name <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div>
              <label htmlFor="modal-student-email" className="mb-1 block text-sm font-medium text-gray-700">
                Student email <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Real email for invitations"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="modal-class" className="mb-1 block text-sm font-medium text-gray-700">
                Class
              </label>
              <select
                id="modal-class"
                value={currentClass}
                onChange={(e) => setCurrentClass(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="modal-admission" className="mb-1 block text-sm font-medium text-gray-700">
                Admission number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="modal-admission"
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Leave blank if not assigned yet"
              />
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
              <label className="mb-2 block text-sm font-medium text-gray-700">Discount / Bursary</label>
              <div className="flex flex-wrap gap-2">
                {[0, 10, 25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDiscountPercent(p)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      discountPercent === p ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p === 0 ? 'None' : p === 100 ? '100%' : `${p}%`}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-gray-600">Custom %:</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {(() => {
                const base = feeByClass[currentClass] ?? 0;
                const payable = base > 0 ? Math.round(base * (1 - discountPercent / 100)) : 0;
                if (base > 0) {
                  return (
                    <p className="mt-2 text-xs text-gray-600">
                      Class fee: UGX {base.toLocaleString()}
                      {discountPercent > 0 && <> → Payable: UGX {payable.toLocaleString()}</>}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Advanced information */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <span>Add advanced information (guardian, contact, etc.)</span>
              {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <p className="text-xs text-gray-500">Add parent/guardian so the student has a complete record. You can add more details later from the student profile.</p>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Guardian / Parent name</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g. 0700123456"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g. guardian@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Student photo (optional)</label>
                  <ImageUpload
                    onImageSelect={(file) => {
                      setProfilePhoto(file);
                      setUploadError(null);
                    }}
                    onError={(err) => {
                      setUploadError(err);
                      setProfilePhoto(null);
                    }}
                    maxSizeKB={500}
                    maxWidth={600}
                    maxHeight={600}
                    placeholder="Upload passport photo"
                  />
                  {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
                </div>
                <p className="text-xs text-gray-500">Address, date of birth, and other fields can be added later in the student profile.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add Student'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </NativeModal>
  );
}
