"use client";

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/Toast';
import { downloadParentProfilePdf, type ParentProfilePdfData } from '@/lib/adminPdfDownload';
import { loadStudentBalanceAggAllTerms } from '@/lib/adminFinanceTerm';
import UserRolesSection from '@/components/admin/UserRolesSection';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  GraduationCap,
  Check,
  X,
  Edit2,
  Printer,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import '@/styles/government-system.css';

interface LinkedStudent {
  student_id: string;
  name: string;
  current_class: string | null;
  admission_number: string | null;
  boarding_type: string | null;
  status: string | null;
  balance: number;
}

interface PaymentRow {
  payment_date: string | null;
  amount_paid: number;
  payment_method: string | null;
  student_name: string;
}

export default function DesignParentProfile() {
  const navigate = useNavigate();
  const toast = useToast();
  const { parent_id: parentIdParam } = useParams<{ parent_id: string }>();
  const parentId = parentIdParam || '';
  const authSchoolId = useAuthStore((s) => s.schoolId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [hasPortalAccount, setHasPortalAccount] = useState(false);
  const [childrenList, setChildrenList] = useState<LinkedStudent[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentRow[]>([]);
  const [totalBilled, setTotalBilled] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Guardian',
    gender: '',
    phone: '',
    email: '',
    occupation: '',
    address: '',
    nin: '',
    nationality: 'Ugandan',
    religion: '',
  });

  const [contextStudentIds, setContextStudentIds] = useState<string[]>([]);
  const [parentRecordId, setParentRecordId] = useState<string | null>(null);

  const initials = (nameStr: string) => {
    return (nameStr || '?')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const fmtDate = (d?: string | null) => {
    if (!d) return '—';
    try {
      const x = new Date(d);
      return isNaN(x.getTime())
        ? '—'
        : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const fmtUGX = (num?: number | null) => {
    if (num == null || isNaN(num)) return 'UGX 0';
    return `UGX ${Math.round(num).toLocaleString('en-US')}`;
  };

  // Load Parent & Associated Wards
  const loadProfile = useCallback(async () => {
    if (!parentId) return;
    setLoading(true);

    try {
      let activeSchoolId = authSchoolId;
      if (!activeSchoolId) {
        const { data: sch } = await supabase.from('schools').select('id').limit(1).maybeSingle();
        activeSchoolId = sch?.id;
      }
      if (!activeSchoolId) return;

      // 1. Fetch from parents table or users table
      let [{ data: parentRows }, { data: parentUser }] = await Promise.all([
        supabase.from('parents').select('*').eq('school_id', activeSchoolId).eq('parent_id', parentId),
        supabase.from('users').select('*').eq('user_id', parentId).eq('school_id', activeSchoolId).maybeSingle(),
      ]);

      let studentIds = [
        ...new Set((parentRows || []).map((r) => (r as { student_id?: string }).student_id).filter(Boolean)),
      ] as string[];

      // Fallback: If derived from student's guardian columns (e.g. guardian_xxx)
      if ((!parentRows || parentRows.length === 0) && !parentUser) {
        const sid = parentId.startsWith('guardian_') ? parentId.replace('guardian_', '') : parentId;
        const { data: st } = await supabase
          .from('students')
          .select('student_id, name, first_name, middle_name, last_name, current_class, admission_number, guardian_name, guardian_relationship, guardian_phone, guardian_email, guardian_occupation, guardian_address, created_at')
          .eq('school_id', activeSchoolId)
          .eq('student_id', sid)
          .maybeSingle();

        if (st && (st.guardian_name || st.guardian_phone || st.guardian_email)) {
          parentRows = [
            {
              parent_id: parentId,
              school_id: activeSchoolId,
              student_id: sid,
              name: st.guardian_name || 'Guardian',
              relationship: st.guardian_relationship || 'Guardian',
              phone: st.guardian_phone || null,
              email: st.guardian_email || null,
              occupation: st.guardian_occupation || null,
              address: st.guardian_address || null,
              created_at: st.created_at || null,
              is_primary_contact: true,
            },
          ];
          studentIds = [sid];
        }
      }

      setContextStudentIds(studentIds);
      setHasPortalAccount(!!parentUser);

      const primary =
        (parentRows || []).find((r: { is_primary_contact?: boolean }) => r.is_primary_contact === true) ||
        (parentRows || [])[0];

      if (primary?.id) setParentRecordId(primary.id);

      const pr = primary as Record<string, unknown> | undefined;
      const pu = parentUser as Record<string, unknown> | null;

      const resolvedName =
        (pr?.name ? String(pr.name).trim() : null) ||
        (pu?.name ? String(pu.name).trim() : null) ||
        (pu?.email ? String(pu.email).trim() : null) ||
        'Guardian Profile';

      setFormData({
        name: resolvedName,
        relationship: String(pr?.relationship ?? 'Guardian'),
        gender: String(pr?.gender ?? ''),
        phone: String(pr?.phone ?? pu?.phone ?? ''),
        email: String(pr?.email ?? pu?.email ?? ''),
        occupation: String(pr?.occupation ?? ''),
        address: String(pr?.address ?? ''),
        nin: String(pr?.nin ?? pr?.national_id ?? ''),
        nationality: String(pr?.nationality ?? 'Ugandan'),
        religion: String(pr?.religion ?? ''),
      });

      // 2. Fetch Linked Students & Balances
      if (studentIds.length > 0) {
        const { data: studs } = await supabase
          .from('students')
          .select('student_id, name, first_name, middle_name, last_name, current_class, admission_number, boarding_type, status')
          .eq('school_id', activeSchoolId)
          .in('student_id', studentIds);

        let sumBilled = 0;
        let sumPaid = 0;
        let sumBal = 0;
        const linked: LinkedStudent[] = [];

        for (const st of studs || []) {
          const parts = [st.first_name, st.middle_name, st.last_name]
            .filter((x) => x != null && String(x).trim())
            .map((x) => String(x).trim());
          const sName = parts.length > 0 ? parts.join(' ') : (st.name || 'Trainee');

          // Load aggregate fee balance for this student
          let bTotal = 0;
          let bPaid = 0;
          let bBal = 0;
          try {
            const agg = await loadStudentBalanceAggAllTerms(supabase, activeSchoolId, st.student_id);
            bTotal = agg.total_fees;
            bPaid = agg.total_paid;
            bBal = agg.balance;
          } catch {
            // fallback
          }

          sumBilled += bTotal;
          sumPaid += bPaid;
          sumBal += bBal;

          linked.push({
            student_id: st.student_id,
            name: sName,
            current_class: st.current_class,
            admission_number: st.admission_number,
            boarding_type: st.boarding_type,
            status: st.status,
            balance: bBal,
          });
        }

        setChildrenList(linked);
        setTotalBilled(sumBilled);
        setTotalPaid(sumPaid);
        setTotalBalance(sumBal);

        // 3. Fetch Verified Payment Receipts for linked students
        const { data: pays } = await supabase
          .from('student_payments')
          .select('amount_paid, payment_method, payment_date, student_id')
          .eq('school_id', activeSchoolId)
          .in('student_id', studentIds)
          .order('payment_date', { ascending: false })
          .limit(20);

        const nameMap: Record<string, string> = {};
        linked.forEach((l) => {
          nameMap[l.student_id] = l.name;
        });

        const pList: PaymentRow[] = (pays || []).map((p) => ({
          payment_date: p.payment_date,
          amount_paid: Number(p.amount_paid || 0),
          payment_method: p.payment_method,
          student_name: nameMap[p.student_id] || 'Trainee',
        }));

        setPaymentsList(pList);
      } else {
        setChildrenList([]);
        setPaymentsList([]);
        setTotalBilled(0);
        setTotalPaid(0);
        setTotalBalance(0);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load guardian record');
    } finally {
      setLoading(false);
    }
  }, [parentId, authSchoolId, reloadToken, toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Save Changes Handler
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Guardian name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const activeSchoolId = authSchoolId || (await supabase.from('schools').select('id').limit(1).maybeSingle()).data?.id;
      if (!activeSchoolId) throw new Error('Active school not identified');

      // 1. Update in parents table
      await supabase
        .from('parents')
        .update({
          name: formData.name.trim(),
          relationship: formData.relationship || 'Guardian',
          gender: formData.gender || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          occupation: formData.occupation.trim() || null,
          address: formData.address.trim() || null,
          nin: formData.nin.trim() || null,
          nationality: formData.nationality.trim() || 'Ugandan',
          religion: formData.religion.trim() || null,
        })
        .eq('school_id', activeSchoolId)
        .eq('parent_id', parentId);

      // 2. Synchronize to linked students
      if (contextStudentIds.length > 0) {
        await supabase
          .from('students')
          .update({
            guardian_name: formData.name.trim(),
            guardian_relationship: formData.relationship || 'Guardian',
            guardian_phone: formData.phone.trim() || null,
            guardian_email: formData.email.trim() || null,
            guardian_occupation: formData.occupation.trim() || null,
            guardian_address: formData.address.trim() || null,
          })
          .eq('school_id', activeSchoolId)
          .in('student_id', contextStudentIds);
      }

      // 3. Update in users table if portal account exists
      if (hasPortalAccount) {
        await supabase
          .from('users')
          .update({
            name: formData.name.trim(),
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
          })
          .eq('user_id', parentId)
          .eq('school_id', activeSchoolId);
      }

      toast.success('Guardian record updated successfully.');
      setEditMode(false);
      setReloadToken((t) => t + 1);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // PDF Dossier Export
  const handlePrintDossier = () => {
    const pdfData: ParentProfilePdfData = {
      name: formData.name,
      relationship: formData.relationship,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      occupation: formData.occupation,
      children: childrenList.map((ch) => ({
        student_id: ch.student_id,
        name: ch.name,
        current_class: ch.current_class,
        admission_number: ch.admission_number,
      })),
    };
    void downloadParentProfilePdf(pdfData);
  };

  const govLabel = 'block text-[11px] font-mono font-bold text-[#555555] uppercase tracking-wider mb-1';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center space-y-3 font-mono text-xs text-[#666666]">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#111111]" />
        <div>Loading guardian dossier and financial records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* ── 1. TOP ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#CCCCCC]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="gov-btn gov-btn-sm"
            onClick={() => navigate('/dashboard/admin/parents')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Parents &amp; Sponsors Directory</span>
          </button>
          <div className="h-4 w-px bg-[#CCCCCC]" />
          <span className="text-xs font-mono font-bold text-[#555555] uppercase tracking-wider">
            Official Parent / Guardian Dossier
          </span>
        </div>

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
                onClick={handleSave}
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
                title="Edit guardian record"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Record</span>
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

      {/* ── 2. HERO SUMMARY CARD (GUARDIAN IDENTITY & FINANCIAL SUMMARY) ── */}
      <div className="gov-card p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: Circular Initials Avatar & Primary Identity */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#CCCCCC] overflow-hidden bg-[#F0F2F5] flex items-center justify-center shadow-inner">
                <span className="font-mono font-bold text-xl sm:text-2xl text-[#555555]">
                  {initials(formData.name)}
                </span>
              </div>
              {/* Note: No photo upload capability for parents as instructed */}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-[#111111] uppercase tracking-wide font-sans m-0">
                  {formData.name || 'Guardian Profile'}
                </h1>
                <span className="gov-tag text-[10px]">
                  {(formData.relationship || 'Guardian').toUpperCase()}
                </span>
                <span className={`gov-tag text-[10px] ${hasPortalAccount ? 'gov-tag-approved' : 'gov-tag-warned'}`}>
                  {hasPortalAccount ? 'ACTIVE PORTAL' : 'UNREGISTERED'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#555555] flex-wrap font-mono pt-0.5">
                {formData.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#777777]" />
                    {formData.phone}
                  </span>
                )}
                {formData.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#777777]" />
                    {formData.email}
                  </span>
                )}
                {formData.occupation && (
                  <span className="text-[#666666]">
                    • {formData.occupation}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Summary Metric Boxes */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            <div className="px-3.5 py-2.5 border border-[#CCCCCC] bg-[#FAFAFA] rounded-lg text-center min-w-[95px]">
              <div className="text-[10px] font-mono text-[#666666] uppercase">LINKED WARDS</div>
              <div className="text-sm font-bold font-mono text-[#111111] mt-1">
                {childrenList.length} {childrenList.length === 1 ? 'Student' : 'Students'}
              </div>
            </div>

            <div className="px-3.5 py-2.5 border border-[#CCCCCC] bg-[#FAFAFA] rounded-lg text-center min-w-[105px]">
              <div className="text-[10px] font-mono text-[#666666] uppercase">TOTAL BILLED</div>
              <div className="text-sm font-bold font-mono text-[#111111] mt-1">
                {fmtUGX(totalBilled)}
              </div>
            </div>

            <div className="px-3.5 py-2.5 border border-[#CCCCCC] bg-[#FAFAFA] rounded-lg text-center min-w-[105px]">
              <div className="text-[10px] font-mono text-[#666666] uppercase">TOTAL PAID</div>
              <div className="text-sm font-bold font-mono text-emerald-700 mt-1">
                {fmtUGX(totalPaid)}
              </div>
            </div>

            <div className="px-3.5 py-2.5 border border-[#CCCCCC] bg-[#FAFAFA] rounded-lg text-center min-w-[105px]">
              <div className="text-[10px] font-mono text-[#666666] uppercase">BALANCE DUE</div>
              <div className="text-sm font-bold font-mono mt-1">
                {totalBalance > 0 ? (
                  <span className="text-amber-700">{fmtUGX(totalBalance)}</span>
                ) : (
                  <span className="text-emerald-700">CLEARED</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. SECTION 1: PERSONAL DEMOGRAPHICS & CONTACT INFORMATION ── */}
      <div className="gov-card p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#CCCCCC]">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#111111]" />
            <h2 className="text-xs font-bold font-mono tracking-wider text-[#111111] uppercase m-0">
              1. Guardian &amp; Sponsor Demographics
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#666666]">
            {formData.nationality || 'Ugandan'} • {formData.relationship || 'Guardian'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Personal Demographics & Identity */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-mono font-bold text-[#666666] uppercase pb-1 border-b border-[#EAEAEA]">
              Personal Demographics &amp; Identity
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={govLabel}>Full Name / Title</label>
                {editMode ? (
                  <input
                    type="text"
                    className="gov-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <div className="text-xs font-medium text-[#111111] py-1 border-b border-[#EAEAEA]">
                    {formData.name || '—'}
                  </div>
                )}
              </div>

              <div>
                <label className={govLabel}>Relationship to Trainee</label>
                {editMode ? (
                  <select
                    className="gov-select"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Sponsor">Sponsor</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <div className="text-xs font-medium text-[#111111] py-1 border-b border-[#EAEAEA]">
                    {formData.relationship || 'Guardian'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={govLabel}>Gender</label>
                {editMode ? (
                  <select
                    className="gov-select"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                ) : (
                  <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                    {formData.gender || '—'}
                  </div>
                )}
              </div>

              <div>
                <label className={govLabel}>National ID / NIN</label>
                {editMode ? (
                  <input
                    type="text"
                    className="gov-input font-mono"
                    value={formData.nin}
                    onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
                  />
                ) : (
                  <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA]">
                    {formData.nin || '—'}
                  </div>
                )}
              </div>

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
                  <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                    {formData.nationality || 'Ugandan'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={govLabel}>Occupation / Employment Sector</label>
                {editMode ? (
                  <input
                    type="text"
                    className="gov-input"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  />
                ) : (
                  <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                    {formData.occupation || '—'}
                  </div>
                )}
              </div>

              <div>
                <label className={govLabel}>Religion / Faith</label>
                {editMode ? (
                  <input
                    type="text"
                    className="gov-input"
                    value={formData.religion}
                    onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                  />
                ) : (
                  <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                    {formData.religion || '—'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Contact Channels & Residential Location */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-mono font-bold text-[#666666] uppercase pb-1 border-b border-[#EAEAEA]">
              Contact Channels &amp; Residential Location
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={govLabel}>Primary Phone</label>
                {editMode ? (
                  <input
                    type="tel"
                    className="gov-input font-mono"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                ) : (
                  <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA]">
                    {formData.phone ? (
                      <a href={`tel:${formData.phone}`} className="text-emerald-700 hover:underline">
                        {formData.phone}
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
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <div className="text-xs font-mono text-[#111111] py-1 border-b border-[#EAEAEA] truncate">
                    {formData.email ? (
                      <a href={`mailto:${formData.email}`} className="text-emerald-700 hover:underline">
                        {formData.email}
                      </a>
                    ) : (
                      '—'
                    )}
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
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              ) : (
                <div className="text-xs text-[#111111] py-1 border-b border-[#EAEAEA]">
                  {formData.address || '—'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. SECTION 2: ASSOCIATED STUDENTS & SPONSORED TRAINEES ── */}
      <div className="gov-card p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#CCCCCC]">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#111111]" />
            <h2 className="text-xs font-bold font-mono tracking-wider text-[#111111] uppercase m-0">
              2. Associated Students &amp; Sponsored Trainees ({childrenList.length})
            </h2>
          </div>
          <button
            type="button"
            className="gov-btn gov-btn-sm"
            onClick={() => navigate('/dashboard/admin/students')}
          >
            <span>View Full Registry</span>
          </button>
        </div>

        {childrenList.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-[#666666] bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
            No student records currently associated with this guardian profile.
          </div>
        ) : (
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Trainee Name</th>
                  <th>Admission #</th>
                  <th>Program &amp; Stage</th>
                  <th>Residency</th>
                  <th>Tuition Balance</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {childrenList.map((ch) => (
                  <tr key={ch.student_id}>
                    <td className="font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#EAEAEA] border border-[#CCCCCC] flex items-center justify-center font-mono text-[10px] font-bold text-[#555555]">
                          {initials(ch.name)}
                        </div>
                        <span>{ch.name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs font-bold">{ch.admission_number || '—'}</td>
                    <td className="text-xs">{ch.current_class || '—'}</td>
                    <td>
                      <span className={`gov-tag text-[10px] ${ch.boarding_type?.toLowerCase().includes('res') ? 'gov-tag-approved' : ''}`}>
                        {ch.boarding_type || 'Non-Resident'}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-xs">
                      {ch.balance > 0 ? (
                        <span className="text-amber-700">{fmtUGX(ch.balance)}</span>
                      ) : (
                        <span className="text-emerald-700">PAID</span>
                      )}
                    </td>
                    <td>
                      <span className={`gov-tag text-[10px] ${ch.status?.toLowerCase() === 'active' ? 'gov-tag-approved' : 'gov-tag-warned'}`}>
                        {(ch.status || 'Active').toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="gov-btn gov-btn-sm"
                        onClick={() => navigate(`/dashboard/admin/students/${ch.student_id}`)}
                      >
                        <span>View Dossier →</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. SECTION 3: VERIFIED TUITION & FEE RECEIPTS ── */}
      <div className="gov-card p-4 sm:p-5">
        <div className="text-xs font-bold font-mono text-[#111111] uppercase pb-2 mb-3 border-b border-[#EAEAEA]">
          3. Verified Tuition &amp; Fee Receipts
        </div>
        {paymentsList.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-[#666666] bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
            No verified payment receipts found for associated wards.
          </div>
        ) : (
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Payment Channel</th>
                  <th>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {paymentsList.map((p, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-xs">{fmtDate(p.payment_date)}</td>
                    <td className="font-semibold">{p.student_name || 'Trainee'}</td>
                    <td>{p.payment_method || 'Bank Transfer'}</td>
                    <td className="font-mono font-bold text-emerald-700">{fmtUGX(p.amount_paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 6. SECTION 4: DIRECT COMMUNICATIONS & PORTAL ACCESS ── */}
      <div className="gov-card p-4 sm:p-5">
        <div className="text-xs font-bold font-mono text-[#111111] uppercase pb-2 mb-3 border-b border-[#EAEAEA]">
          4. Direct Communications &amp; Portal Account
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quick Action Channels */}
          <div className="border border-[#CCCCCC] bg-[#FAFAFA] p-4 rounded-xl space-y-3">
            <div className="text-xs font-bold text-[#111111] uppercase tracking-wide">
              Direct Channels
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {formData.phone && (
                <a href={`tel:${formData.phone.replace(/\s+/g, '')}`} className="gov-btn gov-btn-sm">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call Guardian</span>
                </a>
              )}
              {formData.email && (
                <a href={`mailto:${formData.email}`} className="gov-btn gov-btn-sm">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Send Email</span>
                </a>
              )}
              {formData.phone && (
                <a
                  href={`https://wa.me/${formData.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gov-btn gov-btn-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          {/* Portal Access Status */}
          <div className="border border-[#CCCCCC] bg-[#FAFAFA] p-4 rounded-xl space-y-3">
            <div className="text-xs font-bold text-[#111111] uppercase tracking-wide">
              Parent Portal Access
            </div>
            <div className="text-xs text-[#555555] flex items-center justify-between">
              <span>Login Account:</span>
              <span className={`gov-tag text-[10px] ${hasPortalAccount ? 'gov-tag-approved' : 'gov-tag-warned'}`}>
                {hasPortalAccount ? 'REGISTERED' : 'NOT PROVISIONED'}
              </span>
            </div>
            {!hasPortalAccount && (
              <button
                type="button"
                className="gov-btn gov-btn-sm w-full justify-center"
                onClick={() => navigate(`/dashboard/admin/parents/create-login?parentId=${parentId}`)}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                Provision Parent Portal Account
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Role Management (if parentId represents a user ID) */}
      <UserRolesSection userId={parentId || null} schoolId={authSchoolId} />
    </div>
  );
}
