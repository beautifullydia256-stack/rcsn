import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { fetchAdminDesignDashboardKpis, type AdminDesignDashboardKpis } from '@/pages/admin/api/fetchAdminDesignDashboardKpis';
import { sendExpenseNotification } from '@/lib/sendExpenseNotification';
import { AddStudentForm } from '@/pages/admin/students/AddStudentForm';
import { AddTeacherForm } from '@/pages/admin/teachers/AddTeacherForm';
import { AddParentForm } from '@/pages/admin/parents/AddParentForm';
import { AddSchoolStaffForm } from '@/pages/admin/staff/AddSchoolStaffForm';
import RecordPaymentModal from '@/components/accountant/RecordPaymentModal';
import NativeModal from '@/components/NativeModal';

import designRaw from '../../../assets/designs/admin-dashboard.html?raw';

type AdminModal = 'student' | 'teacher' | 'parent' | 'staff' | 'payment' | 'appoint-head-teacher' | null;

type AppointHTProps = { isOpen: boolean; schoolId: string; onClose: () => void };

function AppointHeadTeacherModal({ isOpen, schoolId, onClose }: AppointHTProps) {
  const [query, setQuery] = useState('');
  const [teachers, setTeachers] = useState<Array<{ teacher_id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    setLoading(true);
    setDone(null);
    setQuery('');
    void (async () => {
      const { data } = await supabase
        .from('teachers')
        .select('teacher_id, name, email')
        .eq('school_id', schoolId)
        .order('name');
      setTeachers((data || []) as { teacher_id: string; name: string; email: string }[]);
      setLoading(false);
    })();
  }, [isOpen, schoolId]);

  const filtered = teachers.filter(
    (t) => !query.trim() || t.name?.toLowerCase().includes(query.toLowerCase()) || t.email?.toLowerCase().includes(query.toLowerCase())
  );

  const appoint = async (teacher: { teacher_id: string; name: string; email: string }) => {
    if (!teacher.email) { alert('Teacher has no email on record.'); return; }
    setSaving(teacher.teacher_id);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'head_teacher' })
        .eq('email', teacher.email.trim().toLowerCase());
      if (error) throw error;
      setDone(teacher.name || 'Teacher');
    } catch {
      alert('Failed to appoint head teacher. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <NativeModal isOpen={isOpen} onClose={onClose} title="Appoint Head Teacher" size="md">
      {done ? (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{done} appointed as Head Teacher</div>
          <div style={{ color: '#94a8d0', fontSize: 13, marginBottom: 24 }}>They will see the Head Teacher role when they next log in.</div>
          <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 10, background: '#10d9a8', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Done</button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Search teachers by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
          />
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a8d0' }}>Loading teachers…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a8d0' }}>No teachers found.</div>
          ) : (
            <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((t) => (
                <div key={t.teacher_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name || '—'}</div>
                    <div style={{ fontSize: 12, color: '#94a8d0', marginTop: 2 }}>{t.email || 'No email'}</div>
                  </div>
                  <button
                    onClick={() => void appoint(t)}
                    disabled={saving === t.teacher_id}
                    style={{ padding: '7px 16px', borderRadius: 8, background: '#10d9a8', color: '#000', fontWeight: 700, border: 'none', cursor: saving === t.teacher_id ? 'default' : 'pointer', fontSize: 12, opacity: saving === t.teacher_id ? 0.6 : 1 }}
                  >
                    {saving === t.teacher_id ? 'Saving…' : 'Appoint'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </NativeModal>
  );
}

const ADMIN_ROUTE_PREFIX = '/dashboard/admin';

type Props = {
  schoolId: string;
  adminName?: string;
  /** Dashboard home + data-nav targets use this prefix (default admin). */
  basePath?: string;
};

/** Map design / legacy paths to real router paths (always under /dashboard/admin in the map). */
export function rewriteNavPathForBase(path: string, basePath: string): string {
  if (!path.startsWith(ADMIN_ROUTE_PREFIX)) return path;
  const rest = path.slice(ADMIN_ROUTE_PREFIX.length);
  const normalized = basePath.replace(/\/$/, '');
  return normalized + rest;
}

function extractStyleAndBody(raw: string) {
  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const style = styleMatch?.[1] ?? '';
  const body = bodyMatch?.[1] ?? '';
  // The design file(s) sometimes contain `::root` typo in older versions.
  const fixedStyle = style.replace(/::root/g, ':root');
  // Integration spec: the design should be injected as *content only*
  // because sidebar/topbar are provided by `AdminLayout`.
  const contentOnlyBody = body.replace(/<header\s+class=["']pa-topbar["'][\s\S]*?<\/header>/i, '');
  return { style: fixedStyle, body: contentOnlyBody };
}

const CACHED_DESIGN = extractStyleAndBody(designRaw);

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#039;';
      default:
        return c;
    }
  });
}

function initialsFromName(name: string) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('') || '—'
  );
}

function formatDateShort(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

function mapNavPath(path: string) {
  // The design HTML uses some route names that don't match the current React Router paths.
  // Map them to existing routes so clicks always navigate correctly.
  const MAP: Record<string, string> = {
    '/dashboard/admin/students/new': '/dashboard/admin/students?add=1',
    '/dashboard/admin/teachers/new': '/dashboard/admin/teachers?add=1',
    '/dashboard/admin/parents/new': '/dashboard/admin/parents?add=1',
    '/dashboard/admin/user-management': '/dashboard/admin/accounts',
    '/dashboard/admin/system-settings': '/dashboard/admin/settings',
    '/dashboard/admin/location-settings': '/dashboard/admin/settings/location',
    '/dashboard/admin/receipts': '/dashboard/admin/outstanding',
    '/dashboard/admin/finance': '/dashboard/admin/outstanding',
    '/dashboard/admin/job-vacancies/new': '/dashboard/admin/jobs',
    '/dashboard/admin/job-vacancies': '/dashboard/admin/jobs',
  };
  return MAP[path] ?? path;
}

function fmtKpiAmount(n: number) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Fills `.pa-kpi` nodes in the design HTML (`data-kpi` attributes) — same metrics as accountant term logic. */
function applyAdminDesignKpisToDom(root: HTMLElement, kpis: AdminDesignDashboardKpis | undefined, pending: boolean) {
  const set = (key: string, val: string) => {
    const node = root.querySelector(`[data-kpi="${key}"]`) as HTMLElement | null;
    if (node && node.textContent !== val) node.textContent = val;
  };

  const dash = '—';
  if (pending || !kpis) {
    [
      'total-students',
      'total-teachers',
      'attendance-today',
      'attendance-sub',
      'active-classes',
      'fees-invoiced',
      'fees-invoiced-sub',
      'fees-attributed',
      'fees-attributed-sub',
      'outstanding-term',
      'outstanding-term-sub',
      'collection-rate',
      'collection-rate-sub',
      'students-badge',
      'teachers-badge',
      'attendance-badge',
      'classes-badge',
      'fees-invoiced-badge',
      'fees-attributed-badge',
      'outstanding-badge',
      'collection-rate-badge',
    ].forEach((k) => set(k, dash));
    return;
  }

  set('total-students', kpis.totalStudents.toLocaleString('en-US'));
  set('students-sub', 'Active enrollments');
  set('students-badge', 'Active');

  set('total-teachers', kpis.totalTeachers.toLocaleString('en-US'));
  set('teachers-sub', 'Staff members');
  set('teachers-badge', 'Staff');

  set('attendance-today', kpis.attendanceDisplay);
  set('attendance-sub', kpis.attendanceSub);
  set('attendance-badge', 'Today');

  set('active-classes', kpis.activeClasses.toLocaleString('en-US'));
  set('classes-sub', 'Across all streams');
  set('classes-badge', 'Streams');

  set('fees-invoiced', fmtKpiAmount(kpis.feesExpected));
  set(
    'fees-invoiced-sub',
    kpis.currentTermLabel ? `Current term: ${kpis.currentTermLabel}` : 'Current term (engine calendar)'
  );
  set('fees-invoiced-badge', 'Term');

  set('fees-attributed', fmtKpiAmount(kpis.feesCollectedAttributed));
  set('fees-attributed-sub', 'Same basis as accountant dashboard');
  set('fees-attributed-badge', 'Term');

  set('outstanding-term', fmtKpiAmount(kpis.outstandingOnTerm));
  set('outstanding-term-sub', 'Balances on current term ledger');
  set('outstanding-badge', 'Due');

  set('collection-rate', kpis.collectionRatePercent != null ? `${kpis.collectionRatePercent}%` : dash);
  set('collection-rate-sub', 'When expected fees > 0');
  set('collection-rate-badge', '%');
}

function updateDateLine(el: HTMLElement) {
  const line = el.querySelector('#pa-date-line');
  if (!line) return;
  try {
    line.textContent = new Date().toLocaleDateString('en-UG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    line.textContent = '';
  }
}

function updateGreeting(el: HTMLElement, adminName?: string) {
  const displayName = (adminName || '').trim();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const titleEl = el.querySelector('.pa-page-title') as HTMLElement | null;
  const subEl = el.querySelector('.pa-page-sub') as HTMLElement | null;

  updateDateLine(el);

  if (titleEl) {
    titleEl.textContent = displayName ? `${greeting}, ${displayName} 👋` : `${greeting} 👋`;
  }
  if (subEl) {
    subEl.textContent = "Here's what's happening across your school today.";
  }
}

async function runSearch(query: string, container: HTMLElement, schoolIdForSearch: string, navBase: string) {
  const q = query.trim();
  if (q.length < 2) return;

  const wrap = container.querySelector('.pa-search-wrap') as HTMLElement | null;
  if (!wrap) return;

  try {
    const [studentsRes, teachersRes] = await Promise.all([
      supabase
        .from('students')
        .select('student_id, name, current_class, admission_number')
        .eq('school_id', schoolIdForSearch)
        .or(`name.ilike.%${q}%,admission_number.ilike.%${q}%,current_class.ilike.%${q}%`)
        .limit(5),
      supabase
        .from('teachers')
        .select('teacher_id, name, email')
        .eq('school_id', schoolIdForSearch)
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(3),
    ]);

    const results: Array<{ label: string; sub: string; path: string }> = [
      ...((studentsRes.data || []) as any[]).map((s) => ({
        label: s.name || 'Student',
        sub: `Student · ${s.current_class || ''}`,
        path: `${navBase}/students`,
      })),
      ...((teachersRes.data || []) as any[]).map((t) => ({
        label: t.name || 'Teacher',
        sub: `Teacher · ${t.email || ''}`,
        path: `${navBase}/teachers`,
      })),
    ];

    container.querySelector('#pa-search-dropdown')?.remove();
    if (results.length === 0) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'pa-search-dropdown';
    Object.assign(dropdown.style, {
      position: 'absolute',
      top: '38px',
      left: '0',
      right: '0',
      background: '#0b1120',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '9px',
      zIndex: '999',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    } as Partial<CSSStyleDeclaration>);

    results.forEach((r) => {
      const item = document.createElement('div');
      item.style.cssText =
        'padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12.5px;color:#eef3ff;';
      item.innerHTML = `<div style="font-weight:600">${escapeHtml(r.label)}</div><div style="font-size:10.5px;color:#3d5278;margin-top:1px">${escapeHtml(
        r.sub
      )}</div>`;
      item.onmouseenter = () => {
        item.style.background = '#101828';
      };
      item.onmouseleave = () => {
        item.style.background = '';
      };
      item.onclick = () => {
        dropdown.remove();
        window.dispatchEvent(new CustomEvent('pweza-navigate', { detail: r.path }));
      };
      dropdown.appendChild(item);
    });

    wrap.style.position = 'relative';
    wrap.appendChild(dropdown);

    // Close on outside click
    const closeDropdown = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    };
    setTimeout(() => document.addEventListener('click', closeDropdown), 100);
  } catch (err) {
    console.error('Search error:', err);
  }
}

async function loadStaff(schoolId: string, setHtml: (id: string, html: string) => void, navBase: string) {
  try {
    const { data } = await supabase
      .from('teachers')
      .select('teacher_id, name, email')
      .eq('school_id', schoolId)
      .limit(5);

    if (!data || data.length === 0) {
      setHtml('pa-staff-list', '<div class="pa-empty-state"><span>No staff found</span></div>');
      return;
    }

    const gradients = [
      'linear-gradient(135deg,#10d9a8,#3d8ef8)',
      'linear-gradient(135deg,#9d7bf8,#ec4899)',
      'linear-gradient(135deg,#f5a623,#ef4444)',
      'linear-gradient(135deg,#22d3ee,#3d8ef8)',
      'linear-gradient(135deg,#f75c5c,#9d7bf8)',
    ];

    const html = data
      .map((t: any, i: number) => {
        const initials = initialsFromName(String(t.name || 'Teacher'));
        const bg = gradients[i % gradients.length];
        return `
          <div class="pa-staff-row" data-nav="${navBase}/teachers/${escapeHtml(String(t.teacher_id || ''))}">
            <div class="pa-staff-av" style="background:${bg}">${escapeHtml(initials)}</div>
            <div style="flex:1;">
              <div class="pa-staff-name">${escapeHtml(String(t.name || '—'))}</div>
              <div class="pa-staff-sub">Teaching</div>
            </div>
            <span class="pa-chip teal">● Teaching</span>
          </div>`;
      })
      .join('');

    setHtml('pa-staff-list', html);
  } catch (err) {
    console.error('Staff load error:', err);
  }
}

async function loadExpenses(
  schoolId: string,
  setHtml: (id: string, html: string) => void,
  setText: (sel: string, val: string) => void,
  el: HTMLElement
) {
  try {
    const { data: expenses } = await supabase
      .from('school_expenses')
      .select('expense_id, category_name, description, amount, created_at')
      .eq('school_id', schoolId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    const countRes = await supabase
      .from('school_expenses')
      .select('expense_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'pending');

    const expCount = countRes.count ?? 0;
    const badge = el.querySelector('#pa-expense-count') as HTMLElement | null;
    if (badge) badge.textContent = `${expCount} pending`;

    if (!expenses || expenses.length === 0) {
      setHtml('pa-expenses-list', '<div class="pa-empty-state"><span>No pending expenses ✓</span></div>');
      return;
    }

    const icons = ['🖨️', '🔧', '📚', '🚌', '📄'];
    const iconBgs = ['var(--amber-s)', 'var(--blue-s)', 'var(--teal-s)', 'var(--rose-s)', 'var(--violet-s)'];

    const html = expenses
      .map((exp: any, i: number) => {
        const amt = Number(exp.amount || 0).toLocaleString('en-US');
        const date = formatDateShort(exp.created_at);
        return `
          <div class="pa-expense-row" data-expense-id="${escapeHtml(String(exp.expense_id))}">
            <div class="pa-expense-ic" style="background:${iconBgs[i % iconBgs.length]}">${icons[i % icons.length]}</div>
            <div style="flex:1;">
              <div class="pa-expense-title">${escapeHtml(String(exp.category_name || 'Expense'))}</div>
              <div class="pa-expense-sub">Submitted ${escapeHtml(date)}</div>
            </div>
            <div class="pa-expense-amount">USh ${escapeHtml(amt)}</div>
            <div class="pa-ea-btns">
              <button class="pa-ea-btn approve">✓ Approve</button>
              <button class="pa-ea-btn decline">✕ Decline</button>
            </div>
          </div>`;
      })
      .join('');

    setHtml('pa-expenses-list', html);
  } catch (err) {
    console.error('Expenses load error:', err);
  }
}

async function loadPayments(
  schoolId: string,
  setHtml: (id: string, html: string) => void
) {
  try {
    const todayIso = new Date().toISOString().slice(0, 10);
    const engine = await resolveCurrentSchoolTerm(supabase, schoolId, todayIso);
    let termStart = '1900-01-01';
    let termEnd = '2100-12-31';
    if (engine?.id) {
      const { data: stRow } = await supabase
        .from('school_terms')
        .select('global_term_id, start_date, end_date')
        .eq('id', engine.id)
        .maybeSingle();
      if (stRow?.global_term_id) {
        const { data: gt } = await supabase
          .from('global_terms')
          .select('window_start, hard_stop_date')
          .eq('id', stRow.global_term_id)
          .maybeSingle();
        if (gt?.window_start && gt?.hard_stop_date) {
          termStart = gt.window_start;
          termEnd = gt.hard_stop_date;
        } else if (stRow.start_date && stRow.end_date) {
          termStart = stRow.start_date;
          termEnd = stRow.end_date;
        }
      } else if (stRow?.start_date && stRow?.end_date) {
        termStart = stRow.start_date;
        termEnd = stRow.end_date;
      }
    }

    const { data: payments } = await supabase
      .from('student_payments')
      .select('payment_id, amount_paid, payment_date, payment_method, student_id, students!inner(name)')
      .eq('school_id', schoolId)
      .gte('payment_date', termStart)
      .lte('payment_date', termEnd)
      .order('payment_date', { ascending: false })
      .limit(5);

    if (!payments || payments.length === 0) {
      setHtml('pa-payments-list', '<div class="pa-empty-state"><span>No payments this term</span></div>');
      return;
    }

    const gradients = [
      'linear-gradient(135deg,#10d9a8,#3d8ef8)',
      'linear-gradient(135deg,#9d7bf8,#f43f5e)',
      'linear-gradient(135deg,#f5a623,#ef4444)',
      'linear-gradient(135deg,#22d3ee,#9d7bf8)',
      'linear-gradient(135deg,#3d8ef8,#10d9a8)',
    ];

    const html = payments
      .map((p: any, i: number) => {
        const name =
          p.students?.name ||
          (Array.isArray(p.students) ? p.students[0]?.name : p.students?.name) ||
          'Student';
        const initials = initialsFromName(String(name));
        const amt = Number(p.amount_paid || 0).toLocaleString('en-US');
        const date = formatDateShort(p.payment_date);
        const method = p.payment_method || 'Cash';

        return `
          <div class="pa-pay-row">
            <div class="pa-pay-av" style="background:${gradients[i % gradients.length]}">${escapeHtml(initials)}</div>
            <div style="flex:1;">
              <div class="pa-pay-name">${escapeHtml(String(name))}</div>
              <div class="pa-pay-meta">${escapeHtml(date)}</div>
            </div>
            <span class="pa-pay-method">${escapeHtml(String(method))}</span>
            <div class="pa-pay-amount">USh ${escapeHtml(amt)}</div>
          </div>`;
      })
      .join('');

    setHtml('pa-payments-list', html);
  } catch (err) {
    console.error('Payments load error:', err);
  }
}

async function loadUpcoming(schoolId: string, setHtml: (id: string, html: string) => void, navBase: string) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: events } = await supabase
      .from('school_events')
      .select('id:event_id, title, event_date, event_type, description')
      .eq('school_id', schoolId)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(8);

    if (!events || events.length === 0) {
      setHtml('pa-upcoming-list', '<div class="pa-empty-state"><span>No upcoming events. Add events in Settings → Upcoming Events.</span></div>');
      return;
    }

    const typeChips: Record<string, string> = {
      exam:    '<span class="pa-chip violet">Exam</span>',
      holiday: '<span class="pa-chip teal">Holiday</span>',
      meeting: '<span class="pa-chip amber">Meeting</span>',
      sports:  '<span class="pa-chip blue">Sports</span>',
      other:   '<span class="pa-chip">Event</span>',
    };

    const html = (events as any[])
      .map((ev) => {
        const d = new Date(ev.event_date + 'T00:00:00');
        const day = String(d.getDate()).padStart(2, '0');
        const mon = d.toLocaleString('en', { month: 'short' }).toUpperCase();
        const chip = typeChips[ev.event_type] ?? typeChips.other;
        const sub = ev.description ? escapeHtml(String(ev.description)) : '';
        return `
          <div class="pa-upcoming-item" data-nav="${navBase}/settings/events">
            <div class="pa-upcoming-date">
              <div class="pa-ud-day">${escapeHtml(day)}</div>
              <div class="pa-ud-mon">${escapeHtml(mon)}</div>
            </div>
            <div class="pa-upcoming-sep"></div>
            <div style="flex:1;min-width:0;">
              <div class="pa-upcoming-title">${escapeHtml(String(ev.title || 'Event'))}</div>
              ${sub ? `<div class="pa-upcoming-sub">${sub}</div>` : ''}
            </div>
            ${chip}
          </div>`;
      })
      .join('');

    setHtml('pa-upcoming-list', html);
  } catch (err) {
    console.error('Upcoming load error:', err);
  }
}

async function loadReminder(schoolId: string, el: HTMLElement) {
  try {
    const { data } = await supabase
      .from('notifications')
      .select('notification_id, title, message, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5);

    const area = el.querySelector('#pa-reminder-area') as HTMLElement | null;
    if (!area) return;

    if (!data || data.length === 0) {
      area.innerHTML = `<div style="display:flex;gap:9px;align-items:center;padding:9px 12px;border-radius:8px;background:var(--teal-s);border:1px solid rgba(16,217,168,0.18);">
        <span>✅</span>
        <div>
          <div style="font-size:11.5px;font-weight:600;color:var(--teal)">All caught up!</div>
          <div style="font-size:10.5px;color:var(--t2);margin-top:2px">No pending reminders.</div>
        </div>
      </div>`;
      return;
    }

    const html = (data as Record<string, unknown>[]).map((n) => `
      <div style="display:flex;gap:9px;align-items:flex-start;padding:9px 12px;border-radius:8px;background:var(--amber-s);border:1px solid rgba(245,166,35,0.18);">
        <span style="flex-shrink:0;margin-top:1px;">🔔</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11.5px;font-weight:600;color:var(--amber);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(String(n.title || 'Reminder'))}</div>
          <div style="font-size:10.5px;color:var(--t2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(String(n.message || ''))}</div>
        </div>
      </div>`).join('');

    area.innerHTML = html;
  } catch (err) {
    console.error('Reminder load error:', err);
  }
}

async function loadRecentActivity(schoolId: string, setHtml: (id: string, html: string) => void, navBase: string, el: HTMLElement) {
  try {
    const lastSeenStr = (() => { try { return localStorage.getItem('pweza_activity_last_seen'); } catch { return null; } })();
    const lastSeenMs = lastSeenStr ? Number(lastSeenStr) : 0;

    const [paymentsRes, expensesRes, attendanceRes, enrollmentsRes] = await Promise.all([
      supabase
        .from('student_payments')
        .select('payment_id, amount_paid, payment_date, students(name)')
        .eq('school_id', schoolId)
        .order('payment_date', { ascending: false })
        .limit(6),
      supabase
        .from('school_expenses')
        .select('expense_id, category_name, amount, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('student_attendance')
        .select('class_name, date, created_at')
        .eq('school_id', schoolId)
        .order('date', { ascending: false })
        .limit(80),
      supabase
        .from('students')
        .select('student_id, name, current_class, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(4),
    ]);

    type ActivityItem = { icon: string; iconBg: string; text: string; timeIso: string; navPath: string };
    const items: ActivityItem[] = [];

    for (const p of (paymentsRes.data || []) as Record<string, unknown>[]) {
      const studs = p.students as Record<string, unknown> | Record<string, unknown>[] | null;
      const name = (Array.isArray(studs) ? studs[0]?.name : (studs as Record<string, unknown> | null)?.name) ?? 'Student';
      const amt = Number(p.amount_paid || 0).toLocaleString('en-US');
      items.push({
        icon: '💳', iconBg: 'var(--teal-s)',
        text: `Payment received — <strong>${escapeHtml(String(name))}</strong> paid UGX ${amt}`,
        timeIso: String(p.payment_date || p.created_at || ''),
        navPath: `${navBase}/outstanding`,
      });
    }

    for (const e of (expensesRes.data || []) as Record<string, unknown>[]) {
      const cat = String(e.category_name || 'Expense');
      const amt = Number(e.amount || 0).toLocaleString('en-US');
      items.push({
        icon: '🧾', iconBg: 'var(--amber-s)',
        text: `Expense recorded — <strong>${escapeHtml(cat)}</strong> — UGX ${amt}`,
        timeIso: String(e.created_at || ''),
        navPath: `${navBase}/finance`,
      });
    }

    const seenAtt = new Set<string>();
    for (const r of (attendanceRes.data || []) as Record<string, unknown>[]) {
      const cls = String(r.class_name || '');
      const dt = String(r.date || '');
      const key = `${cls}|${dt}`;
      if (seenAtt.has(key)) continue;
      seenAtt.add(key);
      items.push({
        icon: '📋', iconBg: 'var(--blue-s)',
        text: `Attendance taken${cls ? ` — <strong>${escapeHtml(cls)}</strong>` : ''}`,
        timeIso: dt || String(r.created_at || ''),
        navPath: `${navBase}/attendance`,
      });
      if (seenAtt.size >= 5) break;
    }

    for (const s of (enrollmentsRes.data || []) as Record<string, unknown>[]) {
      const name = String(s.name || 'Student');
      const cls = String(s.current_class || '');
      items.push({
        icon: '👨‍🎓', iconBg: 'var(--violet-s)',
        text: `Student enrolled — <strong>${escapeHtml(name)}</strong>${cls ? ` · ${escapeHtml(cls)}` : ''}`,
        timeIso: String(s.created_at || ''),
        navPath: `${navBase}/students`,
      });
    }

    items.sort((a, b) => b.timeIso.localeCompare(a.timeIso));
    const top10 = items.slice(0, 10);

    const badge = el.querySelector('#pa-activity-badge') as HTMLElement | null;

    if (top10.length === 0) {
      setHtml('pa-syshealth-list', '<div class="pa-empty-state"><span style="font-size:28px;opacity:.4">🕐</span><span>No recent activity</span></div>');
      if (badge) badge.style.display = 'none';
      return;
    }

    const unseenCount = top10.filter((item) => {
      const ms = new Date(item.timeIso).getTime();
      return !isNaN(ms) && ms > lastSeenMs;
    }).length;

    if (badge) {
      if (unseenCount > 0) {
        badge.textContent = `${unseenCount} new`;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }

    const timeAgo = (iso: string) => {
      try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
      } catch { return '—'; }
    };

    const html = top10.map((item) => {
      const itemMs = new Date(item.timeIso).getTime();
      const isNew = !isNaN(itemMs) && itemMs > lastSeenMs;
      return `<div class="pa-act-row" data-nav="${escapeHtml(item.navPath)}" style="cursor:pointer;">
        <div style="width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;background:${item.iconBg};">${item.icon}</div>
        <div style="flex:1;min-width:0;">
          <div class="pa-act-main">${item.text}</div>
          <div class="pa-act-time">${timeAgo(item.timeIso)}</div>
        </div>
        ${isNew ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--teal);flex-shrink:0;align-self:center;"></div>' : ''}
      </div>`;
    }).join('');

    setHtml('pa-syshealth-list', html);
  } catch (err) {
    console.error('Activity load error:', err);
  }
}

async function loadJobVacancies(schoolId: string, setHtml: (id: string, html: string) => void, navBase: string) {
  try {
    const { data } = await supabase
      .from('jobs')
      .select('job_id, title, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!data || data.length === 0) {
      setHtml('pa-jobs-list', '<div class="pa-empty-state" style="padding:16px"><span>No open vacancies</span></div>');
      return;
    }

    const icons = ['⚗️', '📚', '🔭'];
    const chips = ['pa-chip teal', 'pa-chip violet', 'pa-chip blue'];

    const html = data
      .map((job: any, i: number) => {
        const date = job.created_at ? new Date(job.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : '';
        // This codebase does not currently expose application counts in the admin job insert flow.
        const apps = job.applications_count ?? 0;
        return `
          <div class="pa-job-row" data-nav="${navBase}/jobs">
            <div style="width:30px;height:30px;border-radius:8px;background:var(--teal-s);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${icons[i % icons.length]}</div>
            <div style="flex:1;">
              <div class="pa-job-title">${escapeHtml(String(job.title || 'Position'))}</div>
              <div class="pa-job-sub">Posted ${escapeHtml(date)}</div>
            </div>
            <span class="${chips[i % chips.length]}">${apps} applied</span>
          </div>`;
      })
      .join('');

    setHtml('pa-jobs-list', html);
  } catch (err) {
    console.error('Jobs load error:', err);
  }
}

const DASHBOARD_MOTION_KILL = `
.pweza-admin .pa-fu,
.pweza-admin .pa-d1,
.pweza-admin .pa-d2,
.pweza-admin .pa-d3,
.pweza-admin .pa-d4,
.pweza-admin .pa-d5 {
  animation: none !important;
  animation-delay: 0 !important;
  opacity: 1 !important;
  transform: none !important;
}
.pweza-admin .pa-kpi:hover {
  transform: none !important;
}
.pweza-admin .pa-kpi {
  transition: border-color 0.2s, box-shadow 0.2s;
}
.pweza-admin .pa-qa-btn:hover {
  transform: none !important;
}
`;

export default function DesignAdminDashboard({ schoolId, adminName, basePath = ADMIN_ROUTE_PREFIX }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminModal, setAdminModal] = useState<AdminModal>(null);
  const navBase = basePath.replace(/\/$/, '');
  const isDashboardRoute = location.pathname === navBase || location.pathname === `${navBase}/`;

  const resolveNav = useCallback(
    (path: string) => rewriteNavPathForBase(mapNavPath(path), navBase),
    [navBase]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  /** Avoid re-injecting the same template; React must not use dangerouslySetInnerHTML or re-renders wipe KPI DOM updates. */
  const lastInjectedBodyRef = useRef<string | null>(null);
  const adminNameRef = useRef(adminName);
  useEffect(() => {
    adminNameRef.current = adminName;
  }, [adminName]);

  const { style: scopedStyle, body: scopedBody } = CACHED_DESIGN;

  const { data: designKpis, isPending: kpiPending } = useQuery({
    queryKey: adminQueryKeys.adminDashboardKpis(schoolId),
    queryFn: () => fetchAdminDesignDashboardKpis(schoolId),
    enabled: !!schoolId && isDashboardRoute,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    refetchInterval: isDashboardRoute ? 30_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const syncTheme = useCallback((isDark: boolean) => {
    const container = containerRef.current;
    if (!container) return;
    const root = container.querySelector('.pweza-admin') as HTMLElement | null;
    if (!root) return;

    if (isDark) {
      root.style.setProperty('--bg', '#05080f');
      root.style.setProperty('--s1', '#0b1120');
      root.style.setProperty('--s2', '#101828');
      root.style.setProperty('--s3', '#141c2e');
      root.style.setProperty('--s4', '#1d2d4e');
      root.style.setProperty('--t1', '#f8fafc');
      root.style.setProperty('--t2', '#c5d4ef');
      root.style.setProperty('--t3', '#94a8d0');
      root.style.setProperty('--border', 'rgba(255,255,255,0.07)');
      root.style.background = '#05080f';
    } else {
      root.style.setProperty('--bg', '#f0f4f8');
      root.style.setProperty('--s1', '#ffffff');
      root.style.setProperty('--s2', '#f5f7fa');
      root.style.setProperty('--s3', '#e8edf5');
      root.style.setProperty('--s4', '#d0dbe8');
      root.style.setProperty('--t1', '#0d1c2e');
      root.style.setProperty('--t2', '#4a6080');
      root.style.setProperty('--t3', '#8aa0b8');
      root.style.setProperty('--border', 'rgba(0,0,0,0.08)');
      root.style.background = '#f0f4f8';
    }
  }, []);

  const runAllDataLoads = useCallback(async () => {
    const el = containerRef.current;
    if (!el || !schoolId) return;

    updateGreeting(el, adminNameRef.current);

    const setText = (sel: string, val: string) => {
      const node = el.querySelector(sel) as HTMLElement | null;
      if (node) node.textContent = val;
    };
    const setHtml = (id: string, html: string) => {
      const node = el.querySelector(`#${id}`) as HTMLElement | null;
      if (node) node.innerHTML = html;
    };

    await Promise.all([
      loadStaff(schoolId, setHtml, navBase),
      loadExpenses(schoolId, setHtml, setText, el),
      loadPayments(schoolId, setHtml),
      loadUpcoming(schoolId, setHtml, navBase),
      loadReminder(schoolId, el),
      loadJobVacancies(schoolId, setHtml, navBase),
      loadRecentActivity(schoolId, setHtml, navBase, el),
    ]);
  }, [schoolId, navBase]);

  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail as string | undefined;
      if (!path) return;
      navigate(resolveNav(path));
    };
    window.addEventListener('pweza-navigate', handler);
    return () => window.removeEventListener('pweza-navigate', handler);
  }, [navigate, resolveNav]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Navigation via data-nav attributes
    const handleClick = (e: MouseEvent) => {
      // Wire the inline Add Student button (no data-nav)
      const addStudentBtn = (e.target as Element | null)?.closest?.('#pa-add-student-btn') as HTMLElement | null;
      if (addStudentBtn) { e.preventDefault(); e.stopPropagation(); setAdminModal('student'); return; }

      const target = (e.target as Element | null)?.closest?.('[data-nav]') as HTMLElement | null;
      if (!target) return;
      const path = target.getAttribute('data-nav');
      if (!path) return;

      // Intercept Add Student / Teacher / Parent → open modal instead of navigating
      if (path === '/dashboard/admin/students/new') { e.preventDefault(); e.stopPropagation(); setAdminModal('student'); return; }
      if (path === '/dashboard/admin/teachers/new') { e.preventDefault(); e.stopPropagation(); setAdminModal('teacher'); return; }
      if (path === '/dashboard/admin/parents/new')  { e.preventDefault(); e.stopPropagation(); setAdminModal('parent');  return; }
      if (path === '/dashboard/admin/staff/new')    { e.preventDefault(); e.stopPropagation(); setAdminModal('staff');   return; }
      if (path === '/dashboard/admin/payment/new') { e.preventDefault(); e.stopPropagation(); setAdminModal('payment'); return; }
      if (path === '/dashboard/admin/appoint-head-teacher') { e.preventDefault(); e.stopPropagation(); setAdminModal('appoint-head-teacher'); return; }

      e.preventDefault();
      e.stopPropagation();
      // Mark activity as seen when clicking "View All Activity"
      if (target.id === 'pa-activity-view-all') {
        try { localStorage.setItem('pweza_activity_last_seen', Date.now().toString()); } catch { /* ignore */ }
        const badge = el?.querySelector('#pa-activity-badge') as HTMLElement | null;
        if (badge) badge.style.display = 'none';
      }
      navigate(resolveNav(path));
    };

    el.addEventListener('click', handleClick);

    // Wire search input (design-owned)
    const searchInput = el.querySelector('#pa-search-input') as HTMLInputElement | null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onInput = (ev: Event) => {
      const val = (ev.target as HTMLInputElement).value.trim();
      if (timer) clearTimeout(timer);
      if (val.length < 2) return;
      if (!schoolId) return;
      timer = setTimeout(() => {
        void runSearch(val, el, schoolId, navBase).catch(console.error);
      }, 300);
    };
    if (searchInput) searchInput.addEventListener('input', onInput);

    // Expense approve/decline (delegated)
    const handleExpenseButtons = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.('.pa-ea-btn') as HTMLElement | null;
      if (!btn) return;
      const approveBtn = (e.target as Element | null)?.closest?.('.pa-ea-btn.approve') as HTMLElement | null;
      const declineBtn = (e.target as Element | null)?.closest?.('.pa-ea-btn.decline') as HTMLElement | null;
      if (!approveBtn && !declineBtn) return;

      const row = (btn.closest?.('.pa-expense-row') as HTMLElement | null) ?? null;
      const expenseId = row?.getAttribute('data-expense-id');
      if (!row || !expenseId) return;

      const action = approveBtn ? 'approve' : 'decline';
      row.style.opacity = '0.4';
      row.style.pointerEvents = 'none';

      void (async () => {
        try {
          const { error } = await supabase.functions.invoke('approve-expense', {
            body: {
              expense_id: expenseId,
              action: action,
            },
          });

          if (error) throw error;

          // Send notification to the accountant who recorded the expense
          const { data: { user } } = await supabase.auth.getUser();
          const { data: userRow } = await supabase
            .from('users')
            .select('school_id')
            .eq('user_id', user?.id)
            .single();
          
          if (userRow?.school_id) {
            await sendExpenseNotification(expenseId, action, userRow.school_id);
          }

          const countEl = el.querySelector('#pa-expense-count') as HTMLElement | null;
          if (countEl) {
            const current = parseInt((countEl.textContent || '').replace(/[^0-9]/g, ''), 10) || 0;
            const next = Math.max(0, current - 1);
            countEl.textContent = `${next} pending`;
          }
          void queryClient.invalidateQueries({ queryKey: adminQueryKeys.adminDashboardKpis(schoolId) });
        } catch {
          row.style.opacity = '1';
          row.style.pointerEvents = '';
          alert('Failed to process expense');
        }
      })();
    };

    el.addEventListener('click', handleExpenseButtons);

    const readDark = () =>
      document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark') ||
      !document.documentElement.classList.contains('light');

    syncTheme(readDark());
    const observer = new MutationObserver(() => {
      syncTheme(readDark());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      el.removeEventListener('click', handleClick);
      el.removeEventListener('click', handleExpenseButtons);
      if (searchInput) searchInput.removeEventListener('input', onInput);
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [navigate, schoolId, syncTheme, resolveNav, navBase]);

  // Inject static HTML only (no React dangerouslySetInnerHTML on re-renders).
  // Keep the shell visible immediately — do not gate on runAllDataLoads() (that caused a multi-second dark overlay on return navigation).
  useLayoutEffect(() => {
    if (!schoolId) return;
    const el = containerRef.current;
    if (!el) return;
    const missingShell = !el.querySelector('.pweza-admin');
    if (lastInjectedBodyRef.current !== scopedBody || missingShell) {
      el.innerHTML = scopedBody;
      lastInjectedBodyRef.current = scopedBody;
    }
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
  }, [schoolId, scopedBody, isDashboardRoute]);

  // Hydrate design-system `.pa-kpi` cards (HTML shell) from the same query as login prefetch.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isDashboardRoute) return;
    const root = el.querySelector('.pweza-admin') as HTMLElement | null;
    if (!root) return;
    applyAdminDesignKpisToDom(root, designKpis, kpiPending);
  }, [designKpis, kpiPending, isDashboardRoute, scopedBody, schoolId]);

  // Refresh widgets in the background (staff, expenses, payments, etc.).
  useEffect(() => {
    if (!schoolId || !isDashboardRoute) return;
    void runAllDataLoads().catch((e) => {
      console.error('Dashboard load error:', e);
    });
  }, [schoolId, runAllDataLoads, isDashboardRoute]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateGreeting(el, adminNameRef.current);
    const timer = window.setInterval(() => {
      updateGreeting(el, adminNameRef.current);
    }, 60000);

    return () => clearInterval(timer);
  }, [adminName, schoolId]);

  return (
    <>
      <style>{scopedStyle}</style>
      <style>{DASHBOARD_MOTION_KILL}</style>
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            minHeight: '100vh',
            display: 'block',
            opacity: 1,
            pointerEvents: 'auto',
          }}
        />
      </div>

      <NativeModal isOpen={adminModal === 'student'} onClose={() => setAdminModal(null)} title="Add Student" size="xl">
        <AddStudentForm mode="modal" onCompleted={() => setAdminModal(null)} onCancel={() => setAdminModal(null)} />
      </NativeModal>
      <NativeModal isOpen={adminModal === 'teacher'} onClose={() => setAdminModal(null)} title="Add Teacher" size="lg">
        <AddTeacherForm mode="modal" onCompleted={() => setAdminModal(null)} onCancel={() => setAdminModal(null)} />
      </NativeModal>
      <NativeModal isOpen={adminModal === 'parent'} onClose={() => setAdminModal(null)} title="Add Parent" size="lg">
        <AddParentForm mode="modal" onCompleted={() => setAdminModal(null)} onCancel={() => setAdminModal(null)} />
      </NativeModal>
      <NativeModal isOpen={adminModal === 'staff'} onClose={() => setAdminModal(null)} title="Add School Staff" size="lg">
        <AddSchoolStaffForm schoolId={schoolId} onCompleted={() => setAdminModal(null)} onCancel={() => setAdminModal(null)} />
      </NativeModal>
      <RecordPaymentModal open={adminModal === 'payment'} onClose={() => setAdminModal(null)} />
      <AppointHeadTeacherModal isOpen={adminModal === 'appoint-head-teacher'} schoolId={schoolId} onClose={() => setAdminModal(null)} />
    </>
  );
}

