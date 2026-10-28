import { useState, type FormEvent, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  Search,
  X,
  UserCircle2,
  GraduationCap,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import {
  addParentSchoolQueryKey,
  addParentSchoolStaleOptions,
  fetchAddParentSchoolContext,
  type AddParentSchoolStudent,
} from './addParentSchoolQuery';
import { ensureParentLinkForStudent } from '@/lib/ensureParentLink';
import { isValidEmailFormat } from '@/lib/emailValidator';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import '@/styles/government-system.css';

const RELATIONSHIP_OPTIONS = [
  'Mother',
  'Father',
  'Legal Guardian',
  'Sponsor Organization / NGO',
  'Employer / Hospital Sponsor',
  'Relative / Sibling',
  'Other',
];

const govLabel = 'block text-[11px] font-mono font-bold text-[#444444] uppercase tracking-wider mb-1';

export type AddParentFormProps = {
  mode: 'page' | 'modal';
  onCompleted?: () => void;
  onCancel?: () => void;
};

export function AddParentForm({ mode, onCompleted, onCancel }: AddParentFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isTertiary } = useSchoolType();
  const user = useAuthStore((s) => s.user);

  // Form Fields
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Mother');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nin, setNin] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [portalAccess, setPortalAccess] = useState(true);

  // Student Picker
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Existing user link
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<
    { user_id: string; name: string; email: string; role: string; phone?: string }[]
  >([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [linkedFromUser, setLinkedFromUser] = useState<{ name: string; role: string } | null>(null);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{ name: string; studentName?: string } | null>(null);

  const userId = user?.id ?? '';
  const { data, isPending, isFetching } = useQuery({
    queryKey: addParentSchoolQueryKey(userId),
    queryFn: () => fetchAddParentSchoolContext(user!.id),
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    ...addParentSchoolStaleOptions,
  });

  const schoolId = data?.schoolId ?? null;
  const students = data?.students ?? [];

  const selectedStudent = useMemo(
    () => students.find((s) => s.student_id === studentId) ?? null,
    [students, studentId]
  );

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students.slice(0, 25);
    return students
      .filter((s) => {
        const hay = `${s.name} ${s.current_class} ${s.admission_number}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 25);
  }, [students, studentQuery]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = pickerRef.current;
      if (el && !el.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pickerOpen]);

  const clearStudent = () => {
    setStudentId('');
    setStudentQuery('');
    setPickerOpen(false);
  };

  const pickStudent = (s: AddParentSchoolStudent) => {
    setStudentId(s.student_id);
    const adm = s.admission_number ? ` · ${s.admission_number}` : '';
    setStudentQuery(`${s.name} (${s.current_class})${adm}`);
    setPickerOpen(false);
  };

  // Search existing user
  useEffect(() => {
    if (!schoolId || userSearchQuery.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const q = userSearchQuery.trim();
        const { data: results } = await supabase
          .from('users')
          .select('user_id, name, email, role, phone')
          .eq('school_id', schoolId)
          .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
          .neq('role', 'parent')
          .limit(5);
        setUserSearchResults(results || []);
      } catch {
        setUserSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearchQuery, schoolId]);

  const fillFromExistingUser = (u: { user_id: string; name: string; email: string; role: string; phone?: string }) => {
    setName(u.name || '');
    setEmail(u.email || '');
    if (u.phone) setPhone(u.phone);
    setLinkedFromUser({ name: u.name, role: u.role });
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const handleCancel = () => {
    if (mode === 'modal') {
      onCancel?.();
    } else {
      navigate('/dashboard/admin/parents');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimName = name.trim();
    if (!trimName) {
      setError('Guardian / Sponsor name is required.');
      return;
    }
    if (!studentId) {
      setError(`Please search and select a ${isTertiary ? 'trainee' : 'student'} to link.`);
      return;
    }
    if (!relationship.trim()) {
      setError('Please select the relationship type.');
      return;
    }
    if (!schoolId) {
      setError('You are not linked to an active institution.');
      return;
    }

    const addr = email.trim();
    if (addr && !isValidEmailFormat(addr)) {
      setError('Enter a valid email address or leave it empty.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Link parent using secure ensure-parent-link endpoint
      const linkRes = await ensureParentLinkForStudent({
        student_id: studentId,
        school_id: schoolId,
        name: trimName,
        ...(addr ? { email: addr } : {}),
        phone: phone.trim() || undefined,
        relationship: relationship.trim(),
      });

      // If backend API call returned an error, fallback to direct database insert
      if (!linkRes.ok) {
        console.warn('ensureParentLink endpoint returned non-ok, writing directly to parents table:', linkRes.error);
        const parentId = crypto.randomUUID();
        const { error: insErr } = await supabase.from('parents').insert({
          parent_id: parentId,
          school_id: schoolId,
          student_id: studentId,
          name: trimName,
          email: addr || null,
          phone: phone.trim() || null,
          relationship: relationship.trim() || null,
          occupation: occupation.trim() || null,
          address: address.trim() || null,
          nin: nin.trim() || null,
        });
        if (insErr) {
          throw new Error(insErr.message || 'Failed to save parent record.');
        }
      } else {
        // Enriched fields: update additional metadata on parents table if present
        if (occupation.trim() || address.trim() || nin.trim()) {
          void supabase
            .from('parents')
            .update({
              occupation: occupation.trim() || null,
              address: address.trim() || null,
              nin: nin.trim() || null,
            })
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .eq('name', trimName);
        }
      }

      // 2. Synchronize guardian info to student record for consistent display
      void supabase
        .from('students')
        .update({
          guardian_name: trimName,
          guardian_relationship: relationship.trim() || null,
          guardian_phone: phone.trim() || null,
          guardian_email: addr || null,
          guardian_occupation: occupation.trim() || null,
          guardian_address: address.trim() || null,
        })
        .eq('school_id', schoolId)
        .eq('student_id', studentId);

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.parentsDesign(user!.id) });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'parents', user?.id] });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.studentsDesign(user!.id, 'all') });

      setSuccessBanner({
        name: trimName,
        studentName: selectedStudent?.name,
      });

      setTimeout(() => {
        if (mode === 'modal') {
          onCompleted?.();
        } else {
          navigate('/dashboard/admin/parents');
        }
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register parent.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending && !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8 text-xs font-mono text-[#555555]">
        Loading registry database...
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="gov-card p-6 text-center text-xs font-mono text-amber-800 bg-amber-50 border-amber-300">
        You are not linked to an active school profile. Please contact institutional support.
      </div>
    );
  }

  return (
    <div className={`w-full ${mode === 'page' ? 'max-w-6xl mx-auto space-y-4' : 'space-y-4'}`}>
      {/* ── SUCCESS NOTIFICATION OVERLAY ── */}
      {successBanner && (
        <div className="fixed top-6 right-6 z-50 w-80 sm:w-96 bg-white border border-emerald-500 p-4 shadow-xl rounded-lg text-slate-900 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono font-bold text-emerald-700 uppercase">
                {isTertiary ? 'Guardian / Sponsor Registered' : 'Parent Registered Successfully'}
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate">{successBanner.name}</div>
              {successBanner.studentName && (
                <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                  Linked: {successBanner.studentName}
                </div>
              )}
              <div className="text-[10px] text-slate-400 mt-2 font-mono">
                Redirecting to Parents &amp; Sponsors Directory...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ERROR NOTIFICATION OVERLAY ── */}
      {error && (
        <div className="fixed top-6 right-6 z-50 w-80 sm:w-96 bg-white border border-rose-500 p-4 shadow-xl rounded-lg text-slate-900 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono font-bold text-rose-700 uppercase">Registration Failed</div>
              <div className="text-xs text-slate-800 mt-1 break-words">{error}</div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-2.5 px-3 py-1 bg-slate-900 text-white text-[11px] font-mono font-semibold rounded"
              >
                Dismiss &amp; Correct Fields
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP HEADER (CLEAN INSTITUTIONAL REGISTRY BAR) ── */}
      {mode === 'page' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-2 border-b border-[#CCCCCC]">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans m-0">
              {isTertiary ? 'Guardian & Sponsor Registration' : 'Parent & Guardian Registration'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCancel} className="gov-btn gov-btn-sm">
              <span>Cancel / Back</span>
            </button>
            <button
              type="submit"
              form="add-parent-form"
              disabled={submitting}
              className="gov-btn gov-btn-sm gov-btn-primary"
            >
              <span>
                {submitting
                  ? 'Registering…'
                  : isTertiary
                  ? 'Submit Sponsor Registration'
                  : 'Submit Parent Registration'}
              </span>
            </button>
          </div>
        </div>
      )}

      <form id="add-parent-form" onSubmit={handleSubmit} className="space-y-4">
        {/* ── 2-COLUMN BALANCED LEDGER LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* ── LEFT COLUMN: BIODATA & CONTACT DETAILS ── */}
          <div className="space-y-4">
            <div className="gov-card p-4 sm:p-5">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#EAEAEA]">
                <UserCircle2 className="w-4 h-4 text-[#111111]" />
                <h2 className="text-xs font-bold font-mono tracking-wider text-[#111111] uppercase m-0">
                  {isTertiary ? 'Guardian / Sponsor Information' : 'Parent Information'}
                </h2>
              </div>

              <div className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className={govLabel}>
                    Full Name / Organization <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="gov-input"
                    placeholder="e.g. Dr. Peter Ssenyonga / Mildmay Foundation"
                    required
                  />
                </div>

                {/* Relationship */}
                <div>
                  <label className={govLabel}>
                    Relationship / Role <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="gov-select"
                    required
                  >
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={govLabel}>Contact Phone</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="gov-input pl-8 font-mono"
                        placeholder="e.g. 0772 123 456"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={govLabel}>Email Address</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="gov-input pl-8 font-mono"
                        placeholder="e.g. sponsor@domain.com"
                      />
                    </div>
                  </div>
                </div>

                {/* National ID / NIN & Occupation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={govLabel}>National ID / NIN / Reg No</label>
                    <input
                      type="text"
                      value={nin}
                      onChange={(e) => setNin(e.target.value)}
                      className="gov-input font-mono"
                      placeholder="e.g. CM829104819KA"
                    />
                  </div>

                  <div>
                    <label className={govLabel}>Occupation / Sector</label>
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="gov-input"
                      placeholder="e.g. Senior Medical Officer"
                    />
                  </div>
                </div>

                {/* Residential / Physical Address */}
                <div>
                  <label className={govLabel}>Physical Address / District</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="gov-input"
                    placeholder="e.g. Rakai Town Council, Kyotera Road"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: TRAINEE ASSOCIATION & PORTAL ACCESS ── */}
          <div className="space-y-4">
            {/* Trainee Association */}
            <div className="gov-card p-4 sm:p-5">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#EAEAEA]">
                <GraduationCap className="w-4 h-4 text-[#111111]" />
                <h2 className="text-xs font-bold font-mono tracking-wider text-[#111111] uppercase m-0">
                  {isTertiary ? 'Linked Trainee Association' : 'Linked Student Association'}
                </h2>
              </div>

              <div ref={pickerRef} className="space-y-3">
                <label className={govLabel}>
                  Select {isTertiary ? 'Trainee' : 'Student'} <span className="text-rose-600">*</span>
                </label>

                {selectedStudent ? (
                  <div className="border border-[#CCCCCC] bg-[#F7F7F7] p-3 rounded-lg flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#111111] uppercase tracking-wide">
                        {selectedStudent.name}
                      </div>
                      <div className="text-xs text-[#555555] font-mono mt-0.5">
                        {selectedStudent.current_class}
                        {selectedStudent.admission_number ? ` · Adm #${selectedStudent.admission_number}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearStudent}
                      className="gov-btn gov-btn-sm"
                      title="Select different student"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Change</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      className="gov-input pl-8 font-mono text-xs"
                      placeholder={isTertiary ? 'Search active trainee by name or admission number…' : 'Search student…'}
                      value={studentQuery}
                      onChange={(e) => {
                        setStudentQuery(e.target.value);
                        setPickerOpen(true);
                      }}
                      onFocus={() => setPickerOpen(true)}
                    />
                    {pickerOpen && (
                      <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto bg-white border border-[#999999] shadow-lg rounded-md divide-y divide-[#EAEAEA]">
                        {filteredStudents.length === 0 ? (
                          <div className="p-3 text-xs text-[#666666] font-mono">
                            No matching {isTertiary ? 'trainees' : 'students'} found.
                          </div>
                        ) : (
                          filteredStudents.map((s) => (
                            <button
                              key={s.student_id}
                              type="button"
                              className="w-full text-left p-2.5 hover:bg-[#F2F4F8] transition-colors flex items-center justify-between gap-2"
                              onClick={() => pickStudent(s)}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-[#111111]">{s.name}</div>
                                <div className="text-[11px] text-[#666666] font-mono">
                                  {s.current_class}
                                  {s.admission_number ? ` · Adm #${s.admission_number}` : ''}
                                </div>
                              </div>
                              <span className="gov-tag text-[10px]">Select</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Portal & System Options */}
            <div className="gov-card p-4 sm:p-5">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#EAEAEA]">
                <ShieldCheck className="w-4 h-4 text-[#111111]" />
                <h2 className="text-xs font-bold font-mono tracking-wider text-[#111111] uppercase m-0">
                  Portal &amp; System Configuration
                </h2>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={portalAccess}
                    onChange={(e) => setPortalAccess(e.target.checked)}
                    className="rounded border-[#999999] text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-medium text-[#222222]">
                    Enable Parent / Sponsor Portal Access (Online ledger, statements, and receipts)
                  </span>
                </label>

                {/* Optional: Fast user autofill */}
                <div className="pt-2 border-t border-[#EAEAEA]">
                  <label className={govLabel}>Link Existing System User (Optional)</label>
                  {linkedFromUser ? (
                    <div className="flex items-center justify-between border border-emerald-300 bg-emerald-50 px-3 py-2 rounded text-xs text-emerald-900 font-mono">
                      <span>Autofilled from: {linkedFromUser.name} ({linkedFromUser.role})</span>
                      <button
                        type="button"
                        onClick={() => setLinkedFromUser(null)}
                        className="text-emerald-700 font-bold hover:text-emerald-900 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        className="gov-input font-mono text-xs"
                        placeholder="Search existing staff or user to copy details…"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                      />
                      {userSearchResults.length > 0 && (
                        <div className="absolute z-40 mt-1 max-h-40 w-full overflow-y-auto bg-white border border-[#999999] shadow-lg rounded-md divide-y divide-[#EAEAEA]">
                          {userSearchResults.map((u) => (
                            <button
                              key={u.user_id}
                              type="button"
                              className="w-full text-left p-2 hover:bg-[#F2F4F8] text-xs"
                              onClick={() => fillFromExistingUser(u)}
                            >
                              <span className="font-semibold">{u.name}</span> —{' '}
                              <span className="text-[#666666] font-mono">{u.email} ({u.role})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ACTIONS (FOR BOTH PAGE & MODAL MODES) ── */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#CCCCCC]">
          <button type="button" onClick={handleCancel} className="gov-btn gov-btn-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (isFetching && !data)}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            {submitting
              ? 'Registering…'
              : isTertiary
              ? 'Register Guardian / Sponsor'
              : 'Register Parent'}
          </button>
        </div>
      </form>
    </div>
  );
}
