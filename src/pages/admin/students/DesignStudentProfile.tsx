import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { useAuthStore } from '@/store/authStore';
import { usePwezaStore } from '@/store/pwezaStore';
import { confirmProfileSave, escapeAttr, readFileAsDataURL } from '@/lib/profileInlineEdit';
import { displayParentsForStudent, type ParentLite } from '@/lib/studentDisplayParents';
import { loadStudentBalanceAggAllTerms } from '@/lib/adminFinanceTerm';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';

import templateRaw from '@/assets/pwezacore-student-profile.html?raw';
import {
  isALevelClass,
  isOLevelClass,
  isSenior12Class,
  isSenior34Class,
} from '@/components/reports/templates/helpers';

const STUDENT_PROFILE_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap';

/** Full template fragment: <head> CSS + <body> markup (scripts stripped). Body-only loses all styles. */
let cachedInjectedHtml: string | null = null;

const GUARDIAN_GRADIENTS = [
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#4f8ef7,#7c3aed)',
  'linear-gradient(135deg,#36d399,#4f8ef7)',
  'linear-gradient(135deg,#a78bfa,#4f8ef7)',
];

const gradG = (i: number) => GUARDIAN_GRADIENTS[i % GUARDIAN_GRADIENTS.length];

function initials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function displayFullName(s: Record<string, unknown>): string {
  const fn = String(s.first_name ?? '').trim();
  const mn = String(s.middle_name ?? '').trim();
  const ln = String(s.last_name ?? '').trim();
  const parts = [fn, mn, ln].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(s.name ?? '').trim() || '—';
}

function pickStr(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '—';
  const t = new Date(dob).getTime();
  if (Number.isNaN(t)) return '—';
  const age = Math.floor((Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} year${age !== 1 ? 's' : ''}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtShortDate(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtUGX(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `UGX ${Number(n).toLocaleString()}`;
}

function subjectTagsHtml(subjects: string[]): string {
  if (!subjects.length) {
    return '<span class="sp-profile-note">None listed</span>';
  }
  return `<div class="sp-tag-row">${subjects
    .map((s) => `<span class="sp-tag">${escapeHtml(s)}</span>`)
    .join('')}</div>`;
}

function isGeneralPaperSubject(name: string): boolean {
  return /general\s*paper/i.test(String(name || '').trim());
}

/**
 * Academic Standing — subject programme copy for student profile (secondary O-Level / A-Level / primary).
 */
function buildSubjectsEnrolledBlock(
  currentClass: string,
  classSubjectRows: { subject?: string; uce_offering_type?: string | null }[],
  olevelSaved: string[] | null,
  alevelRows: { subject_name: string; subject_role: string }[] | null,
): string {
  const cls = String(currentClass || '').trim();
  const rows = (classSubjectRows || [])
    .map((r) => ({
      subject: String(r.subject || '').trim(),
      ot: r.uce_offering_type ?? null,
    }))
    .filter((r) => r.subject);

  if (isOLevelClass(cls)) {
    const compulsory = rows.filter((r) => r.ot === 'compulsory').map((r) => r.subject);
    const subsidiaryOffered = rows.filter((r) => r.ot === 'subsidiary').map((r) => r.subject);
    const savedSet = new Set(olevelSaved || []);
    const subPicked = subsidiaryOffered.filter((s) => savedSet.has(s));

    if (isSenior12Class(cls)) {
      const allClass = [...new Set(rows.map((r) => r.subject))].sort((a, b) => a.localeCompare(b));
      const total = allClass.length;
      const statusClass = total > 0 ? 'ok' : 'warn';
      const statusText =
        total > 0
          ? `Programme: ${total} subject(s). Senior 1–2 learners take the full class set; all appear on report cards.`
          : 'No subjects on this class timetable. Configure Admin → Subjects per class.';
      return `
        <div class="sp-profile-prose ${statusClass}">${escapeHtml(statusText)}</div>
        <div class="sp-subject-tier-label">All class subjects</div>
        ${subjectTagsHtml(allClass)}
        <div class="sp-profile-note">Principal/subsidiary selection does not apply in Senior 1–2.</div>`;
    }

    if (isSenior34Class(cls)) {
      let principalsDisplay = [...compulsory].sort((a, b) => a.localeCompare(b));
      if (!principalsDisplay.length && rows.length) {
        principalsDisplay = rows
          .filter((r) => r.ot !== 'subsidiary')
          .map((r) => r.subject)
          .sort((a, b) => a.localeCompare(b));
      }
      if (!principalsDisplay.length && (olevelSaved?.length || 0) > 0) {
        const subSet = new Set(subsidiaryOffered);
        principalsDisplay = [...new Set((olevelSaved || []).filter((s) => !subSet.has(s)))].sort((a, b) =>
          a.localeCompare(b),
        );
      }
      const total = principalsDisplay.length + subPicked.length;
      let statusClass: 'ok' | 'warn' | 'bad' = 'ok';
      let statusText = `Profile: ${total} subject(s) — ${principalsDisplay.length} compulsory + ${subPicked.length} subsidiary (choose 1–3).`;
      if (subPicked.length === 0 && subsidiaryOffered.length > 0) {
        statusClass = 'warn';
        statusText = `Incomplete: add 1–3 subsidiary subject(s). Showing ${principalsDisplay.length} compulsory only (${total} on profile). Edit this student → UCE learner subjects.`;
      } else if (subPicked.length === 0 && subsidiaryOffered.length === 0) {
        statusClass = 'warn';
        statusText = `No subsidiary pool configured for this class. ${total} subject(s) on profile. Check Admin → Subjects per class.`;
      }
      if (!rows.length) {
        statusClass = 'bad';
        statusText = 'No class subjects found for this class name.';
      }
      return `
        <div class="sp-profile-prose ${statusClass}">${escapeHtml(statusText)}</div>
        <div class="sp-subject-tier-label">Principal / compulsory</div>
        ${subjectTagsHtml(principalsDisplay)}
        <div class="sp-subject-tier-label">Subsidiary (chosen)</div>
        ${
          subPicked.length
            ? subjectTagsHtml([...subPicked].sort((a, b) => a.localeCompare(b)))
            : `<span class="sp-profile-note">Not selected yet — principals only until 1–3 subsidiaries are chosen.</span>`
        }`;
    }

    const flat = [...new Set(rows.map((r) => r.subject))].sort((a, b) => a.localeCompare(b));
    return `<div class="sp-profile-prose warn">${escapeHtml(`O-Level class "${cls}": ${flat.length} timetable subject(s).`)}</div>${subjectTagsHtml(flat)}`;
  }

  if (isALevelClass(cls)) {
    const pr = (alevelRows || [])
      .filter((r) => r.subject_role === 'principal')
      .map((r) => r.subject_name)
      .filter(Boolean);
    const su = (alevelRows || [])
      .filter((r) => r.subject_role === 'subsidiary')
      .map((r) => r.subject_name)
      .filter(Boolean);
    const hasGP = su.some(isGeneralPaperSubject);
    const ok = pr.length === 3 && su.length === 2 && hasGP;
    const parts: string[] = [];
    if (pr.length !== 3) parts.push(`principals ${pr.length}/3`);
    if (su.length !== 2) parts.push(`subsidiaries ${su.length}/2`);
    if (su.length >= 1 && !hasGP) parts.push('General Paper must be one of the two subsidiaries');
    const statusText = ok
      ? 'UACE profile complete: 3 principals + 2 subsidiaries (including General Paper). Five subjects on reports.'
      : `Incomplete UACE profile${parts.length ? `: ${parts.join('; ')}` : ''}. Saved ${pr.length + su.length}/5. Edit UACE combination on this student.`;
    let statusClass: 'ok' | 'warn' | 'bad' = ok ? 'ok' : 'warn';
    if (!ok && pr.length + su.length === 0) statusClass = 'bad';
    return `
        <div class="sp-profile-prose ${statusClass}">${escapeHtml(statusText)}</div>
        <div class="sp-subject-tier-label">Principal (3)</div>
        ${subjectTagsHtml([...pr].sort((a, b) => a.localeCompare(b)))}
        <div class="sp-subject-tier-label">Subsidiary (2, incl. General Paper)</div>
        ${
          su.length
            ? subjectTagsHtml([...su].sort((a, b) => a.localeCompare(b)))
            : '<span class="sp-profile-note">None saved yet — choose 3 principals and 2 subsidiaries (General Paper is required).</span>'
        }`;
  }

  const flat = [...new Set(rows.map((r) => r.subject))].sort((a, b) => a.localeCompare(b));
  const n = flat.length;
  const statusText = n
    ? `${n} subject(s) on the class timetable.`
    : 'No subjects linked to this class yet.';
  return `<div class="sp-profile-prose ${n ? 'ok' : 'warn'}">${escapeHtml(statusText)}</div>${subjectTagsHtml(flat)}`;
}

type InvoicePayBadge = { text: string; badgeClass: 'green' | 'amber' | 'rose' | 'muted' };

function invoicePaymentBadge(status: string, amountPaid: number, balance: number): InvoicePayBadge {
  const st = String(status || '').toLowerCase();
  const bal = Number(balance);
  const ap = Number(amountPaid);
  if (st === 'cancelled') return { text: 'Cancelled', badgeClass: 'muted' };
  if (st === 'written_off') return { text: 'Written off', badgeClass: 'muted' };
  if (st === 'draft') return { text: 'Draft', badgeClass: 'muted' };
  if (st === 'paid' || bal <= 0.005) return { text: 'Paid', badgeClass: 'green' };
  if (ap > 0.005 && bal > 0.005) return { text: 'Partially paid', badgeClass: 'amber' };
  return { text: 'Unpaid', badgeClass: 'rose' };
}

type SchoolTermLabel = { year: number; term: number; end_date: string };

/** PostgREST may type/embed FK as T | T[]; normalize to one row. */
function normalizeSchoolTermEmbed(v: unknown): SchoolTermLabel | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const first = v[0];
    return first && typeof first === 'object' ? (first as SchoolTermLabel) : null;
  }
  return typeof v === 'object' ? (v as SchoolTermLabel) : null;
}

type ProfileInvoiceRow = {
  invoice_number: string | null;
  invoice_label: string | null;
  is_supplementary: boolean | null;
  total_amount: number | string;
  amount_paid: number | string;
  balance: number | string;
  status: string;
  created_at: string | null;
  school_terms: SchoolTermLabel | null;
};

function attColor(pct: number): string {
  if (pct >= 80) return 'var(--green)';
  if (pct >= 60) return 'var(--amber)';
  return 'var(--rose)';
}

function parseInjectedHtml(raw: string): string {
  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let inner = bodyMatch ? bodyMatch[1].trim() : raw;
  inner = inner.replace(/<script[\s\S]*?<\/script>/gi, '');
  const styleBlock = styleMatch ? `<style>${styleMatch[1]}</style>` : '';
  return `${styleBlock}${inner}`;
}

function spInline(
  root: Element,
  id: string,
  field: string,
  value: string,
  type: 'text' | 'date' | 'tel' | 'email' = 'text'
) {
  const el = root.querySelector(id);
  if (!el) return;
  const t = type === 'date' ? 'date' : type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'text';
  (el as HTMLElement).innerHTML = `<input type="${t}" class="pw-inline-input" data-sp-field="${field}" value="${escapeAttr(value)}" style="width:100%"/>`;
}

function applyStudentEditMode(root: Element, s: Record<string, unknown>) {
  const fullName = displayFullName(s);
  const nameEl = root.querySelector('#sp-student-name');
  if (nameEl) {
    nameEl.innerHTML = `<input type="text" class="pw-inline-input" data-sp-field="name" value="${escapeAttr(fullName)}" style="font:inherit;width:100%;max-width:420px"/>`;
  }
  spInline(root, '#sp-first-name', 'first_name', String(s.first_name ?? '').trim());
  spInline(root, '#sp-middle-name', 'middle_name', String(s.middle_name ?? '').trim());
  spInline(root, '#sp-last-name', 'last_name', String(s.last_name ?? '').trim());
  spInline(root, '#sp-gender', 'gender', String(s.gender ?? '').trim());
  spInline(root, '#sp-dob', 'date_of_birth', String(s.date_of_birth || '').slice(0, 10), 'date');
  spInline(root, '#sp-nationality', 'nationality', String(s.nationality ?? '').trim());
  spInline(root, '#sp-religion', 'religion', String(s.religion ?? '').trim());
  spInline(root, '#sp-blood-group', 'blood_group', String(s.blood_group ?? '').trim());
  spInline(root, '#sp-medical-notes', 'medical_notes', String(s.medical_condition ?? s.medical_notes ?? '').trim());
  spInline(root, '#sp-adm-number', 'admission_number', String(s.admission_number ?? '').trim());
  spInline(root, '#sp-current-class', 'current_class', String(s.current_class ?? '').trim());
  spInline(root, '#sp-stream', 'stream', String(s.stream ?? '').trim());
  spInline(
    root,
    '#sp-enrollment-date',
    'admission_date',
    String(s.admission_date || s.enrollment_date || '').slice(0, 10),
    'date'
  );
  const status = String(s.status ?? 'active');
  const stEl = root.querySelector('#sp-student-status');
  if (stEl) {
    stEl.innerHTML = `<select class="pw-inline-input" data-sp-field="status" style="width:100%;max-width:220px">
      <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
      <option value="inactive" ${status === 'inactive' ? 'selected' : ''}>Inactive</option>
    </select>`;
  }
  spInline(root, '#sp-previous-school', 'previous_school', String(s.previous_school ?? '').trim());
  spInline(root, '#sp-special-needs', 'special_needs', String(s.special_needs ?? '').trim());
  spInline(root, '#sp-home-address', 'address', String(s.address ?? '').trim());
  spInline(root, '#sp-guardian-address', 'guardian_address', String(s.guardian_address ?? '').trim());
  spInline(root, '#sp-district', 'district', String(s.district ?? s.city ?? '').trim());
  spInline(root, '#sp-guardian-phone', 'guardian_phone', String(s.guardian_phone ?? '').trim(), 'tel');
  spInline(root, '#sp-guardian-email', 'guardian_email', String(s.guardian_email ?? '').trim(), 'email');
  spInline(root, '#sp-emergency-contact', 'emergency_contact', String(s.emergency_contact ?? '').trim());
}

function getSpField(root: Element, field: string): string {
  const el = root.querySelector(`[data-sp-field="${field}"]`) as HTMLInputElement | HTMLSelectElement | null;
  return el?.value?.trim() ?? '';
}

type ParentRow = Record<string, unknown> & {
  parent_id?: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

type ParentSiblingRow = {
  student_id: string;
  displayName: string;
  current_class: string;
  admission_number: string;
};

type ParentCardDisplay = {
  name: string;
  phone: string | null;
  email: string | null;
  parent_id: string | null;
  relationship: string;
  occupation: string | null;
  address: string | null;
  nin: string | null;
  is_primary_contact: boolean | null;
  portal_access: boolean | null;
  siblings: ParentSiblingRow[];
};

export default function DesignStudentProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUserId = useAuthStore((s) => s.user?.id);
  const { student_id: studentIdParam } = useParams<{ student_id: string }>();
  const studentId = Array.isArray(studentIdParam) ? studentIdParam[0] : studentIdParam || '';

  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const studentCtxRef = useRef<{ schoolId: string } | null>(null);
  const saveStudentRef = useRef<() => Promise<void>>(async () => {});

  const saveStudent = useCallback(async () => {
    if (!confirmProfileSave()) return;
    const ctx = studentCtxRef.current;
    if (!ctx) return;
    const root = containerRef.current?.querySelector('.pw-profile');
    if (!root) return;
    const fn = getSpField(root, 'first_name');
    const mn = getSpField(root, 'middle_name');
    const ln = getSpField(root, 'last_name');
    const nameHero = getSpField(root, 'name');
    const combined = [fn, mn, ln].filter(Boolean).join(' ').trim();
    const name = combined || nameHero;
    if (!name) {
      window.alert('Please enter at least a first name or full name.');
      return;
    }
    const payload: Record<string, unknown> = {
      name,
      first_name: fn || null,
      middle_name: mn || null,
      last_name: ln || null,
      gender: getSpField(root, 'gender') || null,
      date_of_birth: getSpField(root, 'date_of_birth') || null,
      nationality: getSpField(root, 'nationality') || null,
      religion: getSpField(root, 'religion') || null,
      blood_group: getSpField(root, 'blood_group') || null,
      medical_notes: getSpField(root, 'medical_notes') || null,
      medical_condition: getSpField(root, 'medical_notes') || null,
      admission_number: getSpField(root, 'admission_number') || null,
      current_class: getSpField(root, 'current_class') || null,
      stream: getSpField(root, 'stream') || null,
      admission_date: getSpField(root, 'admission_date') || null,
      status: getSpField(root, 'status') || 'active',
      previous_school: getSpField(root, 'previous_school') || null,
      special_needs: getSpField(root, 'special_needs') || null,
      address: getSpField(root, 'address') || null,
      district: getSpField(root, 'district') || null,
      city: getSpField(root, 'district') || null,
      guardian_phone: getSpField(root, 'guardian_phone') || null,
      guardian_email: getSpField(root, 'guardian_email') || null,
      guardian_address: getSpField(root, 'guardian_address') || null,
      emergency_contact: getSpField(root, 'emergency_contact') || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('students')
      .update(payload)
      .eq('school_id', ctx.schoolId)
      .eq('student_id', studentId);
    if (error) {
      window.alert(error.message);
      return;
    }
    const photoInp = root.querySelector('#sp-photo-file') as HTMLInputElement | null;
    const file = photoInp?.files?.[0];
    if (file) {
      try {
        const url = await readFileAsDataURL(file);
        await supabase
          .from('student_photos')
          .delete()
          .eq('school_id', ctx.schoolId)
          .eq('student_id', studentId)
          .eq('is_primary', true);
        const { error: phErr } = await supabase.from('student_photos').insert({
          school_id: ctx.schoolId,
          student_id: studentId,
          photo_url: url,
          photo_filename: file.name,
          photo_size: file.size,
          photo_type: file.type,
          is_primary: true,
        });
        if (phErr && import.meta.env.DEV) console.warn('[DesignStudentProfile] photo:', phErr.message);
      } catch {
        window.alert('Could not save the photo.');
        return;
      }
      if (photoInp) photoInp.value = '';
    }
    if (authUserId) {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.studentsDesign(authUserId) });
    }
    setEditMode(false);
    setReloadToken((x) => x + 1);
  }, [studentId, authUserId, queryClient]);

  saveStudentRef.current = saveStudent;

  useEffect(() => {
    const id = 'pweza-student-profile-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = STUDENT_PROFILE_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (cachedInjectedHtml) {
      setHtmlContent(cachedInjectedHtml);
      return;
    }
    cachedInjectedHtml = parseInjectedHtml(templateRaw);
    setHtmlContent(cachedInjectedHtml);
  }, []);

  useEffect(() => {
    if (!htmlContent || !studentId) return;

    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const schoolId = usePwezaStore.getState().schoolId as string | undefined; // pweza speed system
      if (!schoolId) return;

      const { data: student, error: stErr } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (stErr || !student) {
        studentCtxRef.current = null;
        requestAnimationFrame(() => {
          const el = containerRef.current;
          if (!el) return;
          const n = el.querySelector('#sp-breadcrumb-name');
          if (n) n.textContent = 'Student not found';
        });
        return;
      }

      const s = student as Record<string, unknown>;
      studentCtxRef.current = { schoolId };
      const today = new Date().toISOString().slice(0, 10);
      const currentClass = (s.current_class as string) || '';

      const [
        parentsRes,
        photoRes,
        attendanceTodayRes,
        attendanceAllRes,
        examRes,
        subjectsRes,
      ] = await Promise.all([
        supabase.from('parents').select('*').eq('school_id', schoolId).eq('student_id', studentId),
        supabase.from('student_photos').select('photo_url').eq('school_id', schoolId).eq('student_id', studentId).eq('is_primary', true).maybeSingle(),
        supabase
          .from('student_attendance')
          .select('present, status')
          .eq('school_id', schoolId)
          .eq('student_id', studentId)
          .eq('attendance_date', today)
          .maybeSingle(),
        supabase
          .from('student_attendance')
          .select('present, status, attendance_date')
          .eq('school_id', schoolId)
          .eq('student_id', studentId)
          .order('attendance_date'),
        supabase.from('exam_results').select('subject, marks_obtained, total_marks, grade').eq('school_id', schoolId).eq('student_id', studentId).limit(50),
        currentClass
          ? supabase
              .from('class_subjects')
              .select('subject, uce_offering_type')
              .eq('school_id', schoolId)
              .eq('class_name', currentClass)
              .order('subject')
          : Promise.resolve({ data: [], error: null }),
      ]);

      let olevelSavedNames: string[] | null = null;
      let alevelSubjectRows: { subject_name: string; subject_role: string }[] | null = null;
      if (currentClass && isOLevelClass(currentClass)) {
        const { data: ol } = await supabase
          .from('student_olevel_subjects')
          .select('subject_name')
          .eq('school_id', schoolId)
          .eq('student_id', studentId);
        olevelSavedNames = (ol || []).map((r) => String((r as { subject_name?: string }).subject_name || '').trim()).filter(Boolean);
      } else if (currentClass && isALevelClass(currentClass)) {
        const { data: al } = await supabase
          .from('student_alevel_subjects')
          .select('subject_name, subject_role')
          .eq('school_id', schoolId)
          .eq('student_id', studentId);
        alevelSubjectRows = (al || []) as { subject_name: string; subject_role: string }[];
      }

      const [feeBal, paymentQ, invoicesQ] = await Promise.all([
        loadStudentBalanceAggAllTerms(supabase, schoolId, studentId),
        supabase
          .from('student_payments')
          .select('amount_paid, payment_method, payment_date')
          .eq('school_id', schoolId)
          .eq('student_id', studentId)
          .order('payment_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('student_invoices')
          .select(
            'invoice_number, invoice_label, is_supplementary, total_amount, amount_paid, balance, status, created_at, school_terms(year, term, end_date)'
          )
          .eq('school_id', schoolId)
          .eq('student_id', studentId),
      ]);
      const paymentRes = { data: paymentQ.error ? null : paymentQ.data };
      if (invoicesQ.error && import.meta.env.DEV) {
        console.warn('[DesignStudentProfile] student_invoices:', invoicesQ.error.message);
      }
      const invoiceRows: ProfileInvoiceRow[] = (invoicesQ.error ? [] : invoicesQ.data || []).map(
        (row) => {
          const r = row as Record<string, unknown>;
          return {
            invoice_number: (r.invoice_number as string | null) ?? null,
            invoice_label: (r.invoice_label as string | null) ?? null,
            is_supplementary: (r.is_supplementary as boolean | null) ?? null,
            total_amount: r.total_amount as number | string,
            amount_paid: r.amount_paid as number | string,
            balance: r.balance as number | string,
            status: String(r.status ?? ''),
            created_at: (r.created_at as string | null) ?? null,
            school_terms: normalizeSchoolTermEmbed(r.school_terms),
          };
        }
      );
      invoiceRows.sort((a, b) => {
        const ta = a.school_terms;
        const tb = b.school_terms;
        const yA = ta?.year ?? 0;
        const yB = tb?.year ?? 0;
        if (yB !== yA) return yB - yA;
        const termA = ta?.term ?? 0;
        const termB = tb?.term ?? 0;
        if (termB !== termA) return termB - termA;
        const supA = a.is_supplementary ? 1 : 0;
        const supB = b.is_supplementary ? 1 : 0;
        if (supA !== supB) return supA - supB;
        const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
        const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return cb - ca;
      });

      /** Same resolution as students list: portal `parents` rows + guardian_* on `students` when unlinked. */
      if (parentsRes.error && import.meta.env.DEV) {
        console.warn('[DesignStudentProfile] parents query:', parentsRes.error.message);
      }
      const fromDb = (parentsRes.error ? [] : parentsRes.data || []) as ParentRow[];
      const linkedLite: ParentLite[] = fromDb.map((p) => ({
        name: p.name || '',
        email: p.email ?? undefined,
        phone: p.phone ?? undefined,
        parent_id: p.parent_id ?? null,
      }));
      const parentsByStudent: Record<string, ParentLite[]> = { [studentId]: linkedLite };
      const mergedLite = displayParentsForStudent(
        studentId,
        {
          guardian_name: s.guardian_name as string | null,
          guardian_email: s.guardian_email as string | null,
          guardian_phone: s.guardian_phone as string | null,
        },
        parentsByStudent
      );
      const parentCards: ParentCardDisplay[] = mergedLite.map((pl, i) => {
        const dbRow = fromDb[i] as Record<string, unknown> | undefined;
        const nm = String(pl.name ?? '').trim();
        const name = nm || (pl.phone || pl.email ? 'Guardian' : '—');
        const occupation =
          pickStr(dbRow?.occupation) ?? (i === 0 ? pickStr(s.guardian_occupation) : null);
        const address = pickStr(dbRow?.address) ?? (i === 0 ? pickStr(s.guardian_address) : null);
        const nin =
          pickStr(dbRow?.nin) ??
          pickStr(dbRow?.national_id) ??
          pickStr(dbRow?.national_identification_number);
        let isPrimary: boolean | null = null;
        if (dbRow && typeof dbRow.is_primary_contact === 'boolean') isPrimary = dbRow.is_primary_contact;
        return {
          name,
          phone: pl.phone ?? null,
          email: pl.email ?? null,
          parent_id: pl.parent_id ?? null,
          relationship:
            pickStr(dbRow?.relationship) ?? (i === 0 ? pickStr(s.guardian_relationship) : null) ?? 'Guardian',
          occupation,
          address,
          nin,
          is_primary_contact: isPrimary,
          portal_access: null,
          siblings: [],
        };
      });

      const parentIdsForSiblings = [...new Set(parentCards.map((c) => c.parent_id).filter(Boolean))] as string[];
      if (parentIdsForSiblings.length > 0) {
        const [linksRes, usersRes] = await Promise.all([
          supabase
            .from('parents')
            .select('parent_id, student_id')
            .eq('school_id', schoolId)
            .in('parent_id', parentIdsForSiblings)
            .neq('student_id', studentId),
          supabase.from('users').select('user_id, is_active').in('user_id', parentIdsForSiblings).eq('role', 'parent'),
        ]);
        if (linksRes.error && import.meta.env.DEV) {
          console.warn('[DesignStudentProfile] parents sibling links:', linksRes.error.message);
        }
        const portalById: Record<string, boolean> = {};
        for (const u of usersRes.data || []) {
          const uid = (u as { user_id: string }).user_id;
          portalById[uid] = (u as { is_active?: boolean }).is_active !== false;
        }
        const siblingsByParentId: Record<string, ParentSiblingRow[]> = {};
        const linkRows = (linksRes.data || []) as { parent_id: string; student_id: string }[];
        const otherIds = [...new Set(linkRows.map((r) => r.student_id))];
        if (otherIds.length > 0) {
          const { data: studRows, error: stErr } = await supabase
            .from('students')
            .select('student_id, name, first_name, middle_name, last_name, current_class, admission_number')
            .eq('school_id', schoolId)
            .in('student_id', otherIds);
          if (stErr && import.meta.env.DEV) console.warn('[DesignStudentProfile] sibling students:', stErr.message);
          const bySid = new Map<string, Record<string, unknown>>();
          for (const st of studRows || []) {
            bySid.set(String((st as { student_id: string }).student_id), st as Record<string, unknown>);
          }
          for (const link of linkRows) {
            const rowSt = bySid.get(link.student_id);
            if (!rowSt) continue;
            const row: ParentSiblingRow = {
              student_id: link.student_id,
              displayName: displayFullName(rowSt),
              current_class: String(rowSt.current_class ?? '—'),
              admission_number: String(rowSt.admission_number ?? '—'),
            };
            if (!siblingsByParentId[link.parent_id]) siblingsByParentId[link.parent_id] = [];
            if (!siblingsByParentId[link.parent_id].some((x) => x.student_id === row.student_id)) {
              siblingsByParentId[link.parent_id].push(row);
            }
          }
        }
        for (const c of parentCards) {
          c.portal_access =
            c.parent_id && Object.prototype.hasOwnProperty.call(portalById, c.parent_id)
              ? portalById[c.parent_id]
              : null;
          const list = c.parent_id ? siblingsByParentId[c.parent_id] : undefined;
          c.siblings = list
            ? [...list].sort((a, b) => a.displayName.localeCompare(b.displayName))
            : [];
        }
      }
      const photoUrl = (photoRes.data as { photo_url?: string } | null)?.photo_url?.trim() || '';
      const attToday = attendanceTodayRes.data as {
        present?: boolean | null;
        status?: string | null;
      } | null;
      const attAll = (attendanceAllRes.data || []) as {
        present?: boolean | null;
        status?: string | null;
        attendance_date?: string;
        date?: string;
      }[];
      const examResults = (examRes.data || []) as {
        subject?: string;
        marks_obtained?: number;
        total_marks?: number;
        grade?: string;
      }[];
      const subjectRows = (subjectsRes.data || []) as { subject?: string; uce_offering_type?: string | null }[];
      const lastPayment = paymentRes.data as {
        amount_paid?: number;
        payment_method?: string;
        payment_date?: string;
      } | null;

      let classTeacher = '—';
      if (currentClass) {
        const { data: ctRows } = await supabase
          .from('class_teachers')
          .select('teacher_id')
          .eq('school_id', schoolId)
          .eq('class_name', currentClass);
        const tid = (ctRows || [])[0] as { teacher_id?: string } | undefined;
        if (tid?.teacher_id) {
          const { data: t } = await supabase.from('teachers').select('name').eq('school_id', schoolId).eq('teacher_id', tid.teacher_id).maybeSingle();
          classTeacher = (t?.name as string) || '—';
        }
      }

      const presentDays = attAll.filter((a) => studentAttendanceRowIsPresent(a)).length;
      const absentDays = attAll.filter((a) => !studentAttendanceRowIsPresent(a)).length;
      const totalMarked = presentDays + absentDays;
      const overallRate = totalMarked > 0 ? Math.round((presentDays / totalMarked) * 100) : 0;

      const monthMap: Record<string, { present: number; total: number }> = {};
      attAll.forEach((a) => {
        const d = a.attendance_date || a.date;
        if (!d) return;
        const month = new Date(d).toLocaleString('en', { month: 'short' });
        if (!monthMap[month]) monthMap[month] = { present: 0, total: 0 };
        monthMap[month].total++;
        if (studentAttendanceRowIsPresent(a)) monthMap[month].present++;
      });

      const fullName = displayFullName(s);
      const expectedFee = Number(s.expected_fee_amount ?? 0);
      const paymentStatus = String(s.payment_status ?? '').toLowerCase();
      const disc = s.fee_discount_percent != null ? `${s.fee_discount_percent}%` : '—';

      if (cancelled) return;

      requestAnimationFrame(() => {
        if (cancelled) return;
        const root = containerRef.current;
        if (!root) return;
        const el = root.querySelector('.pw-profile') || root;

        const set = (id: string, val: string) => {
          const n = el.querySelector(id);
          if (n) n.textContent = val;
        };
        const setHTML = (id: string, html: string) => {
          const n = el.querySelector(id);
          if (n) n.innerHTML = html;
        };

        set('#sp-breadcrumb-name', fullName);

        if (photoUrl) {
          const img = el.querySelector('#sp-photo-img') as HTMLImageElement | null;
          const ini = el.querySelector('#sp-photo-initials') as HTMLElement | null;
          if (img) {
            img.src = photoUrl;
            img.alt = fullName;
            img.style.display = 'block';
          }
          if (ini) ini.style.display = 'none';
        } else {
          const img = el.querySelector('#sp-photo-img') as HTMLImageElement | null;
          const ini = el.querySelector('#sp-photo-initials') as HTMLElement | null;
          if (img) img.style.display = 'none';
          if (ini) {
            ini.style.display = 'flex';
            ini.textContent = initials(fullName);
          }
        }

        set('#sp-student-name', fullName);
        set('#sp-chip-class', `🏫 ${currentClass || '—'}`);
        set('#sp-chip-adm', `# ${String(s.admission_number ?? '—')}`);
        const admDate = (s.admission_date as string) || '';
        set('#sp-chip-enrolled', admDate ? `📅 Enrolled ${fmtShortDate(admDate)}` : '📅 —');

        const statusChip = el.querySelector('#sp-chip-status') as HTMLElement | null;
        if (statusChip) {
          const active = String(s.status ?? '') === 'active';
          statusChip.textContent = active ? '✦ Active' : '✗ Inactive';
          statusChip.className = `sp-chip ${active ? 'sp-chip-green' : 'sp-chip-rose'}`;
        }

        const attMeta = el.querySelector('#sp-meta-attendance') as HTMLElement | null;
        if (attMeta) {
          if (!attToday) {
            attMeta.textContent = 'Not Marked';
            attMeta.className = 'sp-hero-meta-value';
          } else if (studentAttendanceRowIsPresent(attToday)) {
            attMeta.textContent = '✓ Present';
            attMeta.className = 'sp-hero-meta-value green';
          } else {
            attMeta.textContent = '✗ Absent';
            attMeta.className = 'sp-hero-meta-value rose';
          }
        }

        const feeMeta = el.querySelector('#sp-meta-fee-balance') as HTMLElement | null;
        if (feeMeta) {
          const bal = feeBal.balance;
          if (Number(bal) > 0) {
            feeMeta.textContent = fmtUGX(Number(bal));
            feeMeta.className = 'sp-hero-meta-value amber';
          } else if (/overdue|unpaid|owing/.test(paymentStatus) && expectedFee > 0) {
            feeMeta.textContent = fmtUGX(expectedFee);
            feeMeta.className = 'sp-hero-meta-value amber';
          } else {
            feeMeta.textContent = '✓ Paid';
            feeMeta.className = 'sp-hero-meta-value green';
          }
        }

        set('#sp-meta-class-teacher', classTeacher);
        set('#sp-meta-gender', String(s.gender ?? '—'));
        set('#sp-meta-dob', fmtDate(s.date_of_birth as string));
        set('#sp-meta-nationality', String(s.nationality ?? '—'));

        set('#sp-first-name', String(s.first_name || (fullName.split(' ')[0] ?? '—')));
        const mn = String(s.middle_name ?? '').trim();
        set('#sp-middle-name', mn || '—');
        const mnEl = el.querySelector('#sp-middle-name') as HTMLElement | null;
        if (mnEl) {
          mnEl.className = `sp-field-value${mn ? '' : ' muted'}`;
        }
        set('#sp-last-name', String(s.last_name || fullName.split(' ').slice(-1)[0] || '—'));
        set('#sp-gender', String(s.gender ?? '—'));
        set('#sp-dob', fmtDate(s.date_of_birth as string));
        set('#sp-age', calcAge(s.date_of_birth as string));
        set('#sp-nationality', String(s.nationality ?? '—'));
        set('#sp-religion', String(s.religion ?? '—'));
        set('#sp-blood-group', String(s.blood_group ?? '—'));
        const med = String(s.medical_condition ?? s.medical_notes ?? '').trim();
        set('#sp-medical-notes', med || 'None recorded');
        const medEl = el.querySelector('#sp-medical-notes') as HTMLElement | null;
        if (medEl) medEl.className = `sp-field-value${med ? '' : ' muted'}`;

        set('#sp-adm-number', String(s.admission_number ?? '—'));
        set('#sp-current-class', currentClass || '—');
        set('#sp-class-teacher-ov', classTeacher === '—' ? 'Not assigned' : classTeacher);
        set('#sp-stream', String(s.stream ?? '—'));
        set('#sp-enrollment-date', fmtDate((s.admission_date as string) || (s.enrollment_date as string)));
        const statusField = el.querySelector('#sp-student-status') as HTMLElement | null;
        if (statusField) {
          const activeSt = String(s.status ?? '') === 'active';
          statusField.textContent = activeSt ? 'Active' : 'Inactive';
          statusField.className = `sp-field-value ${activeSt ? 'green' : 'rose'}`;
        }
        set('#sp-previous-school', String(s.previous_school ?? 'Not recorded'));
        set('#sp-special-needs', String(s.special_needs ?? 'None'));

        set('#sp-home-address', String(s.address ?? 'Not recorded'));
        set('#sp-guardian-address', String(s.guardian_address ?? 'Not recorded'));
        set('#sp-district', String(s.district ?? s.city ?? '—'));
        const gp = String(s.guardian_phone ?? '').trim();
        const ge = String(s.guardian_email ?? '').trim();
        const gphoneEl = el.querySelector('#sp-guardian-phone') as HTMLElement | null;
        if (gphoneEl) {
          gphoneEl.innerHTML = gp ? `<a href="tel:${gp.replace(/\s/g, '')}">${escapeHtml(gp)}</a>` : 'Not recorded';
          gphoneEl.className = `sp-field-value${gp ? '' : ' muted'}`;
        }
        const gemailEl = el.querySelector('#sp-guardian-email') as HTMLElement | null;
        if (gemailEl) {
          gemailEl.innerHTML = ge ? `<a href="mailto:${escapeHtml(ge)}">${escapeHtml(ge)}</a>` : 'Not recorded';
          gemailEl.className = `sp-field-value${ge ? '' : ' muted'}`;
        }
        set('#sp-emergency-contact', String(s.emergency_contact ?? 'Not recorded'));

        const noParentNotice = el.querySelector('#sp-no-parent-notice') as HTMLElement | null;
        const parentsBody = el.querySelector('#sp-parents-body') as HTMLElement | null;
        if (noParentNotice) noParentNotice.style.display = parentCards.length === 0 ? 'flex' : 'none';
        if (parentsBody) {
          if (parentCards.length === 0) {
            parentsBody.innerHTML = '';
          } else {
            parentsBody.innerHTML = parentCards
              .map((p, i) => {
                const pname = escapeHtml(String(p.name ?? '—'));
                const rel = escapeHtml(String(p.relationship ?? 'Guardian'));
                const phone = String(p.phone ?? '').trim();
                const email = String(p.email ?? '').trim();
                const pid = String(p.parent_id ?? '');
                const wa = phone.replace(/\D/g, '');
                const occ = String(p.occupation ?? '').trim();
                const addr = String(p.address ?? '').trim();
                const nin = String(p.nin ?? '').trim();
                const primaryLabel =
                  p.is_primary_contact === true ? 'Yes' : p.is_primary_contact === false ? 'No' : '—';
                const portalHtml =
                  p.portal_access === true
                    ? '<span style="color:var(--green)">✓ Active</span>'
                    : p.portal_access === false
                      ? '<span style="color:var(--rose)">✗ Inactive</span>'
                      : '—';
                const siblingsHtml =
                  p.siblings.length === 0
                    ? ''
                    : `<div class="sp-guardian-siblings">
              <div class="sp-guardian-siblings-title">Other children (same guardian)</div>
              <div class="sp-guardian-sibling-list">
                ${p.siblings
                  .map(
                    (ch) =>
                      `<button type="button" class="sp-guardian-sibling-link" data-nav="/dashboard/admin/students/${escapeHtml(ch.student_id)}">
                  <span class="sp-guardian-sibling-name">${escapeHtml(ch.displayName)}</span>
                  <span class="sp-guardian-sibling-meta">${escapeHtml(ch.current_class)} · #${escapeHtml(ch.admission_number)}</span>
                </button>`
                  )
                  .join('')}
              </div>
            </div>`;
                return `
            <div class="sp-guardian-card">
              <div class="sp-guardian-top">
                <div class="sp-guardian-av" style="background:${gradG(i)}">${initials(String(p.name ?? ''))}</div>
                <div class="sp-guardian-name-block">
                  <div class="sp-guardian-name">${pname}</div>
                  <div class="sp-guardian-relation">${rel}</div>
                </div>
                <div class="sp-guardian-actions">
                  ${phone ? `<button type="button" class="sp-icon-btn" data-tel="${escapeHtml(phone)}" title="Call">📞</button>` : ''}
                  ${email ? `<button type="button" class="sp-icon-btn" data-email="${escapeHtml(email)}" title="Email">✉️</button>` : ''}
                  ${phone && wa ? `<button type="button" class="sp-icon-btn sp-green" data-whatsapp="${wa}" title="WhatsApp">💬</button>` : ''}
                  <button type="button" class="sp-icon-btn" data-nav="/dashboard/admin/parents" title="Parents directory">›</button>
                </div>
              </div>
              <div class="sp-guardian-fields">
                <div><div class="sp-guardian-field-label">Phone</div><div class="sp-guardian-field-value">${phone ? `<a href="tel:${phone.replace(/\s/g, '')}">${escapeHtml(phone)}</a>` : '—'}</div></div>
                <div><div class="sp-guardian-field-label">Email</div><div class="sp-guardian-field-value">${email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : '—'}</div></div>
                <div><div class="sp-guardian-field-label">Parent ID</div><div class="sp-guardian-field-value" style="font-size:11px;word-break:break-all">${pid ? escapeHtml(pid) : '—'}</div></div>
                <div><div class="sp-guardian-field-label">Occupation</div><div class="sp-guardian-field-value">${occ ? escapeHtml(occ) : '—'}</div></div>
                <div><div class="sp-guardian-field-label">NIN / ID</div><div class="sp-guardian-field-value">${nin ? escapeHtml(nin) : '—'}</div></div>
                <div><div class="sp-guardian-field-label">Address</div><div class="sp-guardian-field-value">${addr ? escapeHtml(addr) : '—'}</div></div>
                <div><div class="sp-guardian-field-label">Primary contact</div><div class="sp-guardian-field-value">${primaryLabel}</div></div>
                <div><div class="sp-guardian-field-label">Portal access</div><div class="sp-guardian-field-value">${portalHtml}</div></div>
              </div>
              ${siblingsHtml}
            </div>`;
              })
              .join('');
          }
        }

        set('#sp-current-term', 'Current term');
        set('#sp-class-position', 'Not yet ranked');
        setHTML(
          '#sp-subjects-enrolled-block',
          buildSubjectsEnrolledBlock(currentClass, subjectRows, olevelSavedNames, alevelSubjectRows),
        );
        set('#sp-report-card-status', 'Not yet generated');

        if (examResults.length > 0) {
          setHTML(
            '#sp-exam-results-body',
            examResults
              .map((r) => {
                const mo = Number(r.marks_obtained ?? 0);
                const tm = Number(r.total_marks ?? 100) || 100;
                const ratio = tm > 0 ? mo / tm : 0;
                const col = ratio >= 0.8 ? 'var(--green)' : ratio >= 0.5 ? 'var(--amber)' : 'var(--rose)';
                return `<div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="flex:1">
                <div style="font-size:13.5px;font-weight:600;color:var(--text-primary)">${escapeHtml(String(r.subject ?? ''))}</div>
              </div>
              <div style="font-size:15px;font-weight:700;color:${col}">${mo}/${tm}</div>
            </div>`;
              })
              .join('')
          );
        }

        const billed = feeBal.total_fees;
        const paid = feeBal.total_paid;
        const balance = feeBal.balance;
        set('#sp-fee-term-label', 'Fee summary (all terms)');
        set('#sp-fee-total-billed', fmtUGX(Number(billed)));
        set('#sp-fee-total-paid', fmtUGX(Number(paid)));
        const feeBalEl = el.querySelector('#sp-fee-balance') as HTMLElement | null;
        if (feeBalEl) {
          feeBalEl.textContent = balance > 0 ? `${fmtUGX(balance)}` : '—';
          feeBalEl.className = `sp-fee-value ${balance <= 0 ? 'green' : 'amber'}`;
        }
        set(
          '#sp-last-payment-date',
          lastPayment?.payment_date ? fmtDate(lastPayment.payment_date) : '—'
        );
        set('#sp-payment-method', lastPayment?.payment_method ? String(lastPayment.payment_method) : '—');
        set('#sp-scholarship', disc);

        if (invoiceRows.length === 0) {
          setHTML(
            '#sp-invoices-body',
            `<div class="sp-empty">
              <div class="sp-empty-icon">📄</div>
              <div>No invoices yet for this student.</div>
              <div style="font-size:12px;color:var(--text-muted)">Invoices appear when fees are generated for a term.</div>
            </div>`
          );
        } else {
          const invCells = invoiceRows
            .map((row) => {
              const term = row.school_terms;
              const termLabel = term ? `Term ${term.term}, ${term.year}` : '—';
              const invNo = String(row.invoice_number ?? '').trim() || '—';
              const desc =
                String(row.invoice_label ?? '').trim() ||
                (row.is_supplementary ? 'Supplementary' : 'Term invoice');
              const total = Number(row.total_amount);
              const paid = Number(row.amount_paid);
              const bal = Number(row.balance);
              const { text: payLabel, badgeClass } = invoicePaymentBadge(row.status, paid, bal);
              const supHtml = row.is_supplementary
                ? `<div class="sp-inv-sublabel">Supplementary</div>`
                : '';
              return `<tr>
                <td><strong>${escapeHtml(invNo)}</strong>${supHtml}</td>
                <td>${escapeHtml(termLabel)}</td>
                <td>${escapeHtml(desc)}</td>
                <td class="num">${fmtUGX(total)}</td>
                <td class="num">${fmtUGX(paid)}</td>
                <td class="num">${bal > 0.005 ? fmtUGX(bal) : '—'}</td>
                <td><span class="sp-inv-badge ${badgeClass}">${escapeHtml(payLabel)}</span></td>
              </tr>`;
            })
            .join('');
          setHTML(
            '#sp-invoices-body',
            `<table class="sp-invoices-table">
              <thead><tr>
                <th>Invoice</th>
                <th>Term</th>
                <th>Details</th>
                <th class="num">Total</th>
                <th class="num">Paid</th>
                <th class="num">Balance</th>
                <th>Payment status</th>
              </tr></thead>
              <tbody>${invCells}</tbody>
            </table>`
          );
        }

        const monthBars = Object.entries(monthMap).map(([mon, data]) => {
          const pct = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
          const color = data.total === 0 ? 'var(--text-muted)' : attColor(pct);
          return `
            <div class="sp-att-month">
              <div class="sp-att-month-name">${mon.toUpperCase()}</div>
              <div class="sp-att-bar-wrap">
                <div class="sp-att-bar" style="width:${data.total ? pct : 0}%;background:${color}"></div>
              </div>
              <div class="sp-att-pct" style="color:${color}">${data.total > 0 ? `${pct}%` : '—'}</div>
            </div>`;
        });
        if (monthBars.length > 0) setHTML('#sp-attendance-months', monthBars.join(''));
        set('#sp-days-present', `${presentDays} day${presentDays !== 1 ? 's' : ''}`);
        set('#sp-days-absent', `${absentDays} day${absentDays !== 1 ? 's' : ''}`);
        const rateEl = el.querySelector('#sp-attendance-rate') as HTMLElement | null;
        if (rateEl) {
          rateEl.textContent = totalMarked ? `${overallRate}%` : '—';
          rateEl.className = `sp-field-value ${overallRate >= 80 ? 'green' : overallRate >= 60 ? 'amber' : 'rose'}`;
        }

        setHTML(
          '#sp-documents-body',
          `<div class="sp-empty">
              <div class="sp-empty-icon">📁</div>
              <div>No documents uploaded yet.</div>
              <div style="font-size:12px;color:var(--text-muted)">Document storage can be connected later.</div>
            </div>`
        );

        if (editMode) {
          applyStudentEditMode(el, s);
        }

        const wire = (sel: string, fn: () => void) => {
          const b = el.querySelector(sel);
          if (b) (b as HTMLElement).onclick = () => fn();
        };

        wire('#sp-btn-print', () => window.print());
        const spEdit = el.querySelector('#sp-btn-edit') as HTMLElement | null;
        if (spEdit) {
          spEdit.textContent = editMode ? '💾 Save' : '✏️ Edit Profile';
          spEdit.onclick = () => {
            if (editMode) void saveStudentRef.current();
            else setEditMode(true);
          };
        }
        const spCancel = el.querySelector('#sp-btn-cancel-edit') as HTMLElement | null;
        if (spCancel) {
          spCancel.style.display = editMode ? 'inline-flex' : 'none';
          spCancel.onclick = () => setEditMode(false);
        }
        wire('#sp-btn-delete', () => {
          if (window.confirm(`Delete ${fullName}? This cannot be undone.`)) {
            void supabase.from('students').delete().eq('school_id', schoolId).eq('student_id', studentId).then(() => {
              navigate('/dashboard/admin/students');
            });
          }
        });
        wire('#sp-btn-link-parent', () => navigate('/dashboard/admin/parents'));
        wire('#sp-btn-record-payment', () => navigate('/dashboard/admin/outstanding'));
        wire('#sp-btn-upload-doc', () => navigate('/dashboard/admin/students'));
        const spPhotoFile = el.querySelector('#sp-photo-file') as HTMLInputElement | null;
        const spChangePhoto = el.querySelector('#sp-btn-change-photo') as HTMLElement | null;
        if (spChangePhoto) {
          spChangePhoto.onclick = () => {
            if (editMode) spPhotoFile?.click();
            else window.alert('Click Edit Profile, then use the camera icon to change the photo.');
          };
        }
        wire('#sp-btn-message-parent', () => navigate('/dashboard/admin/parents'));

        el.querySelectorAll('[data-nav]').forEach((node) => {
          const href = (node as HTMLElement).getAttribute('data-nav');
          if (!href) return;
          (node as HTMLElement).onclick = (e) => {
            e.preventDefault();
            navigate(href);
          };
        });

        el.querySelectorAll('[data-tel]').forEach((node) => {
          const t = (node as HTMLElement).getAttribute('data-tel');
          if (t)
            (node as HTMLElement).onclick = () => {
              window.location.href = `tel:${t.replace(/\s/g, '')}`;
            };
        });
        el.querySelectorAll('[data-email]').forEach((node) => {
          const t = (node as HTMLElement).getAttribute('data-email');
          if (t) (node as HTMLElement).onclick = () => window.open(`mailto:${t}`);
        });
        el.querySelectorAll('[data-whatsapp]').forEach((node) => {
          const t = (node as HTMLElement).getAttribute('data-whatsapp');
          if (t) (node as HTMLElement).onclick = () => window.open(`https://wa.me/${t}`, '_blank');
        });

        const TABS = ['overview', 'parents', 'academic', 'fees', 'attendance', 'documents'] as const;
        const switchTab = (name: string) => {
          TABS.forEach((t) => {
            const panel = el.querySelector(`#sp-tab-${t}`) as HTMLElement | null;
            if (panel) panel.style.display = t === name ? '' : 'none';
          });
          el.querySelectorAll('.sp-tab-btn').forEach((btn) => {
            btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === name);
          });
        };
        el.querySelectorAll('.sp-tab-btn').forEach((btn) => {
          (btn as HTMLElement).onclick = () => switchTab((btn as HTMLElement).dataset.tab || 'overview');
        });
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [htmlContent, studentId, navigate, reloadToken, editMode]);

  useEffect(() => {
    const syncLight = () => {
      const dark = document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('light', !dark);
    };
    syncLight();
    const obs = new MutationObserver(syncLight);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      obs.disconnect();
      document.documentElement.classList.remove('light');
    };
  }, [htmlContent]);

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width: '100%', minHeight: '100vh', display: 'block' }}
    />
  );
}
