import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { displayParentsForStudent, type ParentLite } from '@/lib/studentDisplayParents';

import templateRaw from '@/assets/pwezacore-student-profile.html?raw';

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

type ParentRow = Record<string, unknown> & {
  parent_id?: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export default function DesignStudentProfile() {
  const navigate = useNavigate();
  const { student_id: studentIdParam } = useParams<{ student_id: string }>();
  const studentId = Array.isArray(studentIdParam) ? studentIdParam[0] : studentIdParam || '';

  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

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

      const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      const schoolId = userData?.school_id as string | undefined;
      if (!schoolId) return;

      const { data: student, error: stErr } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (stErr || !student) {
        requestAnimationFrame(() => {
          const el = containerRef.current;
          if (!el) return;
          const n = el.querySelector('#sp-breadcrumb-name');
          if (n) n.textContent = 'Student not found';
        });
        return;
      }

      const s = student as Record<string, unknown>;
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
        supabase.from('student_attendance').select('present').eq('school_id', schoolId).eq('student_id', studentId).eq('date', today).maybeSingle(),
        supabase.from('student_attendance').select('present, date').eq('school_id', schoolId).eq('student_id', studentId).order('date'),
        supabase.from('exam_results').select('subject, marks_obtained, total_marks, grade').eq('school_id', schoolId).eq('student_id', studentId).limit(50),
        currentClass
          ? supabase.from('class_subjects').select('subject').eq('school_id', schoolId).eq('class_name', currentClass)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const balanceQ = await supabase
        .from('student_balances')
        .select('total_fees, total_paid, balance, last_payment_date')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .limit(1)
        .maybeSingle();
      const paymentQ = await supabase
        .from('student_payments')
        .select('amount_paid, payment_method, payment_date')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      const balanceRes = { data: balanceQ.error ? null : balanceQ.data };
      const paymentRes = { data: paymentQ.error ? null : paymentQ.data };

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
      const parents: ParentRow[] = mergedLite.map((pl, i) => {
        const dbRow = fromDb[i];
        const nm = String(pl.name ?? '').trim();
        return {
          name: nm || (pl.phone || pl.email ? 'Guardian' : '—'),
          phone: pl.phone ?? null,
          email: pl.email ?? null,
          parent_id: pl.parent_id,
          relationship: (dbRow?.relationship as string | null) ?? (s.guardian_relationship as string | null) ?? 'Guardian',
        } as ParentRow;
      });
      const photoUrl = (photoRes.data as { photo_url?: string } | null)?.photo_url?.trim() || '';
      const attToday = attendanceTodayRes.data as { present?: boolean } | null;
      const attAll = (attendanceAllRes.data || []) as { present?: boolean; date?: string }[];
      const examResults = (examRes.data || []) as {
        subject?: string;
        marks_obtained?: number;
        total_marks?: number;
        grade?: string;
      }[];
      const subjectRows = (subjectsRes.data || []) as { subject?: string }[];
      const feeBal = balanceRes.data as {
        total_fees?: number;
        total_paid?: number;
        balance?: number;
        last_payment_date?: string;
      } | null;
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

      const presentDays = attAll.filter((a) => a.present === true).length;
      const absentDays = attAll.filter((a) => a.present === false).length;
      const totalMarked = presentDays + absentDays;
      const overallRate = totalMarked > 0 ? Math.round((presentDays / totalMarked) * 100) : 0;

      const monthMap: Record<string, { present: number; total: number }> = {};
      attAll.forEach((a) => {
        if (!a.date) return;
        const month = new Date(a.date).toLocaleString('en', { month: 'short' });
        if (!monthMap[month]) monthMap[month] = { present: 0, total: 0 };
        monthMap[month].total++;
        if (a.present === true) monthMap[month].present++;
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
          } else if (attToday.present === true) {
            attMeta.textContent = '✓ Present';
            attMeta.className = 'sp-hero-meta-value green';
          } else {
            attMeta.textContent = '✗ Absent';
            attMeta.className = 'sp-hero-meta-value rose';
          }
        }

        const feeMeta = el.querySelector('#sp-meta-fee-balance') as HTMLElement | null;
        if (feeMeta) {
          const bal = feeBal?.balance ?? null;
          if (bal != null && Number(bal) > 0) {
            feeMeta.textContent = `${fmtUGX(Number(bal))} Owing`;
            feeMeta.className = 'sp-hero-meta-value amber';
          } else if (/overdue|unpaid|owing/.test(paymentStatus) && expectedFee > 0) {
            feeMeta.textContent = `${fmtUGX(expectedFee)} Owing`;
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
        if (noParentNotice) noParentNotice.style.display = parents.length === 0 ? 'flex' : 'none';
        if (parentsBody) {
          if (parents.length === 0) {
            parentsBody.innerHTML = '';
          } else {
            parentsBody.innerHTML = parents
              .map((p, i) => {
                const pname = escapeHtml(String(p.name ?? '—'));
                const rel = escapeHtml(String(p.relationship ?? s.guardian_relationship ?? 'Guardian'));
                const phone = String(p.phone ?? '').trim();
                const email = String(p.email ?? '').trim();
                const pid = String(p.parent_id ?? '');
                const wa = phone.replace(/\D/g, '');
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
                  <button type="button" class="sp-icon-btn" data-nav="/dashboard/admin/parents" title="Parents">›</button>
                </div>
              </div>
              <div class="sp-guardian-fields">
                <div><div class="sp-guardian-field-label">Phone</div><div class="sp-guardian-field-value">${phone ? `<a href="tel:${phone.replace(/\s/g, '')}">${escapeHtml(phone)}</a>` : '—'}</div></div>
                <div><div class="sp-guardian-field-label">Email</div><div class="sp-guardian-field-value">${email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : '—'}</div></div>
                <div><div class="sp-guardian-field-label">Parent ID</div><div class="sp-guardian-field-value" style="font-size:11px;word-break:break-all">${pid ? escapeHtml(pid) : '—'}</div></div>
              </div>
            </div>`;
              })
              .join('');
          }
        }

        set('#sp-current-term', 'Current term');
        set('#sp-class-position', 'Not yet ranked');
        if (subjectRows.length > 0) {
          setHTML(
            '#sp-subjects-list',
            subjectRows.map((x) => `<span class="sp-tag">${escapeHtml(String(x.subject ?? ''))}</span>`).join('')
          );
        }
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

        const billed = feeBal?.total_fees ?? expectedFee ?? 0;
        const paid = feeBal?.total_paid ?? 0;
        const balance = feeBal?.balance ?? Math.max(0, Number(billed) - Number(paid));
        set('#sp-fee-term-label', 'Fee Summary');
        set('#sp-fee-total-billed', fmtUGX(Number(billed)));
        set('#sp-fee-total-paid', fmtUGX(Number(paid)));
        const feeBalEl = el.querySelector('#sp-fee-balance') as HTMLElement | null;
        if (feeBalEl) {
          feeBalEl.textContent = balance > 0 ? `${fmtUGX(balance)}` : '—';
          feeBalEl.className = `sp-fee-value ${balance <= 0 ? 'green' : 'amber'}`;
        }
        set(
          '#sp-last-payment-date',
          lastPayment?.payment_date ? fmtDate(lastPayment.payment_date) : feeBal?.last_payment_date ? fmtDate(feeBal.last_payment_date) : '—'
        );
        set('#sp-payment-method', lastPayment?.payment_method ? String(lastPayment.payment_method) : '—');
        set('#sp-scholarship', disc);

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

        const wire = (sel: string, fn: () => void) => {
          const b = el.querySelector(sel);
          if (b) (b as HTMLElement).onclick = () => fn();
        };

        wire('#sp-btn-print', () => window.print());
        wire('#sp-btn-edit', () => navigate('/dashboard/admin/students'));
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
        wire('#sp-btn-change-photo', () => navigate('/dashboard/admin/students'));
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
  }, [htmlContent, studentId, navigate]);

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
