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
import ExpenseApprovalModal, { type ExpenseApprovalData } from '@/components/accountant/ExpenseApprovalModal';
import NativeModal from '@/components/NativeModal';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';

import designRaw from '../../../assets/designs/admin-dashboard.html?raw';

type AdminModal = 'student' | 'teacher' | 'parent' | 'staff' | 'payment' | 'appoint-head-teacher' | null;

type AppointHTProps = { isOpen: boolean; schoolId: string; onClose: () => void; isTertiary?: boolean };

function AppointHeadTeacherModal({ isOpen, schoolId, onClose, isTertiary = false }: AppointHTProps) {
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
      setDone(teacher.name || (isTertiary ? 'Tutor' : 'Teacher'));
    } catch {
      alert(isTertiary ? 'Failed to appoint principal. Please try again.' : 'Failed to appoint head teacher. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <NativeModal isOpen={isOpen} onClose={onClose} title={isTertiary ? "Appoint Principal" : "Appoint Head Teacher"} size="md">
      {done ? (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: '#10d9a8' }}>
            <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{done} appointed as {isTertiary ? 'Principal' : 'Head Teacher'}</div>
          <div style={{ color: '#94a8d0', fontSize: 13, marginBottom: 24 }}>They will see the {isTertiary ? 'Principal' : 'Head Teacher'} role when they next log in.</div>
          <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 10, background: '#10d9a8', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Done</button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder={isTertiary ? "Search tutors by name or email…" : "Search teachers by name or email…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
          />
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a8d0' }}>{isTertiary ? 'Loading tutors…' : 'Loading teachers…'}</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a8d0' }}>{isTertiary ? 'No tutors found.' : 'No teachers found.'}</div>
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

  const bar = root.querySelector('#pa-collection-rate-bar') as HTMLElement | null;
  if (bar) {
    bar.style.width = kpis.collectionRatePercent != null ? `${Math.min(100, Math.max(0, kpis.collectionRatePercent))}%` : '0%';
  }
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
    titleEl.textContent = displayName ? `${greeting}, ${displayName}` : greeting;
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

    const isDark = useUIStore.getState().theme === 'dark';
    const t = getTokens(isDark);
    const dropdown = document.createElement('div');
    dropdown.id = 'pa-search-dropdown';
    Object.assign(dropdown.style, {
      position: 'absolute',
      top: '38px',
      left: '0',
      right: '0',
      background: t.panel,
      border: `1px solid ${t.stroke}`,
      borderRadius: '10px',
      zIndex: '999',
      overflow: 'hidden',
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
    } as Partial<CSSStyleDeclaration>);

    results.forEach((r) => {
      const item = document.createElement('div');
      item.style.cssText =
        `padding:10px 14px;cursor:pointer;border-bottom:1px solid ${t.divider};font-size:12.5px;color:${t.textHi};`;
      item.innerHTML = `<div style="font-weight:600">${escapeHtml(r.label)}</div><div style="font-size:10.5px;color:${t.textMid};margin-top:1px">${escapeHtml(
        r.sub
      )}</div>`;
      item.onmouseenter = () => {
        item.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(10,40,28,0.04)';
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
      setHtml('pa-expenses-list', '<div class="pa-empty-state"><span>No pending expenses</span></div>');
      return;
    }

    const icons = [
      '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>',
      '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
      '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
      '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h8m-8 4h8m-8 4h4m6 4H6a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2z"/></svg>',
      '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
    ];
    const iconBgs = ['var(--amber-s)', 'var(--blue-s)', 'var(--teal-s)', 'var(--rose-s)', 'var(--violet-s)'];

    const html = expenses
      .map((exp: any, i: number) => {
        const amt = Number(exp.amount || 0).toLocaleString('en-US');
        const date = formatDateShort(exp.created_at);
        return `
          <div class="pa-expense-row" data-expense-id="${escapeHtml(String(exp.expense_id))}" style="cursor:pointer;" title="Click to view details and approve/decline">
            <div class="pa-expense-ic" style="background:${iconBgs[i % iconBgs.length]}">${icons[i % icons.length]}</div>
            <div style="flex:1;">
              <div class="pa-expense-title">${escapeHtml(String(exp.category_name || 'Expense'))}</div>
              <div class="pa-expense-sub">Submitted ${escapeHtml(date)}</div>
            </div>
            <div class="pa-expense-amount">USh ${escapeHtml(amt)}</div>
            <div class="pa-ea-btns">
              <button class="pa-ea-btn approve">Approve</button>
              <button class="pa-ea-btn decline">Decline</button>
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
      area.innerHTML = `<div style="display:flex;gap:9px;align-items:center;padding:10px 14px;border-radius:10px;background:var(--teal-s);border:1px solid var(--teal-s);">
        <span style="color:var(--mint-ink);display:inline-flex;"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--mint-ink)">All caught up!</div>
          <div style="font-size:11px;color:var(--t2);margin-top:2px">No pending reminders.</div>
        </div>
      </div>`;
      return;
    }

    const html = (data as Record<string, unknown>[]).map((n) => `
      <div style="display:flex;gap:9px;align-items:flex-start;padding:10px 14px;border-radius:10px;background:var(--amber-s);border:1px solid var(--amber-s);">
        <span style="flex-shrink:0;margin-top:1px;display:inline-flex;color:var(--amber)"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg></span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:var(--amber);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(String(n.title || 'Reminder'))}</div>
          <div style="font-size:11px;color:var(--t2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(String(n.message || ''))}</div>
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
        icon: '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>', iconBg: 'var(--teal-s)',
        text: `Payment received — <strong>${escapeHtml(String(name))}</strong> paid UGX ${amt}`,
        timeIso: String(p.payment_date || p.created_at || ''),
        navPath: `${navBase}/outstanding`,
      });
    }

    for (const e of (expensesRes.data || []) as Record<string, unknown>[]) {
      const cat = String(e.category_name || 'Expense');
      const amt = Number(e.amount || 0).toLocaleString('en-US');
      items.push({
        icon: '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>', iconBg: 'var(--amber-s)',
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
        icon: '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>', iconBg: 'var(--blue-s)',
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
        icon: '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>', iconBg: 'var(--violet-s)',
        text: `Student enrolled — <strong>${escapeHtml(name)}</strong>${cls ? ` · ${escapeHtml(cls)}` : ''}`,
        timeIso: String(s.created_at || ''),
        navPath: `${navBase}/students`,
      });
    }

    items.sort((a, b) => b.timeIso.localeCompare(a.timeIso));
    const top10 = items.slice(0, 10);

    const badge = el.querySelector('#pa-activity-badge') as HTMLElement | null;

    if (top10.length === 0) {
      setHtml('pa-syshealth-list', '<div class="pa-empty-state"><span style="opacity:.4;display:inline-flex"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span><span>No recent activity</span></div>');
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

    const icons = [
      '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>',
      '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
      '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>'
    ];
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
  const { isTertiary } = useSchoolType();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [adminModal, setAdminModal] = useState<AdminModal>(null);
  const [selectedExpenseForApproval, setSelectedExpenseForApproval] = useState<ExpenseApprovalData | null>(null);
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

  const syncTheme = useCallback((dark: boolean) => {
    const container = containerRef.current;
    if (!container) return;
    const root = container.querySelector('.pweza-admin') as HTMLElement | null;
    if (!root) return;

    const t = getTokens(dark);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.style.setProperty('--screen-bg', t.screenBg);
    root.style.setProperty('--panel', t.panel);
    root.style.setProperty('--bg', t.screenBg);
    root.style.setProperty('--s1', t.panel);
    root.style.setProperty('--s2', dark ? 'rgba(255,255,255,0.035)' : '#FFFFFF');
    root.style.setProperty('--s3', dark ? 'rgba(255,255,255,0.06)' : 'rgba(10,40,28,0.05)');
    root.style.setProperty('--s4', dark ? 'rgba(255,255,255,0.10)' : 'rgba(10,40,28,0.10)');
    root.style.setProperty('--border', t.stroke);
    root.style.setProperty('--bh', t.strokeHi);
    root.style.setProperty('--divider', t.divider);
    root.style.setProperty('--t1', t.textHi);
    root.style.setProperty('--t2', t.textMid);
    root.style.setProperty('--t3', t.textLow);
    root.style.setProperty('--teal', t.mint);
    root.style.setProperty('--teal-s', t.mintDim);
    root.style.setProperty('--teal-g', t.mintRing);
    root.style.setProperty('--mint-ink', t.mintInk);
    root.style.setProperty('--amber', t.gold);
    root.style.setProperty('--amber-s', t.goldDim);
    root.style.setProperty('--money-glow', dark ? t.moneyGlow : '0 4px 14px rgba(201,130,10,0.08)');
    root.style.setProperty('--blue', t.blue);
    root.style.setProperty('--blue-s', t.blueDim);
    root.style.setProperty('--rose', t.red);
    root.style.setProperty('--rose-s', t.redDim);
    root.style.setProperty('--violet', dark ? '#A855F7' : '#8B5CF6');
    root.style.setProperty('--violet-s', dark ? 'rgba(168,85,247,0.12)' : 'rgba(139,92,246,0.10)');
    root.style.setProperty('--cyan', t.mint);
    root.style.setProperty('--cyan-s', t.mintDim);
    root.style.setProperty('--field-bg', t.fieldBg);
    root.style.setProperty('--card-shadow', dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)');
    root.style.setProperty('--row-hover', dark ? 'rgba(255,255,255,0.04)' : 'rgba(10,40,28,0.03)');
    root.style.setProperty('--btn-hover', dark ? 'rgba(255,255,255,0.06)' : '#F2F4F2');
    root.style.setProperty('--cta-grad-a', t.ctaGradA);
    root.style.setProperty('--cta-grad-b', t.ctaGradB);
    root.style.setProperty('--cta-text', t.ctaText);
    root.style.setProperty('--track', t.track);
    root.style.background = t.screenBg;
    root.style.color = t.textHi;
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
    const expenseUpdatedHandler = () => { runAllDataLoads(); };
    window.addEventListener('pweza:expense-updated', expenseUpdatedHandler);
    return () => {
      window.removeEventListener('pweza-navigate', handler);
      window.removeEventListener('pweza:expense-updated', expenseUpdatedHandler);
    };
  }, [navigate, resolveNav]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Synchronize template labels for tertiary institutions
    if (isTertiary) {
      const appointBtn = el.querySelector('.pa-qa-btn[data-nav="/dashboard/admin/appoint-head-teacher"] span:last-child');
      if (appointBtn) appointBtn.textContent = 'Appoint Principal';
      const addStudentBtn = el.querySelector('.pa-qa-btn[data-nav="/dashboard/admin/students/new"] span:last-child');
      if (addStudentBtn) addStudentBtn.textContent = 'Add Trainee';
      const addTeacherBtn = el.querySelector('.pa-qa-btn[data-nav="/dashboard/admin/teachers/new"] span:last-child');
      if (addTeacherBtn) addTeacherBtn.textContent = 'Add Tutor';
      const addParentBtn = el.querySelector('.pa-qa-btn[data-nav="/dashboard/admin/parents/new"] span:last-child');
      if (addParentBtn) addParentBtn.textContent = 'Add Sponsor';
    }

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

          // Expense approval modal opener (delegated on row or button click)
      const handleExpenseRowClick = (e: MouseEvent) => {
        const row = (e.target as Element | null)?.closest?.('.pa-expense-row') as HTMLElement | null;
        if (!row) return;
        const expenseId = row.getAttribute('data-expense-id');
        if (!expenseId) return;

        void (async () => {
          try {
            row.style.opacity = '0.7';
            const { data: expRow } = await supabase
              .from('school_expenses')
              .select('expense_id, category_name, description, amount, reference_number, recorded_by, payment_method, expense_date, created_at, status')
              .eq('expense_id', expenseId)
              .maybeSingle();

            row.style.opacity = '1';
            if (!expRow) return;

            let recName = 'Accounts Staff';
            if (expRow.recorded_by) {
              const { data: u } = await supabase.from('users').select('name').eq('user_id', expRow.recorded_by).maybeSingle();
              if (u?.name) recName = u.name;
            }

            setSelectedExpenseForApproval({
              ...expRow,
              recorded_by_name: recName,
            });
          } catch (err) {
            row.style.opacity = '1';
            console.error('Error fetching expense details:', err);
          }
        })();
      };
el.addEventListener('click', handleExpenseRowClick);

    const readDark = () => {
      const storeTheme = useUIStore.getState().theme;
      if (storeTheme) return storeTheme === 'dark';
      return (
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark') ||
        !document.documentElement.classList.contains('light')
      );
    };

    syncTheme(readDark());
    const observer = new MutationObserver(() => {
      syncTheme(readDark());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    const unsubscribe = useUIStore.subscribe((state) => {
      syncTheme(state.theme === 'dark');
    });

    return () => {
      el.removeEventListener('click', handleClick);
      el.removeEventListener('click', handleExpenseRowClick);
      if (searchInput) searchInput.removeEventListener('input', onInput);
      observer.disconnect();
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [navigate, schoolId, syncTheme, resolveNav, navBase, isTertiary]);

  // Immediately synchronize when theme changes
  useEffect(() => {
    syncTheme(isDark);
  }, [isDark, syncTheme]);

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
      syncTheme(useUIStore.getState().theme === 'dark');
    }
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
  }, [schoolId, scopedBody, isDashboardRoute, syncTheme]);

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

      <NativeModal isOpen={adminModal === 'student'} onClose={() => setAdminModal(null)} title={isTertiary ? 'Add Trainee' : 'Add Student'} size="xl">
        <AddStudentForm mode="modal" onCompleted={() => setAdminModal(null)} onCancel={() => setAdminModal(null)} />
      </NativeModal>
      <NativeModal isOpen={adminModal === 'teacher'} onClose={() => setAdminModal(null)} title={isTertiary ? 'Add Tutor' : 'Add Teacher'} size="lg">
        <AddTeacherForm mode="modal" onCompleted={() => setAdminModal(null)} onCancel={() => setAdminModal(null)} />
      </NativeModal>
      <NativeModal isOpen={adminModal === 'parent'} onClose={() => setAdminModal(null)} title={isTertiary ? 'Add Parent / Sponsor' : 'Add Parent'} size="lg">
        <AddParentForm mode="modal" onCompleted={() => setAdminModal(null)} onCancel={() => setAdminModal(null)} />
      </NativeModal>
      <NativeModal isOpen={adminModal === 'staff'} onClose={() => setAdminModal(null)} title={isTertiary ? 'Add Institutional Staff' : 'Add School Staff'} size="lg">
        <AddSchoolStaffForm schoolId={schoolId} onCompleted={() => setAdminModal(null)} onCancel={() => setAdminModal(null)} />
      </NativeModal>
      <RecordPaymentModal open={adminModal === 'payment'} onClose={() => setAdminModal(null)} />
      <ExpenseApprovalModal
        open={Boolean(selectedExpenseForApproval)}
        onClose={() => setSelectedExpenseForApproval(null)}
        expense={selectedExpenseForApproval}
        onSuccess={() => {
          setSelectedExpenseForApproval(null);
          // Instantly refresh the pending expenses list on dashboard
          runAllDataLoads();
        }}
      />
      <AppointHeadTeacherModal isOpen={adminModal === 'appoint-head-teacher'} schoolId={schoolId} isTertiary={isTertiary} onClose={() => setAdminModal(null)} />
    </>
  );
}
