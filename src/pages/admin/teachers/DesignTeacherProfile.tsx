import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

import profileTemplateRaw from '@/assets/pwezacore-teacher-profile.html?raw';

const PROFILE_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

let cachedTeacherProfileHtml: string | null = null;

const TP_TABS = ['overview', 'classes', 'timetable', 'performance', 'kyc', 'academic', 'activity'] as const;

function parseInjectedHtml(raw: string): string {
  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let inner = bodyMatch ? bodyMatch[1].trim() : raw;
  inner = inner.replace(/<script[\s\S]*?<\/script>/gi, '');
  const styleBlock = styleMatch ? `<style>${styleMatch[1]}</style>` : '';
  return `${styleBlock}${inner}`;
}

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

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtShort(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-UG', { month: 'short', year: 'numeric' });
}

function splitName(full: string): { first: string; last: string } {
  const t = full.trim();
  if (!t) return { first: '—', last: '—' };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '—' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '—';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} year${age !== 1 ? 's' : ''}`;
}

function timeAgo(d: string | null | undefined): string {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  if (Number.isNaN(diff)) return '—';
  const days = Math.floor(diff / 86400000);
  if (days < 0) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
  return fmtDate(d);
}

function digitsOnly(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

function pickStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function normEmail(e: string | null | undefined): string {
  return String(e || '')
    .trim()
    .toLowerCase();
}

function fmtUGX(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `UGX ${Number(n).toLocaleString()}`;
}

export default function DesignTeacherProfile() {
  const navigate = useNavigate();
  const { teacher_id: teacherIdParam } = useParams<{ teacher_id: string }>();
  const teacherId = teacherIdParam || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const id = 'pweza-teacher-profile-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = PROFILE_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (cachedTeacherProfileHtml) {
      setHtmlContent(cachedTeacherProfileHtml);
      return;
    }
    cachedTeacherProfileHtml = parseInjectedHtml(profileTemplateRaw);
    setHtmlContent(cachedTeacherProfileHtml);
  }, []);

  useEffect(() => {
    if (!htmlContent || !teacherId) return;

    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: me } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      const schoolId = me?.school_id as string | undefined;

      const { data: teacher, error: teErr } = await supabase.from('teachers').select('*').eq('teacher_id', teacherId).maybeSingle();

      if (cancelled) return;

      if (teErr || !teacher || (schoolId && (teacher as { school_id?: string }).school_id !== schoolId)) {
        requestAnimationFrame(() => {
          const el = containerRef.current;
          const n = el?.querySelector('#tp-breadcrumb-name');
          if (n) n.textContent = 'Teacher not found';
        });
        return;
      }

      const t = teacher as Record<string, unknown>;
      const school_id = String(t.school_id ?? '');

      const [{ data: ctRows }, { data: tcsRows }, { data: studentsForClasses }, { data: teacherUsers }, ttRes] =
        await Promise.all([
          supabase.from('class_teachers').select('class_name').eq('school_id', school_id).eq('teacher_id', teacherId),
          supabase
            .from('teacher_class_subjects')
            .select('id, class_name, subject')
            .eq('school_id', school_id)
            .eq('teacher_id', teacherId)
            .order('class_name'),
          supabase.from('students').select('current_class').eq('school_id', school_id),
          supabase.from('users').select('email, is_active, updated_at').eq('school_id', school_id).eq('role', 'teacher'),
          supabase
            .from('timetable_periods')
            .select('class_name, day_of_week, subject, start_time, end_time')
            .eq('school_id', school_id)
            .eq('teacher_id', teacherId)
            .order('start_time'),
        ]);
      const ttRows = ttRes.error ? [] : ttRes.data || [];

      const want = normEmail(pickStr(t.email));
      const portalUser =
        want && teacherUsers
          ? (teacherUsers as { email?: string; is_active?: boolean; updated_at?: string }[]).find(
              (u) => normEmail(u.email) === want
            ) ?? null
          : null;

      const fullName = String(t.name || '').trim() || '—';
      const { first: firstName, last: lastName } = splitName(fullName);

      const classTeacherNames = new Set((ctRows || []).map((r) => String((r as { class_name?: string }).class_name || '').trim()).filter(Boolean));

      const assignments = (tcsRows || []) as { id: string; class_name: string; subject: string }[];

      const classFromTcs = [...new Set(assignments.map((a) => a.class_name).filter(Boolean))];
      const classNames = [...new Set([...classTeacherNames, ...classFromTcs])];
      const pu = portalUser as { email?: string; is_active?: boolean; updated_at?: string } | null;
      const portalActive = !!(pu && pu.is_active !== false && want && normEmail(pu.email) === want);

      const uniqueClasses = Array.from(
        new Set(
          (studentsForClasses || [])
            .map((s) => String((s as { current_class?: string }).current_class || '').trim())
            .filter(Boolean)
        )
      ).sort();

      if (cancelled) return;

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const root = el.querySelector('.pw-teacher-profile') || el;

        const set = (id: string, val: string) => {
          const n = root.querySelector(id);
          if (n) n.textContent = val;
        };
        const setHTML = (id: string, html: string) => {
          const n = root.querySelector(id);
          if (n) (n as HTMLElement).innerHTML = html;
        };

        const switchTab = (name: string) => {
          TP_TABS.forEach((tab) => {
            const panel = root.querySelector(`#tp-tab-${tab}`) as HTMLElement | null;
            if (panel) panel.style.display = tab === name ? '' : 'none';
          });
          root.querySelectorAll('.tp-tab').forEach((btn) => {
            btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === name);
          });
        };

        root.querySelectorAll('.tp-tab').forEach((btn) => {
          (btn as HTMLElement).onclick = () => switchTab((btn as HTMLElement).dataset.tab || 'overview');
        });

        set('#tp-breadcrumb-name', fullName);
        set('#tp-teacher-name', fullName);

        const photoUrl = pickStr(t.photo_url);
        const img = root.querySelector('#tp-photo-img') as HTMLImageElement | null;
        const iniEl = root.querySelector('#tp-photo-initials') as HTMLElement | null;
        if (img && iniEl) {
          if (photoUrl) {
            img.src = photoUrl;
            img.alt = fullName;
            img.style.display = 'block';
            iniEl.style.display = 'none';
          } else {
            img.style.display = 'none';
            iniEl.style.display = 'flex';
            iniEl.textContent = initials(fullName);
          }
        }

        const statusChip = root.querySelector('#tp-chip-status') as HTMLElement | null;
        if (statusChip) {
          statusChip.textContent = '✦ Active';
          statusChip.className = 'tp-chip green';
        }

        set('#tp-chip-emp-id', `🪪 ${pickStr(t.employee_id) || '—'}`);

        const roleChip = root.querySelector('#tp-chip-role') as HTMLElement | null;
        if (roleChip) {
          const isClassTeacher = classTeacherNames.size > 0;
          roleChip.textContent = isClassTeacher ? '👨‍🏫 Class Teacher' : '📚 Subject Teacher';
          roleChip.className = `tp-chip ${isClassTeacher ? 'teal' : 'blue'}`;
        }

        set('#tp-chip-hired', `📅 Hired ${fmtShort(pickStr(t.date_of_hire))}`);
        {
          const qual = pickStr(t.qualification);
          set('#tp-chip-dept', qual ? `🏫 ${qual}` : '🏫 Dept. —');
        }

        const phone = pickStr(t.phone);
        const email = pickStr(t.email);

        const phoneMeta = root.querySelector('#tp-meta-phone') as HTMLAnchorElement | null;
        if (phoneMeta) {
          if (phone) {
            phoneMeta.href = `tel:${phone.replace(/\s/g, '')}`;
            phoneMeta.textContent = phone;
          } else {
            phoneMeta.removeAttribute('href');
            phoneMeta.textContent = '—';
          }
        }
        const emailMeta = root.querySelector('#tp-meta-email') as HTMLAnchorElement | null;
        if (emailMeta) {
          if (email) {
            emailMeta.href = `mailto:${email}`;
            emailMeta.textContent = email;
          } else {
            emailMeta.removeAttribute('href');
            emailMeta.textContent = '—';
          }
        }

        set(
          '#tp-meta-classes-count',
          `${classNames.length} class${classNames.length !== 1 ? 'es' : ''}`
        );
        set('#tp-meta-salary', fmtUGX(t.salary != null ? Number(t.salary) : null));
        set('#tp-meta-hire-date', fmtDate(pickStr(t.date_of_hire)));

        set('#tp-first-name', firstName);
        set('#tp-last-name', lastName);
        set('#tp-gender', pickStr(t.gender) || '—');
        const dob = pickStr(t.dob);
        set('#tp-dob', fmtDate(dob));
        set('#tp-age', calcAge(dob));
        set('#tp-nationality', '—');
        set('#tp-religion', '—');
        set('#tp-nin', pickStr(t.national_id) || 'Not recorded');
        set('#tp-address', pickStr(t.address) || '—');
        set('#tp-district', '—');
        set('#tp-emergency', '—');

        set('#tp-emp-id', pickStr(t.employee_id) || '—');
        set('#tp-hire-date', fmtDate(pickStr(t.date_of_hire)));
        set('#tp-employment-type', '—');
        set('#tp-salary', fmtUGX(t.salary != null ? Number(t.salary) : null));
        set('#tp-bank-name', '—');
        set('#tp-bank-account', '—');
        set('#tp-department', '—');
        set('#tp-qualification', pickStr(t.qualification) || '—');
        set('#tp-prev-school', '—');
        set('#tp-years-exp', pickStr(t.experience) || '—');

        const ph = root.querySelector('#tp-phone') as HTMLAnchorElement | null;
        if (ph) {
          if (phone) {
            ph.href = `tel:${phone.replace(/\s/g, '')}`;
            ph.textContent = phone;
          } else {
            ph.removeAttribute('href');
            ph.textContent = '—';
          }
        }
        const wa = root.querySelector('#tp-whatsapp') as HTMLElement | null;
        if (wa) {
          const d = digitsOnly(phone || '');
          if (d.length >= 9) {
            wa.innerHTML = `<a href="https://wa.me/${d}" target="_blank" rel="noreferrer">${escapeHtml(phone || '')}</a>`;
          } else {
            wa.textContent = '—';
          }
        }
        const em = root.querySelector('#tp-email') as HTMLAnchorElement | null;
        if (em) {
          if (email) {
            em.href = `mailto:${email}`;
            em.textContent = email;
          } else {
            em.removeAttribute('href');
            em.textContent = '—';
          }
        }
        set('#tp-personal-email', '—');

        const ps = root.querySelector('#tp-portal-status') as HTMLElement | null;
        if (ps) {
          ps.textContent = portalActive ? '✓ Active' : '✗ Not registered';
          ps.className = `tp-field-value ${portalActive ? 'green' : 'muted'}`;
        }
        set('#tp-portal-email', email || '—');
        set('#tp-portal-last-login', pu?.updated_at ? timeAgo(pu.updated_at) : 'Never');
        set('#tp-portal-2fa', '⚠ Not enabled');
        setHTML(
          '#tp-portal-permissions',
          portalActive
            ? `<span class="tp-tag">Classes</span><span class="tp-tag">Attendance</span><span class="tp-tag">Reports</span>`
            : `<span class="tp-tag">—</span>`
        );

        const sel = root.querySelector('#tp-assign-class-select') as HTMLSelectElement | null;
        if (sel) {
          sel.innerHTML =
            `<option value="">Select class…</option>` +
            uniqueClasses.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        }

        setHTML(
          '#tp-assignments-body',
          assignments.length === 0
            ? `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">No class assignments yet. Use the form above to assign subjects.</div>`
            : assignments
                .map((a) => {
                  const isCt = classTeacherNames.has(a.class_name);
                  const roleBg = isCt
                    ? 'background:var(--teal-s);color:var(--teal)'
                    : 'background:var(--blue-s);color:var(--blue)';
                  const subs = String(a.subject || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map(
                      (s) =>
                        `<span style="background:var(--amber-s);color:var(--amber);padding:2px 7px;border-radius:5px;font-size:11.5px;font-weight:600">${escapeHtml(
                          s
                        )}</span>`
                    )
                    .join(' ');
                  return `
                <div class="tp-assign-row">
                  <div class="tp-assign-col">${escapeHtml(a.class_name)}</div>
                  <div class="tp-assign-col"><div style="display:flex;gap:4px;flex-wrap:wrap">${
                    subs || '<span style="color:var(--t3);font-style:italic">—</span>'
                  }</div></div>
                  <div class="tp-assign-col"><span style="${roleBg};padding:2px 8px;border-radius:5px;font-size:11.5px;font-weight:600">${
                    isCt ? 'Class Teacher' : 'Subject Teacher'
                  }</span></div>
                  <div class="tp-assign-actions">
                    <button type="button" class="tp-remove-btn" data-assign-id="${escapeHtml(a.id)}">Remove</button>
                  </div>
                </div>`;
                })
                .join('')
        );

        root.querySelectorAll('[data-assign-id]').forEach((btn) => {
          (btn as HTMLButtonElement).onclick = async (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).dataset.assignId;
            if (!id) return;
            await supabase.from('teacher_class_subjects').delete().eq('id', id);
            setReloadToken((x) => x + 1);
          };
        });

        const doAssign = root.querySelector('#tp-btn-do-assign') as HTMLButtonElement | null;
        if (doAssign) {
          doAssign.onclick = async () => {
            const cls = (root.querySelector('#tp-assign-class-select') as HTMLSelectElement)?.value;
            const subRaw = (root.querySelector('#tp-assign-subject-input') as HTMLInputElement)?.value || '';
            if (!cls || !school_id) return;
            const parts = subRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            if (parts.length === 0) {
              window.alert('Enter at least one subject (comma-separated).');
              return;
            }
            const rows = parts.map((subject) => ({
              school_id,
              teacher_id: teacherId,
              class_name: cls,
              subject,
            }));
            const { error } = await supabase.from('teacher_class_subjects').insert(rows);
            if (error) {
              window.alert(error.message);
              return;
            }
            const input = root.querySelector('#tp-assign-subject-input') as HTMLInputElement | null;
            if (input) input.value = '';
            setReloadToken((x) => x + 1);
          };
        }

        const slots = (ttRows || []) as {
          class_name: string;
          day_of_week: string;
          subject: string;
          start_time: string;
          end_time: string;
        }[];
        const ttBody = root.querySelector('#tp-timetable-body');
        if (ttBody) {
          if (slots.length === 0) {
            ttBody.innerHTML = `<div class="tp-empty" style="padding:28px"><div class="tp-empty-icon">📅</div><div class="tp-empty-title">No timetable entries</div><div class="tp-empty-sub">When periods are scheduled for this teacher in Timetable, they will show here.</div></div>`;
          } else {
            ttBody.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding:8px 0">
              ${slots
                .map(
                  (s) => `
                <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;background:var(--s1);border:1px solid var(--border);border-radius:10px;font-size:13px">
                  <span style="color:var(--t2)">${escapeHtml(s.day_of_week)} · ${escapeHtml(String(s.start_time))}–${escapeHtml(
                    String(s.end_time)
                  )}</span>
                  <span style="color:var(--t1);font-weight:600">${escapeHtml(s.class_name)} · ${escapeHtml(s.subject)}</span>
                </div>`
                )
                .join('')}
            </div>`;
          }
        }

        set('#tp-perf-present', '—');
        set('#tp-perf-absent', '—');
        set('#tp-perf-att-rate', '—');
        const attBar = root.querySelector('#tp-att-bar') as HTMLElement | null;
        if (attBar) attBar.style.width = '0%';
        set('#tp-perf-late', '—');
        set('#tp-perf-assignments-set', '—');
        set('#tp-perf-marked', '—');
        set('#tp-perf-mark-rate', '—');
        const markBar = root.querySelector('#tp-mark-bar') as HTMLElement | null;
        if (markBar) markBar.style.width = '0%';
        set('#tp-perf-avg-score', '—');

        setHTML(
          '#tp-kyc-body',
          `<div class="tp-empty"><div class="tp-empty-icon">📁</div><div class="tp-empty-title">No KYC documents</div><div class="tp-empty-sub">Uploads can be enabled when document storage is configured.</div></div>`
        );
        setHTML(
          '#tp-academic-body',
          `<div class="tp-empty"><div class="tp-empty-icon">🎓</div><div class="tp-empty-title">No academic documents</div><div class="tp-empty-sub">Uploads can be enabled when document storage is configured.</div></div>`
        );
        setHTML(
          '#tp-activity-body',
          `<div class="tp-empty"><div class="tp-empty-icon">🕐</div><div class="tp-empty-title">No activity recorded</div><div class="tp-empty-sub">Teacher activity logging can be connected here later.</div></div>`
        );

        const wireUpload = (inputSel: string) => {
          const inp = root.querySelector(inputSel) as HTMLInputElement | null;
          if (inp)
            inp.onchange = () => {
              window.alert('Document storage for teachers is not configured yet.');
              inp.value = '';
            };
        };
        wireUpload('#tp-kyc-file-input');
        wireUpload('#tp-academic-file-input');

        const kycIn = root.querySelector('#tp-kyc-file-input') as HTMLElement | null;
        const acIn = root.querySelector('#tp-academic-file-input') as HTMLElement | null;
        const kycDrop = root.querySelector('#tp-kyc-drop-zone') as HTMLElement | null;
        const acDrop = root.querySelector('#tp-academic-drop-zone') as HTMLElement | null;
        if (kycDrop) kycDrop.onclick = () => kycIn?.click();
        if (acDrop) acDrop.onclick = () => acIn?.click();
        const kycBtn = root.querySelector('#tp-btn-upload-kyc') as HTMLElement | null;
        const acBtn = root.querySelector('#tp-btn-upload-academic') as HTMLElement | null;
        if (kycBtn) kycBtn.onclick = () => kycIn?.click();
        if (acBtn) acBtn.onclick = () => acIn?.click();

        const printBtn = root.querySelector('#tp-btn-print') as HTMLElement | null;
        if (printBtn) printBtn.onclick = () => window.print();
        const editBtn = root.querySelector('#tp-btn-edit') as HTMLElement | null;
        if (editBtn) editBtn.onclick = () => navigate(`/dashboard/admin/teachers/${teacherId}/edit`);
        const createLoginBtn = root.querySelector('#tp-btn-create-login') as HTMLElement | null;
        if (createLoginBtn) createLoginBtn.onclick = () => navigate(`/dashboard/admin/teachers/${teacherId}/create-login`);
        const resetBtn = root.querySelector('#tp-btn-reset-pw') as HTMLElement | null;
        if (resetBtn) resetBtn.onclick = () => navigate('/dashboard/admin/accounts');
        const delBtn = root.querySelector('#tp-btn-delete') as HTMLElement | null;
        if (delBtn)
          delBtn.onclick = () => {
            if (!window.confirm(`Delete ${fullName}? This cannot be undone.`)) return;
            void supabase
              .from('teachers')
              .delete()
              .eq('teacher_id', teacherId)
              .then(() => navigate('/dashboard/admin/teachers'));
          };
        const assignClassBtn = root.querySelector('#tp-btn-assign-class') as HTMLElement | null;
        if (assignClassBtn) assignClassBtn.onclick = () => switchTab('classes');
        const viewSched = root.querySelector('#tp-btn-view-schedule') as HTMLElement | null;
        if (viewSched) viewSched.onclick = () => navigate('/dashboard/teacher/timetable');
        const editTt = root.querySelector('#tp-btn-edit-timetable') as HTMLElement | null;
        if (editTt) editTt.onclick = () => navigate('/dashboard/admin/settings');
        const managePortal = root.querySelector('#tp-btn-manage-portal') as HTMLElement | null;
        if (managePortal) managePortal.onclick = () => navigate(`/dashboard/admin/teachers/${teacherId}/create-login`);
        const changePhoto = root.querySelector('#tp-btn-change-photo') as HTMLElement | null;
        if (changePhoto)
          changePhoto.onclick = () =>
            window.alert('Photo upload from the profile design can be wired to storage in a future update.');

        root.querySelectorAll('[data-nav]').forEach((node) => {
          (node as HTMLElement).onclick = (e) => {
            e.preventDefault();
            const href = (node as HTMLElement).getAttribute('data-nav');
            if (href) navigate(href);
          };
        });
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [htmlContent, teacherId, navigate, reloadToken]);

  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () =>
      document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width: '100%', minHeight: '100vh', display: 'block' }}
    />
  );
}
