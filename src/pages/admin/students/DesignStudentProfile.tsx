import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePwezaStore } from '@/store/pwezaStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { compressStudentPhoto, validateImageFile } from '@/lib/imageCompression';
import { loadStudentBalanceAggAllTerms } from '@/lib/adminFinanceTerm';
import { downloadStudentProfilePdf } from '@/lib/adminPdfDownload';
import { generateRcsnFeeSlipPdf } from '@/lib/rcsnFeeSlipPdf';
import { useToast } from '@/components/Toast';
import StudentProfileAcademicStanding from './StudentProfileAcademicStanding';
import StudentDisciplineSection, {
  resolveDisciplineDisplayStatus,
  type DisciplineDisplayStatus,
} from '@/components/admin/students/StudentDisciplineSection';
import StudentLiabilitiesAndFacilitySection from '@/components/admin/students/StudentLiabilitiesAndFacilitySection';
import {
  ArrowLeft,
  Camera,
  Phone,
  Mail,
  GraduationCap,
  CreditCard,
  Printer,
  RefreshCw,
  Edit2,
  Check,
  X,
  User,
  Heart,
  MapPin,
  Calendar,
  FileText,
  ShieldCheck,
  Clock,
  Layers,
  BookOpen,
  DollarSign,
  UserCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import '@/styles/government-system.css';

function fmtUGX(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `UGX ${Math.round(Number(n)).toLocaleString()}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '—';
  const t = new Date(dob).getTime();
  if (Number.isNaN(t)) return '—';
  const age = Math.floor((Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} yrs`;
}

const govLabel = 'block text-[11px] font-mono font-bold text-[#555555] uppercase tracking-wider mb-1';

export default function DesignStudentProfile() {
  const { student_id: studentId } = useParams<{ student_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isTertiary } = useSchoolType();

  const authUserId = useAuthStore((s) => s.user?.id);
  const authSchoolId = useAuthStore((s) => s.schoolId);

  // Loading & Edit state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // Student DB Record
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Editable Form fields
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    nationality: 'Ugandan',
    religion: '',
    blood_group: '',
    medical_condition: '',
    allergies: '',
    admission_number: '',
    current_class: '',
    boarding_type: 'Non-Resident',
    stream: '',
    admission_date: '',
    status: 'active',
    previous_school: '',
    address: '',
    district: '',
    schoolpay_payment_code: '',
    guardian_name: '',
    guardian_relationship: 'Mother',
    guardian_phone: '',
    guardian_email: '',
    guardian_address: '',
    guardian_occupation: '',
  });

  // Ancillary records
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [attendanceToday, setAttendanceToday] = useState<{ present?: boolean; status?: string } | null>(null);
  const [attendanceAll, setAttendanceAll] = useState<{ present?: boolean; status?: string; attendance_date: string }[]>([]);
  const [feeBalance, setFeeBalance] = useState<{ total_fees: number; total_paid: number; balance: number }>({
    total_fees: 0,
    total_paid: 0,
    balance: 0,
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [olevelSubjects, setOlevelSubjects] = useState<string[]>([]);
  const [alevelSubjects, setAlevelSubjects] = useState<any[]>([]);
  const [classTeacherName, setClassTeacherName] = useState<string | null>(null);
  const [parentRecords, setParentRecords] = useState<any[]>([]);

  // Discipline metadata
  const [canManageDiscipline, setCanManageDiscipline] = useState(false);
  const [viewerIsOwner, setViewerIsOwner] = useState(false);
  const [hasWarningDiscipline, setHasWarningDiscipline] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main data fetch
  const fetchStudentDossier = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const activeSchoolId = (authSchoolId || usePwezaStore.getState().schoolId || '').trim();
      if (!activeSchoolId) return;
      setSchoolId(activeSchoolId);

      const [
        { data: st, error: stErr },
        { data: canManageRpc },
        { data: viewerRow },
        { count: warnDisciplineCount },
      ] = await Promise.all([
        supabase.from('students').select('*').eq('school_id', activeSchoolId).eq('student_id', studentId).maybeSingle(),
        supabase.rpc('current_user_can_manage_discipline'),
        supabase.from('users').select('role').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('discipline_records')
          .select('record_id', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('action_type', 'warning'),
      ]);

      if (stErr || !st) {
        toast.error('Student profile not found');
        navigate('/dashboard/admin/students');
        return;
      }

      setStudent(st);
      setCanManageDiscipline(!!canManageRpc);
      setViewerIsOwner(
        String((viewerRow as { role?: string } | null)?.role ?? '')
          .toLowerCase()
          .replace(/\s+/g, '_') === 'owner'
      );
      setHasWarningDiscipline((warnDisciplineCount ?? 0) > 0);

      // Populate form state
      setFormData({
        name: String(st.name ?? ''),
        first_name: String(st.first_name ?? ''),
        middle_name: String(st.middle_name ?? ''),
        last_name: String(st.last_name ?? ''),
        gender: String(st.gender ?? ''),
        date_of_birth: String(st.date_of_birth ?? ''),
        nationality: String(st.nationality ?? 'Ugandan'),
        religion: String(st.religion ?? ''),
        blood_group: String(st.blood_group ?? ''),
        medical_condition: String(st.medical_condition ?? ''),
        allergies: String(st.allergies ?? ''),
        admission_number: String(st.admission_number ?? ''),
        current_class: String(st.current_class ?? ''),
        boarding_type: String(st.boarding_type ?? 'Non-Resident'),
        stream: String(st.stream ?? ''),
        admission_date: String(st.admission_date ?? ''),
        status: String(st.status ?? 'active'),
        previous_school: String(st.previous_school ?? ''),
        address: String(st.address ?? ''),
        district: String(st.district ?? st.city ?? ''),
        schoolpay_payment_code: String(st.schoolpay_payment_code ?? ''),
        guardian_name: String(st.guardian_name ?? ''),
        guardian_relationship: String(st.guardian_relationship ?? 'Mother'),
        guardian_phone: String(st.guardian_phone ?? ''),
        guardian_email: String(st.guardian_email ?? ''),
        guardian_address: String(st.guardian_address ?? ''),
        guardian_occupation: String(st.guardian_occupation ?? ''),
      });

      const today = new Date().toISOString().slice(0, 10);
      const currentClass = String(st.current_class ?? '');

      // Load all ancillary modules in parallel
      const [
        parentsRes,
        photoRes,
        attendanceTodayRes,
        attendanceAllRes,
        examRes,
        subjectsRes,
        olevelRes,
        alevelRes,
        classTeacherRes,
        feeBal,
        paymentRes,
        invoicesRes,
      ] = await Promise.all([
        supabase.from('parents').select('*').eq('school_id', activeSchoolId).eq('student_id', studentId),
        supabase.from('student_photos').select('photo_url').eq('school_id', activeSchoolId).eq('student_id', studentId).eq('is_primary', true).maybeSingle(),
        supabase
          .from('student_attendance')
          .select('present, status')
          .eq('school_id', activeSchoolId)
          .eq('student_id', studentId)
          .eq('attendance_date', today)
          .maybeSingle(),
        supabase
          .from('student_attendance')
          .select('present, status, attendance_date')
          .eq('school_id', activeSchoolId)
          .eq('student_id', studentId)
          .order('attendance_date', { ascending: false }),
        supabase.from('exam_results').select('subject, marks_obtained, total_marks, grade').eq('school_id', activeSchoolId).eq('student_id', studentId).limit(50),
        currentClass
          ? supabase.from('class_subjects').select('subject, uce_offering_type').eq('school_id', activeSchoolId).eq('class_name', currentClass).order('subject')
          : Promise.resolve({ data: [], error: null }),
        supabase.from('student_olevel_subjects').select('subject_name').eq('school_id', activeSchoolId).eq('student_id', studentId),
        supabase.from('student_alevel_subjects').select('id, subject_name, subject_role').eq('school_id', activeSchoolId).eq('student_id', studentId),
        currentClass
          ? supabase.from('class_teachers').select('teacher_id, teachers!inner(name)').eq('school_id', activeSchoolId).eq('class_name', currentClass).limit(1).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        loadStudentBalanceAggAllTerms(supabase, activeSchoolId, studentId),
        supabase.from('payments').select('*').eq('school_id', activeSchoolId).eq('student_id', studentId).order('payment_date', { ascending: false }).limit(20),
        supabase.from('invoices').select('*, school_terms(year, term, end_date)').eq('school_id', activeSchoolId).eq('student_id', studentId).order('created_at', { ascending: false }).limit(20),
      ]);

      setParentRecords(parentsRes.data || []);
      setPhotoUrl(photoRes.data?.photo_url || null);
      setAttendanceToday(attendanceTodayRes.data || null);
      setAttendanceAll(attendanceAllRes.data || []);
      setExamResults(examRes.data || []);
      setClassSubjects(subjectsRes.data || []);
      setOlevelSubjects((olevelRes.data || []).map((x: any) => x.subject_name).filter(Boolean));
      setAlevelSubjects(alevelRes.data || []);
      setClassTeacherName((classTeacherRes.data as any)?.teachers?.name || null);
      setFeeBalance(feeBal || { total_fees: 0, total_paid: 0, balance: 0 });
      setPayments(paymentRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (err) {
      console.error('Failed to load student dossier:', err);
      toast.error('Failed to load student information.');
    } finally {
      setLoading(false);
    }
  }, [studentId, authSchoolId, navigate, toast]);

  useEffect(() => {
    void fetchStudentDossier();
  }, [fetchStudentDossier, reloadToken]);

  // Derived Full Name
  const fullName = useMemo(() => {
    if (!student) return 'Trainee';
    const parts = [formData.first_name, formData.middle_name, formData.last_name].filter(Boolean);
    if (parts.length) return parts.join(' ');
    return formData.name || String(student.name ?? 'Unnamed Student');
  }, [student, formData]);

  // Calculated Attendance Rate
  const attendanceRate = useMemo(() => {
    if (!attendanceAll.length) return 100;
    const presentCount = attendanceAll.filter((a) => a.present === true || a.status === 'present').length;
    return Math.round((presentCount / attendanceAll.length) * 100);
  }, [attendanceAll]);

  // Status Badge
  const registrationStatus = useMemo(() => {
    const raw = String(formData.status || student?.status || 'active').toLowerCase();
    const dStat = resolveDisciplineDisplayStatus(
      {
        deleted_at: student?.deleted_at as string | null | undefined,
        discipline_deactivated_at: student?.discipline_deactivated_at as string | null | undefined,
        suspension_open: student?.suspension_open as boolean | null | undefined,
      },
      hasWarningDiscipline
    );
    return dStat || (raw === 'active' ? 'Active' : raw.toUpperCase());
  }, [formData.status, student, hasWarningDiscipline]);

  // Save Biodata Handler
  const handleSaveBiodata = async () => {
    if (!schoolId || !studentId) return;
    setSaving(true);
    try {
      const payload = {
        name: fullName,
        first_name: formData.first_name || null,
        middle_name: formData.middle_name || null,
        last_name: formData.last_name || null,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality || null,
        religion: formData.religion || null,
        blood_group: formData.blood_group || null,
        medical_condition: formData.medical_condition || null,
        allergies: formData.allergies || null,
        admission_number: formData.admission_number || null,
        current_class: formData.current_class || null,
        boarding_type: formData.boarding_type || 'Non-Resident',
        stream: formData.stream || null,
        admission_date: formData.admission_date || null,
        status: formData.status || 'active',
        previous_school: formData.previous_school || null,
        address: formData.address || null,
        district: formData.district || null,
        city: formData.district || null,
        schoolpay_payment_code: formData.schoolpay_payment_code || null,
        guardian_name: formData.guardian_name || null,
        guardian_relationship: formData.guardian_relationship || null,
        guardian_phone: formData.guardian_phone || null,
        guardian_email: formData.guardian_email || null,
        guardian_address: formData.guardian_address || null,
        guardian_occupation: formData.guardian_occupation || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('students').update(payload).eq('school_id', schoolId).eq('student_id', studentId);
      if (error) throw error;

      if (authUserId) {
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.studentsDesign(authUserId) });
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.parentsDesign(authUserId) });
      }

      toast.success('Trainee record updated successfully.');
      setEditMode(false);
      setReloadToken((t) => t + 1);
    } catch (err: any) {
      toast.error(`Update failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Photo Upload Handler
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !schoolId || !studentId) return;

    setPhotoUploading(true);
    try {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid image file.');
        return;
      }

      const { compressedFile } = await compressStudentPhoto(file);
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsDataURL(compressedFile);
      });

      await supabase.from('student_photos').delete().eq('school_id', schoolId).eq('student_id', studentId).eq('is_primary', true);

      const { error: phErr } = await supabase.from('student_photos').insert({
        school_id: schoolId,
        student_id: studentId,
        photo_url: url,
        photo_filename: compressedFile.name,
        photo_size: compressedFile.size,
        photo_type: compressedFile.type,
        is_primary: true,
      });

      if (phErr) throw phErr;

      setPhotoUrl(url);
      toast.success('Passport photo updated.');
      if (authUserId) {
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.studentsDesign(authUserId) });
      }
    } catch (err) {
      toast.error('Could not save photo.');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // PDF Print Handler
  const handlePrintDossier = () => {
    if (!student) return;
    downloadStudentProfilePdf({
      name: fullName,
      admission_number: formData.admission_number,
      current_class: formData.current_class,
      gender: formData.gender,
      date_of_birth: formData.date_of_birth,
      age_years: student.age_years as number | null,
      nationality: formData.nationality,
      religion: formData.religion,
      address: formData.address,
      student_phone: String(student.student_phone ?? ''),
      student_email: String(student.student_email ?? ''),
      guardian_name: formData.guardian_name,
      guardian_relationship: formData.guardian_relationship,
      guardian_phone: formData.guardian_phone,
      guardian_email: formData.guardian_email,
      medical_condition: (student.medical_condition as string) ?? null,
      previous_school: formData.previous_school,
      boarding_type: formData.boarding_type,
      admission_date: formData.admission_date,
      photoUrl,
    });
  };

  // Fee Slip PDF Handler
  const handleGenerateFeeSlip = () => {
    if (!student) return;
    try {
      const doc = generateRcsnFeeSlipPdf({
        studentName: fullName,
        admissionNumber: formData.admission_number || '—',
        className: formData.current_class || 'General Nursing',
        intake: String(student.intake ?? ''),
        boardingType: formData.boarding_type || 'Boarding',
        tuitionAmount: Number(feeBalance.total_fees || 0),
        functionalItems: invoices.map((inv) => ({
          name: inv.invoice_label || inv.invoice_number || 'Tuition / Fees',
          amount: Number(inv.total_amount || 0),
        })),
        amountPaid: Number(feeBalance.total_paid || 0),
        balanceDue: Number(feeBalance.balance || 0),
      });
      const safeId = (formData.admission_number || fullName).replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`RCSN_Fee_Slip_${safeId}.pdf`);
      toast.success('Fee structure slip downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate fee slip');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-xs font-mono text-[#555555]">
        Loading trainee dossier...
      </div>
    );
  }

  // Combined Primary Guardian Info
  const primaryGuardian = parentRecords[0] || null;
  const guardianDisplayName = primaryGuardian?.name || formData.guardian_name || 'Guardian Not Recorded';
  const guardianRelation = primaryGuardian?.relationship || formData.guardian_relationship || 'Legal Guardian';
  const guardianPhone = primaryGuardian?.phone || formData.guardian_phone || '';
  const guardianEmail = primaryGuardian?.email || formData.guardian_email || '';
  const guardianOccupation = primaryGuardian?.occupation || formData.guardian_occupation || '';
  const guardianNIN = primaryGuardian?.nin || primaryGuardian?.national_id || '';
  const guardianAddress = primaryGuardian?.address || formData.guardian_address || '';

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* ── 1. TOP INSTITUTIONAL ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#CCCCCC]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="gov-btn gov-btn-sm"
            onClick={() => navigate('/dashboard/admin/students')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Student Registry</span>
          </button>
          <div className="h-4 w-px bg-[#CCCCCC]" />
          <span className="text-xs font-mono font-bold text-[#555555] uppercase tracking-wider">
            Official Trainee Dossier &amp; Ledger
          </span>
        </div>

        {/* Action Button Strip */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {editMode ? (
            <>
              <button
                type="button"
                className="gov-btn gov-btn-sm"
                onClick={() => setEditMode(false)}
                disabled={saving}
              >
                <X className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                className="gov-btn gov-btn-sm gov-btn-primary"
                onClick={handleSaveBiodata}
                disabled={saving}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving Changes…' : 'Save Changes'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="gov-btn gov-btn-sm"
                onClick={() => setEditMode(true)}
                title="Edit trainee record"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Record</span>
              </button>
              <button
                type="button"
                className="gov-btn gov-btn-sm"
                onClick={() => navigate('/dashboard/admin/cards')}
                title="Student Identity Pass"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pass / ID</span>
              </button>
              <button
                type="button"
                className="gov-btn gov-btn-sm"
                onClick={handlePrintDossier}
                title="Download official PDF dossier"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Dossier</span>
              </button>
              <button
                type="button"
                className="gov-btn gov-btn-sm"
                onClick={() => setReloadToken((t) => t + 1)}
                title="Refresh latest records"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 2. HERO SUMMARY CARD (TRAINEE IDENTITY & METRICS) ── */}
      <div className="gov-card p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: Passport Avatar & Identity */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="relative shrink-0 group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#CCCCCC] overflow-hidden bg-[#F0F2F5] flex items-center justify-center shadow-inner">
                {photoUrl ? (
                  <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-mono font-bold text-xl sm:text-2xl text-[#555555]">
                    {fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Passport Photo"
                disabled={photoUploading}
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-[#111111] uppercase tracking-wide font-sans m-0">
                  {fullName}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
                  {formData.admission_number || 'ADM: PENDING'}
                </span>
                <span className={`gov-tag text-[10px] ${registrationStatus.toLowerCase() === 'active' ? 'gov-tag-approved' : 'gov-tag-warned'}`}>
                  {registrationStatus.toUpperCase()}
                </span>
                <span className="gov-tag text-[10px] bg-slate-100 text-slate-700 border-slate-300">
                  {formData.boarding_type || 'Non-Resident'}
                </span>
              </div>

              <div className="text-xs text-[#444444] font-medium flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                <span>{formData.current_class || 'General Nursing Programme'}</span>
                {formData.stream && <span className="text-[#666666]">({formData.stream})</span>}
              </div>

              <div className="text-[11px] font-mono text-[#666666] flex items-center gap-3 flex-wrap">
                <span>Intake: {formData.admission_date ? fmtDate(formData.admission_date) : 'Current Cohort'}</span>
                {classTeacherName && (
                  <span>Tutor: <strong className="text-[#222222]">{classTeacherName}</strong></span>
                )}
                {Boolean(student?.student_phone) && (
                  <span className="flex items-center gap-1 text-[#444444]">
                    <Phone className="w-3 h-3 text-[#666666]" />
                    <a href={`tel:${String(student?.student_phone).replace(/\s+/g, '')}`} className="hover:underline">
                      {String(student?.student_phone)}
                    </a>
                  </span>
                )}
                {Boolean(student?.student_email) && (
                  <span className="flex items-center gap-1 text-[#444444]">
                    <Mail className="w-3 h-3 text-[#666666]" />
                    <a href={`mailto:${String(student?.student_email)}`} className="hover:underline">
                      {String(student?.student_email)}
                    </a>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Key 3-Stat Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-[#EAEAEA] shrink-0">
            <div className="border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 rounded-lg text-center min-w-[110px]">
              <div className="text-[10px] font-mono text-[#666666] uppercase">Attendance Rate</div>
              <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                {attendanceRate}%
              </div>
            </div>

            <div className="border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 rounded-lg text-center min-w-[120px]">
              <div className="text-[10px] font-mono text-[#666666] uppercase">Tuition Balance</div>
              <div className="text-sm font-bold font-mono text-[#111111] mt-0.5 truncate">
                {feeBalance.balance > 0 ? (
                  <span className="text-amber-700">{fmtUGX(feeBalance.balance)}</span>
                ) : (
                  <span className="text-emerald-700">CLEARED</span>
                )}
              </div>
            </div>

            <div className="border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 rounded-lg text-center col-span-2 sm:col-span-1 min-w-[110px]">
              <div className="text-[10px] font-mono text-[#666666] uppercase">SchoolPay Code</div>
              <div className="text-xs font-bold font-mono text-[#111111] mt-1 tracking-wider">
                {String(formData.schoolpay_payment_code || student?.schoolpay_code || formData.admission_number || 'RCSN-SPAY')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. TRAINEE DOSSIER SECTIONS (ALL VISIBLE AS LEDGER CARDS) ── */}
      <div className="space-y-4">
        {/* ── SECTION 1: PERSONAL BIODATA & INSTITUTIONAL REGISTRATION ── */}
        <div className="gov-card p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#CCCCCC]">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#111111]" />
              <h2 className="text-xs font-bold font-mono tracking-wider text-[#111111] uppercase m-0">
                1. Trainee Biodata &amp; Institutional Registration
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#666666]">
              {formData.nationality || 'Ugandan'} • {formData.gender || 'Student'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Column: Personal Demographics */}
            <div className="space-y-3.5">
              <div className="text-[11px] font-mono font-bold text-[#666666] uppercase pb-1 border-b border-[#EAEAEA]">
                Personal Demographics &amp; Identity
              </div>
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={govLabel}>First Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="gov-input"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs font-medium text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {formData.first_name || '—'}
                    </div>
                  )}
                </div>

                <div>
                  <label className={govLabel}>Middle Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="gov-input"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs font-medium text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {formData.middle_name || '—'}
                    </div>
                  )}
                </div>

                <div>
                  <label className={govLabel}>Surname</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="gov-input"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs font-medium text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {formData.last_name || '—'}
                    </div>
                  )}
                </div>
              </div>

              {/* Gender, DOB, Age */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={govLabel}>Gender</label>
                  {editMode ? (
                    <select
                      className="gov-select"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  ) : (
                    <div className="text-xs font-medium text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {formData.gender || '—'}
                    </div>
                  )}
                </div>

                <div>
                  <label className={govLabel}>Date of Birth</label>
                  {editMode ? (
                    <input
                      type="date"
                      className="gov-input font-mono"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {formData.date_of_birth ? fmtDate(formData.date_of_birth) : '—'}
                    </div>
                  )}
                </div>

                <div>
                  <label className={govLabel}>Age</label>
                  <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA]">
                    {calcAge(formData.date_of_birth)}
                  </div>
                </div>
              </div>

              {/* Nationality, Religion, Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={govLabel}>Nationality</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="gov-input"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs font-medium text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {formData.nationality || 'Ugandan'}
                    </div>
                  )}
                </div>

                <div>
                  <label className={govLabel}>Religion</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="gov-input"
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs font-medium text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {formData.religion || '—'}
                    </div>
                  )}
                </div>

                <div>
                  <label className={govLabel}>Blood Group</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="gov-input font-mono"
                      placeholder="e.g. O+"
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {formData.blood_group || '—'}
                    </div>
                  )}
                </div>
              </div>

              {/* Health & Medical Notes */}
              <div>
                <label className={govLabel}>Health Notes &amp; Known Conditions</label>
                {editMode ? (
                  <textarea
                    rows={2}
                    className="gov-input"
                    value={formData.medical_condition}
                    onChange={(e) => setFormData({ ...formData, medical_condition: e.target.value })}
                    placeholder="Medical observations, allergies, or physical considerations"
                  />
                ) : (
                  <div className="text-xs text-[#333333] py-1 border-b border-[#EAEAEA]">
                    {formData.medical_condition || 'No specific health notes recorded.'}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Contact, Residence & Institutional Enrollment */}
            <div className="space-y-3.5">
              <div className="text-[11px] font-mono font-bold text-[#666666] uppercase pb-1 border-b border-[#EAEAEA]">
                Contact, Residence &amp; Institutional Enrollment
              </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={govLabel}>Residential Address</label>
                    {editMode ? (
                      <input
                        type="text"
                        className="gov-input"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                        {formData.address || '—'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={govLabel}>District / Town</label>
                    {editMode ? (
                      <input
                        type="text"
                        className="gov-input"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                        {formData.district || '—'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={govLabel}>Trainee Phone</label>
                    {editMode ? (
                      <input
                        type="tel"
                        className="gov-input font-mono"
                        value={String(student?.student_phone ?? '')}
                        onChange={(e) => setStudent({ ...student, student_phone: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA]">
                        {String(student?.student_phone ?? '') ? (
                          <a href={`tel:${String(student?.student_phone)}`} className="text-emerald-700 hover:underline">
                            {String(student?.student_phone)}
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={govLabel}>Trainee Email</label>
                    {editMode ? (
                      <input
                        type="email"
                        className="gov-input font-mono"
                        value={String(student?.student_email ?? '')}
                        onChange={(e) => setStudent({ ...student, student_email: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA] truncate">
                        {String(student?.student_email ?? '') ? (
                          <a href={`mailto:${String(student?.student_email)}`} className="text-emerald-700 hover:underline">
                            {String(student?.student_email)}
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                    )}
                  </div>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={govLabel}>Current Course &amp; Stage</label>
                    {editMode ? (
                      <input
                        type="text"
                        className="gov-input"
                        value={formData.current_class}
                        onChange={(e) => setFormData({ ...formData, current_class: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs font-semibold text-[#111111] py-1 border-b border-[#EAEAEA]">
                        {formData.current_class || '—'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={govLabel}>Boarding / Residency Category</label>
                    {editMode ? (
                      <select
                        className="gov-select"
                        value={formData.boarding_type}
                        onChange={(e) => setFormData({ ...formData, boarding_type: e.target.value })}
                      >
                        <option value="Non-Resident">Non-Resident (Day Scholar)</option>
                        <option value="Resident">Resident (Hostel Boarder)</option>
                      </select>
                    ) : (
                      <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                        {formData.boarding_type || 'Non-Resident'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={govLabel}>Admission Date</label>
                    {editMode ? (
                      <input
                        type="date"
                        className="gov-input font-mono"
                        value={formData.admission_date}
                        onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA]">
                        {formData.admission_date ? fmtDate(formData.admission_date) : '—'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={govLabel}>Prior School / Institution</label>
                    {editMode ? (
                      <input
                        type="text"
                        className="gov-input"
                        value={formData.previous_school}
                        onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                        {formData.previous_school || '—'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* ── SECTION 2: GUARDIAN & SPONSOR ── */}
        <div className="gov-card p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-[#111111]" />
                <h2 className="text-xs font-bold font-mono tracking-wider text-[#111111] uppercase m-0">
                  Primary Guardian / Sponsor Profile
                </h2>
              </div>
              <span className="gov-tag text-[10px]">{guardianRelation}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-3.5">
                <div>
                  <label className={govLabel}>Full Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="gov-input"
                      value={formData.guardian_name}
                      onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm font-bold text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {guardianDisplayName}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={govLabel}>Contact Phone</label>
                    {editMode ? (
                      <input
                        type="tel"
                        className="gov-input font-mono"
                        value={formData.guardian_phone}
                        onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA]">
                        {guardianPhone ? (
                          <a href={`tel:${guardianPhone.replace(/\s+/g, '')}`} className="text-emerald-700 hover:underline">
                            {guardianPhone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={govLabel}>Email Address</label>
                    {editMode ? (
                      <input
                        type="email"
                        className="gov-input font-mono"
                        value={formData.guardian_email}
                        onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA] truncate">
                        {guardianEmail ? (
                          <a href={`mailto:${guardianEmail}`} className="text-emerald-700 hover:underline">
                            {guardianEmail}
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={govLabel}>National ID / NIN</label>
                    <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {guardianNIN || '—'}
                    </div>
                  </div>

                  <div>
                    <label className={govLabel}>Occupation / Sector</label>
                    {editMode ? (
                      <input
                        type="text"
                        className="gov-input"
                        value={formData.guardian_occupation}
                        onChange={(e) => setFormData({ ...formData, guardian_occupation: e.target.value })}
                      />
                    ) : (
                      <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                        {guardianOccupation || '—'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={govLabel}>Physical / Residential Address</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="gov-input"
                      value={formData.guardian_address}
                      onChange={(e) => setFormData({ ...formData, guardian_address: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                      {guardianAddress || '—'}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Box */}
              <div className="border border-[#CCCCCC] bg-[#FAFAFA] p-4 rounded-xl space-y-3">
                <div className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  Direct Communications &amp; Portal
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {guardianPhone && (
                    <a
                      href={`tel:${guardianPhone.replace(/\s+/g, '')}`}
                      className="gov-btn gov-btn-sm"
                      title="Make Phone Call"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Call Guardian</span>
                    </a>
                  )}
                  {guardianEmail && (
                    <a
                      href={`mailto:${guardianEmail}`}
                      className="gov-btn gov-btn-sm"
                      title="Send Official Email"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Send Email</span>
                    </a>
                  )}
                  {guardianPhone && (
                    <a
                      href={`https://wa.me/${guardianPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gov-btn gov-btn-sm"
                      title="Open WhatsApp chat"
                    >
                      <Phone className="w-3.5 h-3.5 text-teal-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                <div className="pt-3 border-t border-[#EAEAEA] text-xs text-[#555555]">
                  <div className="flex items-center justify-between">
                    <span>Parent Portal Login Status:</span>
                    <span className="gov-tag gov-tag-approved text-[10px]">
                      {primaryGuardian ? 'ACTIVE ACCOUNT' : 'UNREGISTERED PORTAL'}
                    </span>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="gov-btn gov-btn-sm w-full justify-center"
                      onClick={() => navigate('/dashboard/admin/parents')}
                    >
                      View All in Parents &amp; Sponsors Directory
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* ── SECTION 3: ACADEMIC STANDING & EXAM MARKS ── */}
        <div className="space-y-4">
          {schoolId && studentId && (
            <StudentProfileAcademicStanding
              schoolId={schoolId}
              studentId={studentId}
              currentClass={formData.current_class}
              classSubjectRows={classSubjects}
              initialOlevelNames={olevelSubjects}
              initialAlevelRows={alevelSubjects}
              onChanged={() => setReloadToken((t) => t + 1)}
            />
          )}

          {/* Continuous Assessment & Exam Marks Table */}
          <div className="gov-card p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#111111]" />
                <h2 className="text-xs font-bold font-mono tracking-wider text-[#111111] uppercase m-0">
                  Examination &amp; Continuous Assessment Marks
                </h2>
              </div>
              <span className="text-xs font-mono text-[#666666]">
                {examResults.length} {examResults.length === 1 ? 'RECORD' : 'RECORDS'}
              </span>
            </div>

            {examResults.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#666666] bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
                No examination marks recorded yet for this intake. Marks appear once continuous assessment tests or end-of-semester exams are graded.
              </div>
            ) : (
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Module / Subject</th>
                      <th>Marks Obtained</th>
                      <th>Total Marks</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map((r, i) => {
                      const mo = Number(r.marks_obtained ?? 0);
                      const tm = Number(r.total_marks ?? 100) || 100;
                      const pct = Math.round((mo / tm) * 100);
                      return (
                        <tr key={i}>
                          <td className="font-semibold text-[#111111]">{r.subject || 'Module'}</td>
                          <td className="font-mono">{mo}</td>
                          <td className="font-mono text-[#666666]">{tm}</td>
                          <td className="font-mono font-bold">
                            <span className={pct >= 75 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700'}>
                              {pct}%
                            </span>
                          </td>
                          <td>
                            <span className="gov-tag text-[10px]">{r.grade || (pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : 'F')}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 4: TUITION & FINANCIAL LEDGER ── */}
        <div className="space-y-4">
          {/* Tuition Balance Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="gov-card p-4">
              <div className="text-[10px] font-mono text-[#666666] uppercase">Total Fees Billed</div>
              <div className="text-xl font-bold font-mono text-[#111111] mt-1">
                {fmtUGX(feeBalance.total_fees)}
              </div>
            </div>

            <div className="gov-card p-4">
              <div className="text-[10px] font-mono text-[#666666] uppercase">Total Paid To Date</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {fmtUGX(feeBalance.total_paid)}
              </div>
            </div>

            <div className="gov-card p-4">
              <div className="text-[10px] font-mono text-[#666666] uppercase">Outstanding Balance</div>
              <div className="text-xl font-bold font-mono mt-1">
                {feeBalance.balance > 0 ? (
                  <span className="text-amber-700">{fmtUGX(feeBalance.balance)}</span>
                ) : (
                  <span className="text-emerald-700">CLEARED</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions: Generate Fee Slip */}
          <div className="flex items-center justify-between pb-1">
            <div className="text-xs font-bold font-mono text-[#111111] uppercase">
              Official Accounting Ledger &amp; Invoices
            </div>
            <button
              type="button"
              className="gov-btn gov-btn-sm gov-btn-primary"
              onClick={handleGenerateFeeSlip}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official RCSN Fee Slip (PDF)</span>
            </button>
          </div>

          {/* Invoices Table */}
          <div className="gov-card p-4 sm:p-5">
            <div className="text-xs font-bold font-mono text-[#111111] uppercase pb-2 mb-3 border-b border-[#EAEAEA]">
              Issued Tuition &amp; Functional Invoices
            </div>

            {invoices.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#666666] bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
                No formal invoices generated yet.
              </div>
            ) : (
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Description / Term</th>
                      <th>Issue Date</th>
                      <th>Billed Amount</th>
                      <th>Amount Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const bal = Number(inv.balance ?? 0);
                      return (
                        <tr key={inv.id || inv.invoice_number}>
                          <td className="font-mono font-bold text-xs">{inv.invoice_number || 'INV'}</td>
                          <td>{inv.invoice_label || (inv.school_terms ? `Term ${inv.school_terms.term} ${inv.school_terms.year}` : 'Tuition')}</td>
                          <td className="font-mono text-xs">{fmtDate(inv.created_at)}</td>
                          <td className="font-mono font-bold">{fmtUGX(inv.total_amount)}</td>
                          <td className="font-mono text-emerald-700">{fmtUGX(inv.amount_paid)}</td>
                          <td className="font-mono font-bold">{bal > 0 ? fmtUGX(bal) : '—'}</td>
                          <td>
                            <span className={`gov-tag ${bal <= 0 ? 'gov-tag-approved' : 'gov-tag-warned'} text-[10px]`}>
                              {bal <= 0 ? 'PAID' : 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments & Receipts Table */}
          <div className="gov-card p-4 sm:p-5">
            <div className="text-xs font-bold font-mono text-[#111111] uppercase pb-2 mb-3 border-b border-[#EAEAEA]">
              Verified Payment Receipts
            </div>

            {payments.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#666666] bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
                No verified payments on record yet.
              </div>
            ) : (
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Receipt # / Ref</th>
                      <th>Payment Channel</th>
                      <th>Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.id || i}>
                        <td className="font-mono text-xs">{fmtDate(p.payment_date || p.created_at)}</td>
                        <td className="font-mono font-bold">{p.receipt_number || p.payment_reference || 'RCP'}</td>
                        <td>{p.payment_method || 'Bank Transfer'}</td>
                        <td className="font-mono font-bold text-emerald-700">{fmtUGX(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 5: DISCIPLINE, CONDUCT & CLINICAL LIABILITIES ── */}
        <div className="space-y-4">
          {schoolId && studentId && student && (
            <StudentDisciplineSection
              schoolId={schoolId}
              studentId={studentId}
              studentSnapshot={{
                deleted_at: student.deleted_at as string | null | undefined,
                discipline_deactivated_at: student.discipline_deactivated_at as string | null | undefined,
                suspension_open: student.suspension_open as boolean | null | undefined,
                suspension_period_start: student.suspension_period_start as string | null | undefined,
                suspension_period_end: student.suspension_period_end as string | null | undefined,
              }}
              initialHasWarning={hasWarningDiscipline}
              canManageDiscipline={canManageDiscipline}
              isOwner={viewerIsOwner}
              onStudentRefresh={fetchStudentDossier}
            />
          )}

          {schoolId && studentId && (
            <StudentLiabilitiesAndFacilitySection
              schoolId={schoolId}
              studentId={studentId}
              studentName={fullName}
              admissionNumber={formData.admission_number}
              currentClass={formData.current_class}
              boardingType={formData.boarding_type}
            />
          )}
        </div>
      </div>
    </div>
  );
}
