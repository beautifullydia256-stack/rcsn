import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/supabase';

import designRaw from '../../../../new designs/pwezacore-students-page.html?raw';

// ── Module-level cache — avoid re-parsing the design on remounts ──────────────
function extractStyleAndBody(raw: string) {
  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return {
    style: styleMatch?.[1] ?? '',
    body: bodyMatch?.[1] ?? '',
  };
}

const CACHED_DESIGN = extractStyleAndBody(designRaw);

// ── Avatar gradients ───────────────────────────────────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg,#10d9a8,#3d8ef8)',
  'linear-gradient(135deg,#9d7bf8,#ec4899)',
  'linear-gradient(135deg,#f5a623,#ef4444)',
  'linear-gradient(135deg,#22d3ee,#3d8ef8)',
  'linear-gradient(135deg,#f75c5c,#f5a623)',
  'linear-gradient(135deg,#22c55e,#10d9a8)',
  'linear-gradient(135deg,#3d8ef8,#9d7bf8)',
];
const gradient = (i: number) => GRADIENTS[i % GRADIENTS.length];
const initials = (name: string) =>
  (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// ── Types ─────────────────────────────────────────────────────────────────────
interface Student {
  id: string;
  name: string;
  class: string;
  address: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  class_teacher: string;
}

const PAGE_SIZE = 15;

export default function DesignStudentsPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [htmlContent, setHtmlContent] = useState('');

  // State
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sortKey, setSortKey] = useState('name-asc');
  const [attendedToday, setAttendedToday] = useState<number | null>(null);

  // Two independent expand states — mutually exclusive
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const searchRef = useRef<number | undefined>(undefined);

  // Helpers
  const closeAll = () => {
    setExpandedParent(null);
    setExpandedStudent(null);
  };
  const toggleParent = (id: string) => {
    setExpandedParent((p) => (p === id ? null : id));
    setExpandedStudent(null);
  };
  const toggleStudent = (id: string) => {
    setExpandedStudent((p) => (p === id ? null : id));
    setExpandedParent(null);
  };

  const { style: scopedStyle, body: scopedBody } = useMemo(() => CACHED_DESIGN, []);

  // 1. Inject HTML
  useEffect(() => {
    setHtmlContent(scopedBody);
  }, [scopedBody]);

  // 2. Fetch all data
  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();

        if (!userData?.school_id) return;
        const sid = userData.school_id;

        const today = new Date().toISOString().slice(0, 10);

        // Queries run in parallel
        const [studentsRes, parentsRes, classTeachersRes, attendanceRes] = await Promise.all([
          supabase
            .from('students')
            .select('student_id, name, current_class, address, guardian_address')
            .eq('school_id', sid)
            .order('name'),
          supabase.from('parents').select('student_id, name, phone, email').eq('school_id', sid),
          supabase.from('class_teachers').select('class_name, teacher_id').eq('school_id', sid),
          supabase
            .from('student_attendance')
            .select('student_id')
            .eq('school_id', sid)
            .eq('date', today)
            .eq('present', true),
        ]);

        // Teacher names for class-teacher links
        const teacherIds = [
          ...new Set((classTeachersRes.data || []).map((ct: any) => ct.teacher_id).filter(Boolean)),
        ] as string[];

        const { data: teachers } =
          teacherIds.length > 0
            ? await supabase
                .from('teachers')
                .select('teacher_id, name')
                .in('teacher_id', teacherIds)
            : { data: [] as Array<{ teacher_id: string; name: string }> };

        // Build lookup maps
        const parentMap: Record<string, { name: string; phone: string; email: string }> = {};
        (parentsRes.data || []).forEach((p: any) => {
          if (p.student_id && !parentMap[p.student_id]) {
            parentMap[p.student_id] = {
              name: p.name || '—',
              phone: p.phone || '—',
              email: p.email || '—',
            };
          }
        });

        const teacherMap: Record<string, string> = {};
        (teachers || []).forEach((t: any) => {
          teacherMap[t.teacher_id] = t.name || '—';
        });

        const ctMap: Record<string, string> = {};
        (classTeachersRes.data || []).forEach((ct: any) => {
          ctMap[ct.class_name] = teacherMap[ct.teacher_id] || '—';
        });

        const combined: Student[] = (studentsRes.data || []).map((s: any) => ({
          id: s.student_id,
          name: s.name || '—',
          class: s.current_class || '—',
          address: (s.address || s.guardian_address || '—').toString(),
          parent_name: parentMap[s.student_id]?.name || '—',
          parent_phone: parentMap[s.student_id]?.phone || '—',
          parent_email: parentMap[s.student_id]?.email || '—',
          class_teacher: ctMap[s.current_class] || '—',
        }));

        const attended = new Set((attendanceRes.data || []).map((x: any) => x.student_id));

        setAllStudents(combined);
        setFiltered(combined);
        setAttendedToday(attended.size);
      } catch (err) {
        console.error('Students load error:', err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  // 3. Filter + sort
  useEffect(() => {
    let result = [...allStudents];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.class.toLowerCase().includes(q) ||
          s.parent_name.toLowerCase().includes(q)
      );
    }
    if (classFilter) result = result.filter((s) => s.class === classFilter);

    switch (sortKey) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'class-asc':
        result.sort((a, b) => a.class.localeCompare(b.class));
        break;
      case 'class-desc':
        result.sort((a, b) => b.class.localeCompare(a.class));
        break;
      default:
        break;
    }

    setFiltered(result);
    setCurrentPage(1);
  }, [allStudents, searchQuery, classFilter, sortKey]);

  // 4. Render into DOM
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    const el = containerRef.current;

    requestAnimationFrame(() => {
      const set = (id: string, val: string) => {
        const n = el.querySelector(`#${id}`);
        if (n) n.textContent = val;
      };

      const uniqueClasses = [...new Set(allStudents.map((s) => s.class).filter((c) => c && c !== '—'))];
      const withParents = allStudents.filter((s) => s.parent_name !== '—').length;

      set('ps-stat-total', loading ? '…' : String(allStudents.length));
      set('ps-stat-classes', loading ? '…' : String(uniqueClasses.length));
      set('ps-stat-parents', loading ? '…' : String(withParents));
      set('ps-stat-showing', loading ? '…' : attendedToday !== null ? String(attendedToday) : '—');

      // Populate class filter (once)
      const classSelect = el.querySelector('#ps-class-filter') as HTMLSelectElement | null;
      if (classSelect && classSelect.options.length <= 1) {
        [...uniqueClasses].sort().forEach((cls) => {
          const opt = document.createElement('option');
          opt.value = cls;
          opt.textContent = cls;
          classSelect.appendChild(opt);
        });
      }

      const start = (currentPage - 1) * PAGE_SIZE;
      const pageData = filtered.slice(start, start + PAGE_SIZE);

      if (viewMode === 'table') {
        renderTable(el, pageData, expandedParent, expandedStudent, navigate, toggleParent, toggleStudent, closeAll);
      } else {
        renderCards(el, pageData, navigate);
      }

      renderPagination(el, filtered.length, currentPage, setCurrentPage);
    });
  }, [
    htmlContent,
    filtered,
    currentPage,
    viewMode,
    expandedParent,
    expandedStudent,
    loading,
    allStudents,
    attendedToday,
    navigate,
  ]);

  // 5. Wire button interactions (once after HTML injected)
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    const el = containerRef.current;

    el.querySelector('#ps-add-btn')?.addEventListener('click', () => navigate('/dashboard/admin/students/add'));
    el.querySelector('#ps-family-btn')?.addEventListener('click', () => navigate('/dashboard/admin/parents'));
    el.querySelector('#ps-print-btn')?.addEventListener('click', () => window.print());

    const searchInput = el.querySelector('#ps-search') as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e) => {
      if (searchRef.current) clearTimeout(searchRef.current);
      searchRef.current = window.setTimeout(() => setSearchQuery((e.target as HTMLInputElement).value), 250);
    });

    const classSelect = el.querySelector('#ps-class-filter') as HTMLSelectElement | null;
    classSelect?.addEventListener('change', (e) => setClassFilter((e.target as HTMLSelectElement).value));

    const sortSelect = el.querySelector('#ps-sort-select') as HTMLSelectElement | null;
    sortSelect?.addEventListener('change', (e) => setSortKey((e.target as HTMLSelectElement).value));

    el.querySelector('#ps-view-table')?.addEventListener('click', () => {
      setViewMode('table');
      el.querySelector('#ps-view-table')?.classList.add('active');
      el.querySelector('#ps-view-cards')?.classList.remove('active');
      (el.querySelector('#ps-table-view') as HTMLElement).style.display = '';
      (el.querySelector('#ps-card-view') as HTMLElement).style.display = 'none';
    });

    el.querySelector('#ps-view-cards')?.addEventListener('click', () => {
      setViewMode('cards');
      el.querySelector('#ps-view-cards')?.classList.add('active');
      el.querySelector('#ps-view-table')?.classList.remove('active');
      (el.querySelector('#ps-table-view') as HTMLElement).style.display = 'none';
      (el.querySelector('#ps-card-view') as HTMLElement).style.display = 'grid';
    });

    el.querySelectorAll('.ps-th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (!key) return;
        setSortKey((prev) => (prev === `${key}-asc` ? `${key}-desc` : `${key}-asc`));
      });
    });

    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [htmlContent, navigate]);

  return (
    <>
      <style>{scopedStyle}</style>
      <div
        ref={containerRef}
        style={{ width: '100%', minHeight: '100vh', display: 'block' }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE RENDERER — student expand + parent expand + close button
// ══════════════════════════════════════════════════════════════════════════════
function renderTable(
  el: HTMLElement,
  students: Student[],
  expandedParent: string | null,
  expandedStudent: string | null,
  navigate: (path: string) => void,
  toggleParent: (id: string) => void,
  toggleStudent: (id: string) => void,
  closeAll: () => void
) {
  const tbody = el.querySelector('#ps-table-body');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="ps-empty">
      <div class="ps-empty-icon">👨‍🎓</div>
      <div class="ps-empty-title">No students found</div>
      <div class="ps-empty-sub">Try adjusting your search or class filter.</div>
    </div></td></tr>`;
    return;
  }

  const rows: string[] = [];

  students.forEach((s, i) => {
    const av = initials(s.name);
    const bg = gradient(i);
    const bgP = gradient(i + 2);
    const isStudentOpen = expandedStudent === s.id;
    const isParentOpen = expandedParent === s.id;
    const isAnyOpen = isStudentOpen || isParentOpen;

    rows.push(`
      <tr class="ps-tr${isAnyOpen ? ' expanded' : ''}" data-student-id="${s.id}">
        <td class="ps-td">
          <div class="ps-student-name-cell">
            <div class="ps-avatar" style="background:${bg}">${av}</div>
            <div>
              <div class="ps-student-name ps-clickable-name" data-action="toggle-student" data-id="${s.id}"
                title="Click to see student details"
                style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px"
              >${s.name}</div>
              <div class="ps-student-id">${s.class !== '—' ? s.class : ''}</div>
            </div>
          </div>
        </td>
        <td class="ps-td">
          ${
            s.parent_name !== '—'
              ? `<span class="ps-clickable-name" data-action="toggle-parent" data-id="${s.id}"
                style="font-weight:500;color:var(--t1);cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px"
                title="Click to see parent details">${s.parent_name}</span>`
              : '<span style="color:var(--t3)">—</span>'
          }
        </td>
        <td class="ps-td">
          ${s.class !== '—' ? `<span class="ps-chip blue">${s.class}</span>` : '<span style="color:var(--t3)">—</span>'}
        </td>
        <td class="ps-td">
          ${s.class_teacher !== '—' ? `<span style="color:var(--t1)">${s.class_teacher}</span>` : '<span style="color:var(--t3)">—</span>'}
        </td>
        <td class="ps-td">
          ${s.address !== '—' ? s.address : '<span style="color:var(--t3)">—</span>'}
        </td>
        <td class="ps-td">
          ${
            s.parent_phone !== '—'
              ? `<a href="tel:${s.parent_phone}" style="color:var(--teal);text-decoration:none;font-size:12.5px" onclick="event.stopPropagation()">📞 ${s.parent_phone}</a>`
              : '<span style="color:var(--t3)">—</span>'
          }
        </td>
        <td class="ps-td" style="white-space:nowrap">
          <div style="display:flex;align-items:center;gap:6px">
            <div class="ps-row-action-btn" data-action="view" data-id="${s.id}" title="View full profile">👁</div>
            <div class="ps-row-action-btn" data-action="toggle-student" data-id="${s.id}"
              title="${isAnyOpen ? 'Close' : 'Quick view'}"
              style="transition:transform .2s;transform:${isAnyOpen ? 'rotate(90deg)' : 'rotate(0)'};font-size:16px">›</div>
          </div>
        </td>
      </tr>
    `);

    if (isStudentOpen) {
      rows.push(`
        <tr class="ps-expand-row"><td colspan="7">
          <div style="padding:20px 20px 20px 24px;position:relative;background:var(--s2);border-left:3px solid var(--teal)">
            <button data-action="close" data-id="${s.id}" class="ps-close-btn" title="Close"
              style="position:absolute;top:12px;right:14px;width:26px;height:26px;border-radius:6px;
              display:flex;align-items:center;justify-content:center;background:var(--s3);
              border:1px solid var(--border);cursor:pointer;font-size:13px;color:var(--t2);
              transition:all .14s;font-family:inherit">✕</button>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <div style="width:46px;height:46px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0">${av}</div>
              <div>
                <div style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:17px;color:var(--t1)">${s.name}</div>
                <div style="font-size:11.5px;color:var(--t3);margin-top:1px">Student · ${s.class !== '—' ? s.class : 'No class assigned'}</div>
              </div>
              <span class="ps-chip teal" style="margin-left:auto;margin-right:36px">👨‍🎓 Student</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px 20px;margin-bottom:14px">
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Full Name</div><div style="font-size:13px;font-weight:600;color:var(--t1)">${s.name}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Class</div><div style="font-size:13px;color:var(--t1)">${s.class !== '—' ? s.class : '—'}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Class Teacher</div><div style="font-size:13px;color:var(--t1)">${s.class_teacher !== '—' ? s.class_teacher : '—'}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Address</div><div style="font-size:13px;color:var(--t1)">${s.address !== '—' ? s.address : '—'}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Parent / Guardian</div><div style="font-size:13px;color:var(--t1)">${s.parent_name !== '—' ? s.parent_name : '—'}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Parent Phone</div><div style="font-size:13px;color:var(--t1)">${s.parent_phone !== '—' ? `<a href="tel:${s.parent_phone}" style="color:var(--teal);text-decoration:none">📞 ${s.parent_phone}</a>` : '—'}</div></div>
            </div>
            <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border);flex-wrap:wrap">
              <button class="ps-btn ps-btn-primary" data-action="view" data-id="${s.id}" style="padding:7px 14px;font-size:12px">👁 View Full Profile</button>
              <button class="ps-btn ps-btn-ghost" data-action="toggle-parent" data-id="${s.id}" style="padding:7px 14px;font-size:12px">👨‍👩‍👧 View Parent Details</button>
              ${s.parent_email !== '—' ? `<a href="mailto:${s.parent_email}" class="ps-btn ps-btn-ghost" style="padding:7px 14px;font-size:12px;text-decoration:none">✉️ Email Parent</a>` : ''}
            </div>
          </div>
        </td></tr>
      `);
    }

    if (isParentOpen) {
      rows.push(`
        <tr class="ps-expand-row"><td colspan="7">
          <div style="padding:20px 20px 20px 24px;position:relative;background:var(--s2);border-left:3px solid var(--violet)">
            <button data-action="close" data-id="${s.id}" class="ps-close-btn" title="Close"
              style="position:absolute;top:12px;right:14px;width:26px;height:26px;border-radius:6px;
              display:flex;align-items:center;justify-content:center;background:var(--s3);
              border:1px solid var(--border);cursor:pointer;font-size:13px;color:var(--t2);
              transition:all .14s;font-family:inherit">✕</button>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <div style="width:46px;height:46px;border-radius:50%;background:${bgP};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0">${initials(s.parent_name)}</div>
              <div>
                <div style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:17px;color:var(--t1)">${s.parent_name}</div>
                <div style="font-size:11.5px;color:var(--t3);margin-top:1px">Parent / Guardian of ${s.name}</div>
              </div>
              <span class="ps-chip violet" style="margin-left:auto;margin-right:36px">👨‍👩‍👧 Parent</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px 20px;margin-bottom:14px">
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Full Name</div><div style="font-size:13px;font-weight:600;color:var(--t1)">${s.parent_name}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Phone Number</div><div style="font-size:13px;color:var(--t1)">${s.parent_phone !== '—' ? `<a href="tel:${s.parent_phone}" style="color:var(--teal);text-decoration:none;font-weight:600">📞 ${s.parent_phone}</a>` : '—'}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Email Address</div><div style="font-size:13px;color:var(--t1)">${s.parent_email !== '—' ? `<a href="mailto:${s.parent_email}" style="color:var(--teal);text-decoration:none">✉️ ${s.parent_email}</a>` : '—'}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Pupil's Name</div><div style="font-size:13px;color:var(--t1)">${s.name}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Pupil's Class</div><div style="font-size:13px;color:var(--t1)">${s.class !== '—' ? s.class : '—'}</div></div>
              <div><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Class Teacher</div><div style="font-size:13px;color:var(--t1)">${s.class_teacher !== '—' ? s.class_teacher : '—'}</div></div>
              <div style="grid-column:span 3"><div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px">Home Address</div><div style="font-size:13px;color:var(--t1)">${s.address !== '—' ? s.address : '—'}</div></div>
            </div>
            <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--border);flex-wrap:wrap">
              ${s.parent_phone !== '—' ? `<a href="tel:${s.parent_phone}" class="ps-btn ps-btn-primary" style="padding:7px 14px;font-size:12px;text-decoration:none">📞 Call Parent</a>` : ''}
              ${s.parent_email !== '—' ? `<a href="mailto:${s.parent_email}" class="ps-btn ps-btn-ghost" style="padding:7px 14px;font-size:12px;text-decoration:none">✉️ Email Parent</a>` : ''}
              <button class="ps-btn ps-btn-ghost" data-action="toggle-student" data-id="${s.id}" style="padding:7px 14px;font-size:12px">👨‍🎓 View Student Details</button>
              <button class="ps-btn ps-btn-ghost" data-action="view" data-id="${s.id}" style="padding:7px 14px;font-size:12px">👁 Full Student Profile</button>
            </div>
          </div>
        </td></tr>
      `);
    }
  });

  tbody.innerHTML = rows.join('');

  // Wire all click events
  tbody.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (action === 'view') navigate(`/dashboard/admin/students/${id}`);
      if (action === 'toggle-student') toggleStudent(id);
      if (action === 'toggle-parent') toggleParent(id);
      if (action === 'close') closeAll();
    });
  });

  // Close button hover: turns red
  tbody.querySelectorAll('.ps-close-btn').forEach((btn) => {
    const b = btn as HTMLElement;
    b.onmouseenter = () =>
      Object.assign(b.style, {
        background: 'var(--rose-s)',
        borderColor: 'var(--rose)',
        color: 'var(--rose)',
      });
    b.onmouseleave = () =>
      Object.assign(b.style, {
        background: 'var(--s3)',
        borderColor: 'var(--border)',
        color: 'var(--t2)',
      });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD RENDERER
// ══════════════════════════════════════════════════════════════════════════════
function renderCards(el: HTMLElement, students: Student[], navigate: (path: string) => void) {
  const grid = el.querySelector('#ps-card-view');
  if (!grid) return;

  if (students.length === 0) {
    grid.innerHTML = `<div class="ps-empty" style="grid-column:1/-1">
      <div class="ps-empty-icon">👨‍🎓</div>
      <div class="ps-empty-title">No students found</div>
      <div class="ps-empty-sub">Try adjusting your search or class filter.</div>
    </div>`;
    return;
  }

  grid.innerHTML = students
    .map(
      (s, i) => `
    <div class="ps-student-card" data-id="${s.id}">
      <div class="ps-card-top">
        <div class="ps-card-av" style="background:${gradient(i)}">${initials(s.name)}</div>
        <div>
          <div class="ps-card-name">${s.name}</div>
          <div class="ps-card-class">${s.class !== '—' ? s.class : 'No class assigned'}</div>
        </div>
      </div>
      <div class="ps-card-divider"></div>
      <div class="ps-card-row"><span class="ps-card-row-lbl">Parent</span><span class="ps-card-row-val">${s.parent_name !== '—' ? s.parent_name : '—'}</span></div>
      <div class="ps-card-row"><span class="ps-card-row-lbl">Teacher</span><span class="ps-card-row-val">${s.class_teacher !== '—' ? s.class_teacher : '—'}</span></div>
      <div class="ps-card-row"><span class="ps-card-row-lbl">Phone</span><span class="ps-card-row-val">${s.parent_phone !== '—' ? s.parent_phone : '—'}</span></div>
      <div class="ps-card-row"><span class="ps-card-row-lbl">Address</span><span class="ps-card-row-val">${s.address !== '—' ? s.address : '—'}</span></div>
      <div class="ps-card-actions">
        <button class="ps-card-btn primary" data-action="view" data-id="${s.id}">👁 View Profile</button>
        <button class="ps-card-btn" data-action="call" data-phone="${s.parent_phone}">📞 Parent</button>
      </div>
    </div>
  `
    )
    .join('');

  grid.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const phone = btn.getAttribute('data-phone');
      if (action === 'view' && id) navigate(`/dashboard/admin/students/${id}`);
      if (action === 'call' && phone && phone !== '—') window.location.href = `tel:${phone}`;
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION RENDERER
// ══════════════════════════════════════════════════════════════════════════════
function renderPagination(
  el: HTMLElement,
  total: number,
  currentPage: number,
  setPage: (p: number) => void
) {
  const wrap = el.querySelector('#ps-pagination') as HTMLElement | null;
  const info = el.querySelector('#ps-pagination-info') as HTMLElement | null;
  const btns = el.querySelector('#ps-pagination-btns') as HTMLElement | null;
  if (!wrap || !info || !btns) return;

  if (total === 0) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'flex';

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);
  info.textContent = `Showing ${start}–${end} of ${total} students`;

  if (totalPages <= 1) {
    btns.innerHTML = '';
    return;
  }

  const pages: string[] = [];
  pages.push(
    `<button class="ps-page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`
  );
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(
        `<button class="ps-page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`
      );
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      pages.push(`<span class="ps-page-btn" style="pointer-events:none">…</span>`);
    }
  }
  pages.push(
    `<button class="ps-page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`
  );

  btns.innerHTML = pages.join('');

  btns.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-page');
      if (p === 'prev') setPage(Math.max(1, currentPage - 1));
      else if (p === 'next') setPage(Math.min(totalPages, currentPage + 1));
      else setPage(Number(p));
    });
  });
}

