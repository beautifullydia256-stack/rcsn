import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Isolated container for the dangerouslySetInnerHTML profile template.
 * React.memo with shallow-equal props ensures React NEVER re-renders (and
 * thus never resets innerHTML) when parent state like changeEmailOpen changes.
 * Only re-renders when htmlContent itself changes (once, on first load).
 */
const ProfileContainer = React.memo(function ProfileContainer({
  htmlContent,
  containerRef,
}: {
  htmlContent: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width: '100%', minHeight: '100vh', display: 'block' }}
    />
  );
});
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { useAuthStore } from '@/store/authStore';
import { usePwezaStore } from '@/store/pwezaStore';
import { escapeAttr, readFileAsDataURL } from '@/lib/profileInlineEdit';
import { mergeClassNamesWithCanonical } from '@/lib/schoolClassNames';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { useToast } from '@/components/Toast';

import profileTemplateRaw from '@/assets/pwezacore-teacher-profile.html?raw';
import { downloadTeacherProfilePdf, type TeacherProfilePdfData } from '@/lib/adminPdfDownload';
import UserRolesSection from '@/components/admin/UserRolesSection';
import ChangeTeacherPhoneModal from '@/components/admin/ChangeTeacherPhoneModal';
import NativeModal from '@/components/NativeModal';
import { Mail, Phone, CheckCircle2 } from 'lucide-react';
import { isTertiarySchool } from '@/hooks/useSchoolType';

// Professional SVG Icons (Zero Emojis)
const PENCIL_SVG = `<svg class="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`;
const SAVE_SVG = `<svg class="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>`;
const CANCEL_SVG = `<svg class="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
const SPINNER_SVG = `<svg class="animate-spin w-4 h-4 mr-1.5 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
const TRASH_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
const CHECK_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
const X_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
const GRADUATION_CAP_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>`;
const BOOK_OPEN_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`;
const CALENDAR_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2"/><path stroke-width="2" d="M16 2v4M8 2v4M3 10h18"/></svg>`;
const SCHOOL_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`;
const ID_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" stroke-width="2"/><circle cx="9" cy="10" r="2" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M15 8h2M15 12h2M7 16h10"/></svg>`;
const PAY_ROW_SVG = `<svg class="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" stroke-width="1.75"/><path stroke-width="1.75" d="M2 10h20M6 15h4"/></svg>`;
const EMPTY_FOLDER_SVG = `<svg class="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>`;
const EMPTY_DOC_SVG = `<svg class="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`;
const CLOCK_SVG = `<svg class="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="1.5"/><path stroke-linecap="round" stroke-width="1.5" d="M12 7v5l3 2"/></svg>`;

const PROFILE_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

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

type TeacherClassSubjectAssignment = {
  id: string;
  class_name: string;
  subject: string;
  assignment_role?: string | null;
};

function teacherSubjectAssignmentsBodyHtml(
  assignments: TeacherClassSubjectAssignment[],
  classTeacherNames: Set<string>,
  isTertiary?: boolean,
): string {
  if (assignments.length === 0) {
    return `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">No ${isTertiary ? 'course' : 'subject'} rows yet. Use <strong>${isTertiary ? 'Course teaching' : 'Subject teaching'}</strong> above to pick a ${isTertiary ? 'cohort / course' : 'class'} and ${isTertiary ? 'units' : 'subjects'}.</div>`;
  }
  return assignments
    .map((a) => {
      const ar = (a.assignment_role || 'subject_teacher') as 'subject_teacher' | 'co_teacher';
      const isCt = classTeacherNames.has(a.class_name);
      const roleLabel =
        ar === 'co_teacher'
          ? (isTertiary ? 'Co-Tutor' : 'Co-teacher')
          : isCt
            ? (isTertiary ? 'Lead Tutor' : 'Class Teacher')
            : (isTertiary ? 'Course Tutor' : 'Subject Teacher');
      const roleBg =
        ar === 'co_teacher'
          ? 'background:var(--violet-s);color:var(--violet)'
          : isCt
            ? 'background:var(--teal-s);color:var(--teal)'
            : 'background:var(--blue-s);color:var(--blue)';
      const subs = String(a.subject || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(
          (s) =>
            `<span style="background:var(--amber-s);color:var(--amber);padding:2px 7px;border-radius:5px;font-size:11.5px;font-weight:600">${escapeHtml(
              s,
            )}</span>`,
        )
        .join(' ');
      return `
                <div class="tp-assign-row">
                  <div class="tp-assign-col">${escapeHtml(a.class_name)}</div>
                  <div class="tp-assign-col"><div style="display:flex;gap:4px;flex-wrap:wrap">${
                    subs || '<span style="color:var(--t3);font-style:italic">—</span>'
                  }</div></div>
                  <div class="tp-assign-col"><span style="${roleBg};padding:2px 8px;border-radius:5px;font-size:11.5px;font-weight:600">${escapeHtml(
                    roleLabel,
                  )}</span></div>
                  <div class="tp-assign-actions">
                    <button type="button" class="tp-remove-btn" data-assign-id="${escapeHtml(a.id)}">Remove</button>
                  </div>
                </div>`;
    })
    .join('');
}

function patchTeacherSubjectAssignmentsInDom(
  root: HTMLElement | Element,
  assignments: TeacherClassSubjectAssignment[],
  classTeacherNames: Set<string>,
  classNamesForMeta: string[],
  onAfterRemove: () => void | Promise<void>,
  isTertiary?: boolean,
) {
  const set = (id: string, val: string) => {
    const n = root.querySelector(id);
    if (n) n.textContent = val;
  };
  const setHTML = (id: string, html: string) => {
    const n = root.querySelector(id);
    if (n) (n as HTMLElement).innerHTML = html;
  };
  setHTML('#tp-assignments-body', teacherSubjectAssignmentsBodyHtml(assignments, classTeacherNames, isTertiary));
  set(
    '#tp-meta-classes-count',
    `${classNamesForMeta.length} ${isTertiary ? 'course' : 'class'}${classNamesForMeta.length !== 1 ? (isTertiary ? 's' : 'es') : ''}`,
  );
  const roleChip = root.querySelector('#tp-chip-role') as HTMLElement | null;
  if (roleChip) {
    const isClassTeacher = classTeacherNames.size > 0;
    if (isTertiary) {
      roleChip.innerHTML = isClassTeacher ? `${GRADUATION_CAP_SVG} Lead Tutor` : `${BOOK_OPEN_SVG} Course Tutor`;
    } else {
      roleChip.innerHTML = isClassTeacher ? `${GRADUATION_CAP_SVG} Class Teacher` : `${BOOK_OPEN_SVG} Subject Teacher`;
    }
    roleChip.className = `tp-chip ${isClassTeacher ? 'teal' : 'blue'}`;
  }
  root.querySelectorAll('[data-assign-id]').forEach((btn) => {
    (btn as HTMLButtonElement).onclick = async (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.assignId;
      if (!id) return;
      const { error } = await supabase.from('teacher_class_subjects').delete().eq('id', id);
      if (error) {
        window.alert(error.message);
        return;
      }
      await onAfterRemove();
    };
  });
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

function safeFileName(name: string): string {
  return String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 120);
}

const TEACHER_DOC_BUCKET = 'teacher-documents';

function fmtExpenseStatus(s: string | null | undefined): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function activeDocCategory(root: Element, tabSelector: string): string {
  const active = root.querySelector(`${tabSelector} .tp-doc-cat-btn.active`);
  const t = (active?.textContent || '').trim();
  if (!t || t === 'All') return 'Other';
  return t;
}

/** yyyy-mm-dd for <input type="date"> */
function isoDateOnly(s: string | null | undefined): string {
  if (!s) return '';
  const d = String(s).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

function readTpField(root: Element, field: string): string {
  const el = root.querySelector(`[data-tp-field="${field}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return el?.value?.trim() ?? '';
}

/** Swap key display spans for inputs (same layout/CSS shell) */
function applyTeacherEditMode(root: HTMLElement, t: Record<string, unknown>) {
  const fullName = String(t.name || '').trim();
  const email = pickStr(t.email) ?? '';
  const qual = pickStr(t.qualification) ?? '';
  const exp = pickStr(t.experience) ?? '';
  const addr = pickStr(t.address) ?? '';
  const salRaw = t.salary != null && !Number.isNaN(Number(t.salary)) ? String(Number(t.salary)) : '';
  const gender = pickStr(t.gender) ?? '';
  const dob = isoDateOnly(pickStr(t.dob));
  const nationality = pickStr(t.nationality) ?? '';
  const religion = pickStr(t.religion) ?? '';
  const nin = pickStr(t.national_id) ?? '';
  const district = pickStr(t.district) ?? '';
  const emergency = pickStr(t.emergency_contact) ?? '';
  const empType = pickStr(t.employment_type) ?? '';
  const hire = isoDateOnly(pickStr(t.date_of_hire));
  const bankName = pickStr(t.bank_name) ?? '';
  const bankAcc = pickStr(t.bank_account) ?? '';
  const dept = pickStr(t.department) ?? '';
  const prevSchool = pickStr(t.previous_school) ?? '';
  const personalEmail = pickStr(t.personal_email) ?? '';
  const active = t.is_active !== false;

  const rating = t.performance_review_rating != null && !Number.isNaN(Number(t.performance_review_rating))
    ? String(Number(t.performance_review_rating))
    : '';
  const revNotes = pickStr(t.performance_review_notes) ?? '';
  const revBy = pickStr(t.performance_reviewed_by) ?? '';
  const revAt = isoDateOnly(pickStr(t.performance_reviewed_at as string | undefined));

  const nameEl = root.querySelector('#tp-teacher-name');
  if (nameEl) {
    nameEl.innerHTML = `<input type="text" class="pw-inline-input" data-tp-field="name" value="${escapeAttr(fullName)}" style="font:inherit;width:100%;max-width:420px"/>`;
  }
  const fnParts = fullName.split(/\s+/).filter(Boolean);
  const fnVal = fnParts[0] || '';
  const lnVal = fnParts.slice(1).join(' ') || '';
  const fnEl = root.querySelector('#tp-first-name');
  if (fnEl) {
    fnEl.innerHTML = `<input type="text" class="pw-inline-input" data-tp-field="first_name" value="${escapeAttr(fnVal)}" style="width:100%"/>`;
  }
  const lnEl = root.querySelector('#tp-last-name');
  if (lnEl) {
    lnEl.innerHTML = `<input type="text" class="pw-inline-input" data-tp-field="last_name" value="${escapeAttr(lnVal)}" style="width:100%"/>`;
  }
  // Phone is intentionally NOT made editable here — changing it requires SMS verification via
  // the "Change Phone" button/modal, never a silent write through the general profile save.
  const emailMeta = root.querySelector('#tp-meta-email');
  if (emailMeta) {
    emailMeta.innerHTML = `<input type="email" class="pw-inline-input" data-tp-field="email" value="${escapeAttr(email)}" style="width:100%;max-width:320px"/>`;
  }

  const stEl = root.querySelector('#tp-chip-status');
  if (stEl) {
    stEl.innerHTML = `<select class="pw-inline-input" data-tp-field="is_active" style="font:inherit;padding:4px 8px;border-radius:8px"><option value="true" ${active ? 'selected' : ''}>Active</option><option value="false" ${!active ? 'selected' : ''}>Inactive</option></select>`;
  }

  const qEl = root.querySelector('#tp-qualification');
  if (qEl) {
    qEl.innerHTML = `<input type="text" class="pw-inline-input" data-tp-field="qualification" value="${escapeAttr(qual)}" style="width:100%"/>`;
  }
  const eEl = root.querySelector('#tp-years-exp');
  if (eEl) {
    eEl.innerHTML = `<input type="text" class="pw-inline-input" data-tp-field="experience" value="${escapeAttr(exp)}" style="width:100%"/>`;
  }
  const aEl = root.querySelector('#tp-address');
  if (aEl) {
    aEl.innerHTML = `<input type="text" class="pw-inline-input" data-tp-field="address" value="${escapeAttr(addr)}" style="width:100%"/>`;
  }
  const sEl = root.querySelector('#tp-salary');
  if (sEl) {
    sEl.innerHTML = `<input type="number" class="pw-inline-input" data-tp-field="salary" value="${escapeAttr(salRaw)}" min="0" step="1" placeholder="0" style="width:100%;max-width:200px"/>`;
  }

  const gEl = root.querySelector('#tp-gender');
  if (gEl) {
    const gLower = gender.toLowerCase();
    gEl.innerHTML = `<select class="pw-inline-input" data-tp-field="gender" style="width:100%"><option value="">—</option><option value="Male" ${gLower === 'male' ? 'selected' : ''}>Male</option><option value="Female" ${gLower === 'female' ? 'selected' : ''}>Female</option><option value="Other" ${gLower === 'other' ? 'selected' : ''}>Other</option></select>`;
  }
  const dobEl = root.querySelector('#tp-dob');
  if (dobEl) {
    dobEl.innerHTML = `<input type="date" class="pw-inline-input" data-tp-field="dob" value="${escapeAttr(dob)}" style="width:100%"/>`;
  }
  const setInp = (sel: string, field: string, val: string) => {
    const el = root.querySelector(sel);
    if (el) el.innerHTML = `<input type="text" class="pw-inline-input" data-tp-field="${field}" value="${escapeAttr(val)}" style="width:100%"/>`;
  };
  setInp('#tp-nationality', 'nationality', nationality);
  setInp('#tp-religion', 'religion', religion);
  setInp('#tp-nin', 'national_id', nin);
  setInp('#tp-district', 'district', district);
  setInp('#tp-emergency', 'emergency_contact', emergency);
  setInp('#tp-employment-type', 'employment_type', empType);
  const hireEl = root.querySelector('#tp-hire-date');
  if (hireEl) {
    hireEl.innerHTML = `<input type="date" class="pw-inline-input" data-tp-field="date_of_hire" value="${escapeAttr(hire)}" style="width:100%"/>`;
  }
  setInp('#tp-bank-name', 'bank_name', bankName);
  setInp('#tp-bank-account', 'bank_account', bankAcc);
  setInp('#tp-department', 'department', dept);
  setInp('#tp-prev-school', 'previous_school', prevSchool);
  const pe = root.querySelector('#tp-personal-email');
  if (pe) {
    pe.innerHTML = `<input type="email" class="pw-inline-input" data-tp-field="personal_email" value="${escapeAttr(personalEmail)}" style="width:100%"/>`;
  }

  const pr = root.querySelector('#tp-perf-rating');
  if (pr) {
    pr.innerHTML = `<input type="number" class="pw-inline-input" data-tp-field="performance_review_rating" value="${escapeAttr(rating)}" min="0" max="5" step="0.1" placeholder="0–5" style="width:120px"/>`;
  }
  const prd = root.querySelector('#tp-perf-review-date');
  if (prd) {
    prd.innerHTML = `<input type="date" class="pw-inline-input" data-tp-field="performance_reviewed_at" value="${escapeAttr(revAt)}" style="width:100%"/>`;
  }
  setInp('#tp-perf-reviewer', 'performance_reviewed_by', revBy);
  const pn = root.querySelector('#tp-perf-notes');
  if (pn) {
    pn.innerHTML = `<textarea class="pw-inline-input" data-tp-field="performance_review_notes" rows="3" style="width:100%;resize:vertical">${escapeHtml(revNotes)}</textarea>`;
  }
}

function parseBoolOrNull(v: string): boolean | null {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

export default function DesignTeacherProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const authUserId = useAuthStore((s) => s.user?.id);
  const authSchoolId = useAuthStore((s) => s.schoolId);
  const { teacher_id: teacherIdParam } = useParams<{ teacher_id: string }>();
  const teacherId = teacherIdParam || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const isEditingRef = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [portalEmail, setPortalEmail] = useState<string | null>(null);
  const [portalPhone, setPortalPhone] = useState<string | null>(null);
  const [changePhoneOpen, setChangePhoneOpen] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [changeEmailInput, setChangeEmailInput] = useState('');
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);
  const [changeEmailSuccess, setChangeEmailSuccess] = useState(false);
  const [changeEmailWarning, setChangeEmailWarning] = useState<string | null>(null);
  const [topbarPortalNode, setTopbarPortalNode] = useState<HTMLElement | null>(null);
  /** Re-runs the full profile fetch + DOM (heavy). Used after save, class-teacher changes, etc. */
  const runFullProfileLoadRef = useRef<null | (() => Promise<void>)>(null);
  /** Re-fetches only teacher_class_subjects + class_teachers and patches the assignments table (light). */
  const refreshSubjectAssignmentsRef = useRef<null | (() => Promise<void>)>(null);
  const saveTeacherRef = useRef<() => Promise<void>>(async () => {});
  const pdfDataRef = useRef<TeacherProfilePdfData | null>(null);
  const isTertiaryRef = useRef(false);

  const saveTeacher = useCallback(async () => {
    if (isSavingRef.current) return;
    const root = containerRef.current?.querySelector('.pw-teacher-profile') || containerRef.current;
    if (!root) return;

    const editBtn = root.querySelector('#tp-btn-edit') as HTMLButtonElement | null;
    const cancelEditBtn = root.querySelector('#tp-btn-cancel-edit') as HTMLButtonElement | null;

    const fn = readTpField(root, 'first_name');
    const ln = readTpField(root, 'last_name');
    const heroName = readTpField(root, 'name');
    const combined = [fn, ln].filter(Boolean).join(' ').trim();
    const name = heroName || combined;

    if (!name) {
      toast.error('Please enter a name for the teacher.');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    if (editBtn) {
      editBtn.disabled = true;
      editBtn.innerHTML = `${SPINNER_SVG} Saving...`;
    }
    if (cancelEditBtn) {
      cancelEditBtn.disabled = true;
    }

    const email = readTpField(root, 'email');
    const qualification = readTpField(root, 'qualification');
    const experience = readTpField(root, 'experience');
    const address = readTpField(root, 'address');
    const salaryRaw = readTpField(root, 'salary');
    const gender = readTpField(root, 'gender');
    const dob = readTpField(root, 'dob');
    const nationality = readTpField(root, 'nationality');
    const religion = readTpField(root, 'religion');
    const national_id = readTpField(root, 'national_id');
    const district = readTpField(root, 'district');
    const emergency_contact = readTpField(root, 'emergency_contact');
    const employment_type = readTpField(root, 'employment_type');
    const date_of_hire = readTpField(root, 'date_of_hire');
    const bank_name = readTpField(root, 'bank_name');
    const bank_account = readTpField(root, 'bank_account');
    const department = readTpField(root, 'department');
    const previous_school = readTpField(root, 'previous_school');
    const personal_email = readTpField(root, 'personal_email');
    const isActiveStr = readTpField(root, 'is_active');
    const ratingStr = readTpField(root, 'performance_review_rating');
    const performance_review_notes = readTpField(root, 'performance_review_notes');
    const performance_reviewed_by = readTpField(root, 'performance_reviewed_by');
    const performance_reviewed_at = readTpField(root, 'performance_reviewed_at');

    const salary = salaryRaw ? parseFloat(salaryRaw) : null;
    const rating = ratingStr ? parseFloat(ratingStr) : null;
    const is_active = parseBoolOrNull(isActiveStr);

    const payload: Record<string, unknown> = {
      name,
      email: email || null,
      qualification: qualification || null,
      experience: experience || null,
      address: address || null,
      salary: salary !== null && !Number.isNaN(salary) ? salary : null,
      gender: gender || null,
      dob: dob || null,
      nationality: nationality || null,
      religion: religion || null,
      national_id: national_id || null,
      district: district || null,
      emergency_contact: emergency_contact || null,
      employment_type: employment_type || null,
      date_of_hire: date_of_hire || null,
      bank_name: bank_name || null,
      bank_account: bank_account || null,
      department: department || null,
      previous_school: previous_school || null,
      personal_email: personal_email || null,
      performance_review_notes: performance_review_notes || null,
      performance_reviewed_by: performance_reviewed_by || null,
      performance_reviewed_at: performance_reviewed_at ? `${performance_reviewed_at}T12:00:00.000Z` : null,
      performance_review_rating:
        rating !== null && !Number.isNaN(rating) ? rating : null,
      updated_at: new Date().toISOString(),
    };
    if (is_active !== null) payload.is_active = is_active;

    const photoInp = root.querySelector('#tp-photo-file') as HTMLInputElement | null;
    const photoFile = photoInp?.files?.[0];
    if (photoFile) {
      try {
        payload.photo_url = await readFileAsDataURL(photoFile);
      } catch {
        toast.error('Could not read the photo file.');
        if (editBtn) {
          editBtn.disabled = false;
          editBtn.innerHTML = `${SAVE_SVG} Save`;
        }
        if (cancelEditBtn) cancelEditBtn.disabled = false;
        isSavingRef.current = false;
        setIsSaving(false);
        return;
      }
    }
    const { error } = await supabase.from('teachers').update(payload).eq('teacher_id', teacherId);
    if (error) {
      toast.error(`Failed to save changes: ${error.message}`);
      if (editBtn) {
        editBtn.disabled = false;
        editBtn.innerHTML = `${SAVE_SVG} Save`;
      }
      if (cancelEditBtn) cancelEditBtn.disabled = false;
      isSavingRef.current = false;
      setIsSaving(false);
      return;
    }
    if (authUserId) {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachersDesign(authUserId) });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'teachers'] });
    }
    if (photoInp) photoInp.value = '';
    toast.success(isTertiaryRef.current ? 'Tutor profile updated successfully' : 'Teacher profile updated successfully');
    isEditingRef.current = false;
    setEditMode(false);
    isSavingRef.current = false;
    setIsSaving(false);
    if (editBtn) {
      editBtn.disabled = false;
      editBtn.innerHTML = `${PENCIL_SVG} Edit`;
    }
    if (cancelEditBtn) {
      cancelEditBtn.disabled = false;
      cancelEditBtn.style.display = 'none';
    }
    setReloadToken((t) => t + 1);
  }, [teacherId, authUserId, queryClient, toast]);

  saveTeacherRef.current = saveTeacher;

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
    setHtmlContent(parseInjectedHtml(profileTemplateRaw));
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

      const schoolId = usePwezaStore.getState().schoolId as string | undefined; // pweza speed system

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

      runFullProfileLoadRef.current = async () => {
        await load();
      };

      const [
        { data: schRow },
        { data: ctRows },
        { data: allSchoolCtRows },
        { data: tcsRows },
        { data: studentsForClasses },
        { data: csRows },
        { data: teacherUsers },
        { data: classStreamsRows },
        ttRes,
      ] = await Promise.all([
        supabase.from('schools').select('type').eq('school_id', school_id).maybeSingle(),
        supabase.from('class_teachers').select('class_name').eq('school_id', school_id).eq('teacher_id', teacherId),
        supabase.from('class_teachers').select('class_name, teacher_id, teachers(name)').eq('school_id', school_id),
        supabase
          .from('teacher_class_subjects')
          .select('id, class_name, subject, assignment_role')
          .eq('school_id', school_id)
          .eq('teacher_id', teacherId)
          .order('class_name'),
        supabase.from('students').select('current_class').eq('school_id', school_id),
        supabase.from('class_subjects').select('class_name, subject').eq('school_id', school_id),
        supabase
          .from('users')
          .select('user_id, email, is_active, created_at, last_sign_in_at, phone, linked_teacher_id')
          .eq('school_id', school_id)
          .eq('role', 'teacher'),
        supabase
          .from('class_streams')
          .select('class_name, stream_name, sort_order')
          .eq('school_id', school_id)
          .order('class_name')
          .order('sort_order')
          .order('stream_name'),
        supabase
          .from('timetable_periods')
          .select('class_name, day_of_week, subject, start_time, end_time')
          .eq('school_id', school_id)
          .eq('teacher_id', teacherId)
          .order('start_time'),
      ]);

      const isTertiary = isTertiarySchool((schRow as { type?: string } | null)?.type);
      isTertiaryRef.current = isTertiary;

      const occupantByClass: Record<string, string> = {};
      const teacherNameById: Record<string, string> = {};
      for (const r of allSchoolCtRows || []) {
        const row = r as { class_name?: string; teacher_id?: string; teachers?: { name?: string } | null };
        const cn = String(row.class_name || '').trim();
        const tid = String(row.teacher_id || '').trim();
        if (cn && tid) {
          occupantByClass[cn] = tid;
          const teacherName = Array.isArray(row.teachers) ? (row.teachers[0] as { name?: string })?.name : row.teachers?.name;
          if (teacherName) teacherNameById[tid] = String(teacherName).trim();
        }
      }
      const occupantForClass = (cls: string): string | undefined => {
        if (occupantByClass[cls]) return occupantByClass[cls];
        const hit = Object.keys(occupantByClass).find((k) => k.toLowerCase() === cls.toLowerCase());
        return hit ? occupantByClass[hit] : undefined;
      };

      const streamsByClass: Record<string, string[]> = {};
      (classStreamsRows || []).forEach((r: { class_name?: string; stream_name?: string }) => {
        const cn = String(r.class_name || '').trim();
        const sn = String(r.stream_name || '').trim();
        if (!cn || !sn) return;
        if (!streamsByClass[cn]) streamsByClass[cn] = [];
        if (!streamsByClass[cn].includes(sn)) streamsByClass[cn].push(sn);
      });

      const subjectsByClass: Record<string, string[]> = {};
      (csRows || []).forEach((r: { class_name?: string; subject?: string }) => {
        const cn = String(r.class_name || '').trim();
        const sn = String(r.subject || '').trim();
        if (!cn || !sn) return;
        if (!subjectsByClass[cn]) subjectsByClass[cn] = [];
        if (!subjectsByClass[cn].includes(sn)) subjectsByClass[cn].push(sn);
      });
      Object.keys(subjectsByClass).forEach((k) =>
        subjectsByClass[k].sort((a, b) => a.localeCompare(b))
      );
      const ttRows = ttRes.error ? [] : ttRes.data || [];

      const want = normEmail(pickStr(t.email));
      const teacherUserRows = (teacherUsers || []) as {
        user_id?: string;
        email?: string;
        is_active?: boolean;
        created_at?: string;
        last_sign_in_at?: string | null;
        phone?: string | null;
        linked_teacher_id?: string | null;
      }[];
      const portalUser =
        teacherUserRows.find(
          (u) =>
            (u.linked_teacher_id && u.linked_teacher_id === teacherId) ||
            (!!want && normEmail(u.email) === want)
        ) ?? null;
      setLinkedUserId((portalUser as { user_id?: string } | null)?.user_id ?? null);
      setPortalEmail((portalUser as { email?: string } | null)?.email ?? null);
      setPortalPhone(pickStr(t.phone) ?? null);

      const fullName = String(t.name || '').trim() || '—';
      const { first: firstName, last: lastName } = splitName(fullName);

      const classTeacherNames = new Set((ctRows || []).map((r) => String((r as { class_name?: string }).class_name || '').trim()).filter(Boolean));

      const assignments = (tcsRows || []) as {
        id: string;
        class_name: string;
        subject: string;
        assignment_role?: string | null;
      }[];

      const classFromTcs = [...new Set(assignments.map((a) => a.class_name).filter(Boolean))];
      const classNames = [...new Set([...classTeacherNames, ...classFromTcs])];

      pdfDataRef.current = {
        name: fullName,
        phone: pickStr(t.phone),
        email: pickStr(t.email),
        employee_id: pickStr(t.employee_id),
        date_of_hire: pickStr(t.date_of_hire),
        gender: pickStr(t.gender),
        nationality: pickStr(t.nationality),
        address: pickStr(t.address),
        qualification: pickStr(t.qualification),
        specialization: pickStr(t.specialization ?? t.experience),
        classes: classNames,
        portal_active: !!(portalUser as { is_active?: boolean } | null)?.is_active,
        photoUrl: pickStr(t.photo_url) || null,
      };

      const pu = portalUser as {
        email?: string;
        is_active?: boolean;
        created_at?: string;
        last_sign_in_at?: string | null;
        phone?: string | null;
        linked_teacher_id?: string | null;
      } | null;
      const portalActive = !!(
        pu &&
        pu.is_active !== false &&
        ((want && normEmail(pu.email) === want) || pu.linked_teacher_id === teacherId)
      );

      const uniqueFromStudents = Array.from(
        new Set(
          (studentsForClasses || [])
            .map((s) => String((s as { current_class?: string }).current_class || '').trim())
            .filter(Boolean)
        )
      );
      const schoolType = (schRow as { type?: string } | null)?.type;
      const uniqueClasses = mergeClassNamesWithCanonical(schoolType ?? null, uniqueFromStudents);

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90);
      const fromStr = fromDate.toISOString().slice(0, 10);

      const pairSet = new Set(assignments.map((a) => `${a.class_name}|${a.subject}`));
      const clsForExam = [...new Set(assignments.map((a) => a.class_name).filter(Boolean))];
      const subForExam = [...new Set(assignments.map((a) => a.subject).filter(Boolean))];
      const runExamQuery = clsForExam.length > 0 && subForExam.length > 0;

      /** Heavy reads run in parallel (were sequential ~8+ round-trips — main cause of slow profile). */
      const [
        { data: attRows },
        { data: payRows },
        { data: docRows },
        { data: recentAssignRows },
        { count: assignSetCount },
        { data: assignIdRows },
        erRes,
      ] = await Promise.all([
        supabase
          .from('student_attendance')
          .select('present, status, arrived_late')
          .eq('school_id', school_id)
          .eq('teacher_id', teacherId)
          .gte('attendance_date', fromStr),
        supabase
          .from('school_expenses')
          .select(
            `
          expense_id,
          amount,
          expense_date,
          created_at,
          description,
          category_name,
          payment_method,
          status,
          salary_period_label,
          reference_number,
          expense_subcategories ( name, is_salary )
        `
          )
          .eq('school_id', school_id)
          .eq('linked_teacher_id', teacherId)
          .order('expense_date', { ascending: false })
          .limit(150),
        supabase
          .from('teacher_documents')
          .select(
            'id, doc_kind, doc_category, original_filename, storage_path, mime_type, file_size_bytes, created_at'
          )
          .eq('school_id', school_id)
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('assignments')
          .select('title, class_name, subject, created_at')
          .eq('school_id', school_id)
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('assignments')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', school_id)
          .eq('teacher_id', teacherId),
        supabase
          .from('assignments')
          .select('id')
          .eq('school_id', school_id)
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(400),
        runExamQuery
          ? supabase
              .from('exam_results')
              .select('class_name, subject, marks_obtained, total_marks')
              .eq('school_id', school_id)
              .in('class_name', clsForExam)
              .in('subject', subForExam)
              .limit(3000)
          : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
      ]);

      const aidList = (assignIdRows || []).map((r) => (r as { id: string }).id);
      let markedAssignCount = 0;
      let submissionTotal = 0;
      if (aidList.length > 0) {
        const [{ count: mc }, { count: st }] = await Promise.all([
          supabase
            .from('assignment_submissions')
            .select('id', { count: 'exact', head: true })
            .in('assignment_id', aidList)
            .eq('status', 'graded'),
          supabase.from('assignment_submissions').select('id', { count: 'exact', head: true }).in('assignment_id', aidList),
        ]);
        markedAssignCount = mc ?? 0;
        submissionTotal = st ?? 0;
      }

      const erRows = (erRes as { data?: unknown }).data;
      const erFiltered = (Array.isArray(erRows) ? erRows : []).filter((r) => {
        const row = r as { class_name?: string; subject?: string };
        return pairSet.has(`${String(row.class_name || '').trim()}|${String(row.subject || '').trim()}`);
      });
      let avgPct: number | null = null;
      if (erFiltered.length > 0) {
        const sum = erFiltered.reduce((acc, r) => {
          const row = r as { marks_obtained?: number; total_marks?: number };
          const mo = Number(row.marks_obtained ?? 0);
          const tm = Number(row.total_marks ?? 100) || 100;
          return acc + (mo / tm) * 100;
        }, 0);
        avgPct = sum / erFiltered.length;
      }

      const attList = (attRows || []) as {
        present?: boolean;
        status?: string | null;
        arrived_late?: boolean;
      }[];
      const presentDays = attList.filter((r) => studentAttendanceRowIsPresent(r)).length;
      const absentDays = attList.filter((r) => !studentAttendanceRowIsPresent(r)).length;
      const lateArrivalCount = attList.filter(
        (r) =>
          String(r.status || '').toLowerCase() === 'late' ||
          (studentAttendanceRowIsPresent(r) && r.arrived_late === true)
      ).length;
      const attTotal = attList.length;
      const attRatePct = attTotal > 0 ? Math.round((presentDays / attTotal) * 100) : null;
      const markRatePct =
        submissionTotal > 0 ? Math.round((markedAssignCount / submissionTotal) * 100) : null;

      if (cancelled) return;

      const refreshSubjectAssignments = async () => {
        const [{ data: ctRowsFresh }, { data: tcsRowsFresh }] = await Promise.all([
          supabase.from('class_teachers').select('class_name').eq('school_id', school_id).eq('teacher_id', teacherId),
          supabase
            .from('teacher_class_subjects')
            .select('id, class_name, subject, assignment_role')
            .eq('school_id', school_id)
            .eq('teacher_id', teacherId)
            .order('class_name'),
        ]);
        const classTeacherNamesFresh = new Set(
          (ctRowsFresh || [])
            .map((r) => String((r as { class_name?: string }).class_name || '').trim())
            .filter(Boolean),
        );
        const assignmentsFresh = (tcsRowsFresh || []) as TeacherClassSubjectAssignment[];
        const classFromTcsFresh = [...new Set(assignmentsFresh.map((a) => a.class_name).filter(Boolean))];
        const classNamesFresh = [...new Set([...classTeacherNamesFresh, ...classFromTcsFresh])];
        requestAnimationFrame(() => {
          const el = containerRef.current;
          if (!el) return;
          const rootEl = el.querySelector('.pw-teacher-profile') || el;
          patchTeacherSubjectAssignmentsInDom(
            rootEl,
            assignmentsFresh,
            classTeacherNamesFresh,
            classNamesFresh,
            refreshSubjectAssignments,
            isTertiaryRef.current,
          );
        });
      };
      refreshSubjectAssignmentsRef.current = refreshSubjectAssignments;

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
        if (isTertiary) {
          const bcLink = root.querySelector('.tp-bc-link');
          if (bcLink) bcLink.textContent = 'Tutors';
          const backBtn = root.querySelector('.tp-back');
          if (backBtn) backBtn.innerHTML = `‹ Back to Tutors`;
        }

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
        if (statusChip && !editMode) {
          const isInactive = t.is_active === false;
          statusChip.innerHTML = isInactive ? `${X_SVG} Inactive` : `${CHECK_SVG} Active`;
          statusChip.className = `tp-chip ${isInactive ? 'rose' : 'green'}`;
        }

        setHTML('#tp-chip-emp-id', `${ID_SVG} ${escapeHtml(pickStr(t.employee_id) || '—')}`);

        const roleChip = root.querySelector('#tp-chip-role') as HTMLElement | null;
        if (roleChip) {
          const isClassTeacher = classTeacherNames.size > 0;
          roleChip.innerHTML = isClassTeacher ? `${GRADUATION_CAP_SVG} Class Teacher` : `${BOOK_OPEN_SVG} Subject Teacher`;
          roleChip.className = `tp-chip ${isClassTeacher ? 'teal' : 'blue'}`;
        }

        setHTML('#tp-chip-hired', `${CALENDAR_SVG} Hired ${fmtShort(pickStr(t.date_of_hire))}`);
        {
          const qual = pickStr(t.qualification);
          const deptChip = root.querySelector('#tp-chip-dept') as HTMLElement | null;
          if (deptChip) {
            if (qual) {
              deptChip.style.display = '';
              deptChip.innerHTML = `${SCHOOL_SVG} ${escapeHtml(qual)}`;
            } else {
              deptChip.style.display = 'none';
            }
          }
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
        set('#tp-nationality', pickStr(t.nationality) || '—');
        set('#tp-religion', pickStr(t.religion) || '—');
        set('#tp-nin', pickStr(t.national_id) || 'Not recorded');
        set('#tp-address', pickStr(t.address) || '—');
        set('#tp-district', pickStr(t.district) || '—');
        set('#tp-emergency', pickStr(t.emergency_contact) || '—');

        set('#tp-emp-id', pickStr(t.employee_id) || '—');
        set('#tp-hire-date', fmtDate(pickStr(t.date_of_hire)));
        set('#tp-employment-type', pickStr(t.employment_type) || '—');
        set('#tp-salary', fmtUGX(t.salary != null ? Number(t.salary) : null));
        set('#tp-bank-name', pickStr(t.bank_name) || '—');
        set('#tp-bank-account', pickStr(t.bank_account) || '—');
        set('#tp-department', pickStr(t.department) || '—');
        set('#tp-qualification', pickStr(t.qualification) || '—');
        set('#tp-prev-school', pickStr(t.previous_school) || '—');
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
        set('#tp-personal-email', pickStr(t.personal_email) || '—');

        const ps = root.querySelector('#tp-portal-status') as HTMLElement | null;
        if (ps) {
          ps.innerHTML = portalActive ? `${CHECK_SVG} Active` : `${X_SVG} Not registered`;
          ps.className = `tp-field-value ${portalActive ? 'green' : 'muted'}`;
        }
        set('#tp-portal-email', pickStr(pu?.email) || email || '—');
        set(
          '#tp-portal-last-login',
          pu?.last_sign_in_at ? timeAgo(pu.last_sign_in_at) : 'Never'
        );
        set('#tp-portal-2fa', 'Not tracked in app');
        setHTML(
          '#tp-portal-permissions',
          portalActive
            ? `<span class="tp-tag">Classes</span><span class="tp-tag">Attendance</span><span class="tp-tag">Reports</span>`
            : `<span class="tp-tag">—</span>`
        );

        const sel = root.querySelector('#tp-assign-class-select') as HTMLSelectElement | null;
        const renderSubjectPicker = (cls: string) => {
          const wrap = root.querySelector('#tp-assign-subject-wrap') as HTMLElement | null;
          if (!wrap) return;
          if (!cls) {
            wrap.innerHTML =
              '<span style="font-size:12px;color:var(--t3)">Select a class to see subjects from your school catalogue.</span>';
            return;
          }
          let subs = subjectsByClass[cls] || [];
          if (subs.length === 0) {
            const matchKey = Object.keys(subjectsByClass).find((x) => x.toLowerCase() === cls.toLowerCase());
            if (matchKey) subs = subjectsByClass[matchKey];
          }
          if (subs.length === 0) {
            wrap.innerHTML =
              '<span style="font-size:12px;color:var(--t3);line-height:1.45">No subjects configured for this class. Add them under Admin → Settings → Subjects per Class.</span>';
            return;
          }
          wrap.innerHTML = `<div class="tp-subject-picks" style="display:flex;flex-wrap:wrap;gap:6px">${subs
            .map(
              (s) =>
                `<button type="button" class="tp-subject-pick" data-subject="${escapeAttr(s)}">${escapeHtml(s)}</button>`
            )
            .join('')}</div>`;
          wrap.querySelectorAll('.tp-subject-pick').forEach((btn) => {
            btn.addEventListener('click', () => (btn as HTMLElement).classList.toggle('selected'));
          });
        };

        const streamGroup = root.querySelector('#tp-assign-stream-group') as HTMLElement | null;
        const streamSel = root.querySelector('#tp-assign-stream-select') as HTMLSelectElement | null;

        const updateStreamPicker = (cls: string) => {
          const streams = streamsByClass[cls];
          if (streams && streams.length >= 2 && streamGroup && streamSel) {
            streamSel.innerHTML =
              `<option value="">All streams</option>` +
              streams.map((sn) => `<option value="${escapeHtml(sn)}">${escapeHtml(sn)}</option>`).join('');
            streamGroup.style.display = '';
          } else if (streamGroup) {
            streamGroup.style.display = 'none';
            if (streamSel) streamSel.value = '';
          }
        };

        if (sel) {
          sel.innerHTML =
            `<option value="">Select class</option>` +
            uniqueClasses.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
          sel.onchange = () => {
            renderSubjectPicker(sel.value);
            updateStreamPicker(sel.value);
          };
          renderSubjectPicker(sel.value);
          updateStreamPicker(sel.value);
        }

        const ctSel = root.querySelector('#tp-ct-class-select') as HTMLSelectElement | null;
        const ctHint = root.querySelector('#tp-ct-hint') as HTMLElement | null;
        const updateCtHint = () => {
          if (!ctHint || !ctSel) return;
          const cls = ctSel.value.trim();
          ctHint.style.color = 'var(--t3)';
          if (!cls) {
            ctHint.textContent = 'Select a class to see if it already has a class teacher.';
            return;
          }
          const occ = occupantForClass(cls);
          if (!occ) {
            ctHint.textContent = 'This class does not have a class teacher yet. You can assign this teacher.';
            ctHint.style.color = 'var(--green)';
          } else if (occ === teacherId) {
            ctHint.textContent = 'This teacher is already the class teacher for this class.';
            ctHint.style.color = 'var(--t2)';
          } else {
            const nm = teacherNameById[occ] || 'Another teacher';
            ctHint.textContent = `This class already has a class teacher (${nm}). Unassign them first, then assign someone else.`;
            ctHint.style.color = 'var(--amber)';
          }
        };

        if (ctSel) {
          ctSel.innerHTML =
            `<option value="">Select class…</option>` +
            uniqueClasses
              .map((c) => {
                const occ = occupantForClass(c);
                let suffix = '';
                if (!occ) suffix = ' — No class teacher yet';
                else if (occ === teacherId) suffix = ' — You (class teacher)';
                else suffix = ` — Class teacher: ${teacherNameById[occ] || 'Assigned'}`;
                return `<option value="${escapeAttr(c)}">${escapeHtml(c + suffix)}</option>`;
              })
              .join('');
          ctSel.onchange = updateCtHint;
          updateCtHint();
        }

        const ctListEl = root.querySelector('#tp-ct-current-list') as HTMLElement | null;
        if (ctListEl) {
          const ctClasses = [...classTeacherNames].sort((a, b) => a.localeCompare(b));
          if (ctClasses.length === 0) {
            ctListEl.innerHTML = `<span style="font-size:13px;color:var(--t3);font-style:italic">Not class teacher for any class yet.</span>`;
          } else {
            ctListEl.innerHTML = ctClasses
              .map(
                (cn) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:var(--s2);border:1px solid var(--border);border-radius:10px">
                <span style="font-weight:600;color:var(--t1)">${escapeHtml(cn)}</span>
                <button type="button" class="tp-remove-btn" data-ct-class="${escapeAttr(cn)}">Remove</button>
              </div>`
              )
              .join('');
            ctListEl.querySelectorAll('[data-ct-class]').forEach((btn) => {
              (btn as HTMLButtonElement).onclick = async () => {
                const cname = (btn as HTMLElement).dataset.ctClass;
                if (!cname || !window.confirm(`Remove class teacher assignment for ${cname}?`)) return;
                const { error: delErr } = await supabase
                  .from('class_teachers')
                  .delete()
                  .eq('school_id', school_id)
                  .eq('teacher_id', teacherId)
                  .eq('class_name', cname);
                if (delErr) window.alert(delErr.message);
                else void runFullProfileLoadRef.current?.();
              };
            });
          }
        }

        const assignCtBtn = root.querySelector('#tp-btn-assign-ct') as HTMLButtonElement | null;
        if (assignCtBtn) {
          assignCtBtn.onclick = async () => {
            const cls = ctSel?.value.trim();
            if (!cls || !school_id) {
              window.alert('Select a class first.');
              return;
            }
            const occ = occupantForClass(cls);
            if (occ && occ !== teacherId) {
              const nm = teacherNameById[occ] || 'another teacher';
              window.alert(`This class already has a class teacher (${nm}). Unassign them first.`);
              return;
            }
            if (occ === teacherId) {
              window.alert('This teacher is already the class teacher for this class.');
              return;
            }
            const { error: insErr } = await supabase.from('class_teachers').insert({
              school_id,
              class_name: cls,
              teacher_id: teacherId,
            });
            if (insErr) {
              window.alert(insErr.message);
              return;
            }
            void runFullProfileLoadRef.current?.();
          };
        }

        patchTeacherSubjectAssignmentsInDom(
          root,
          assignments,
          classTeacherNames,
          classNames,
          refreshSubjectAssignments,
          isTertiary,
        );

        const doAssign = root.querySelector('#tp-btn-do-assign') as HTMLButtonElement | null;
        if (doAssign) {
          doAssign.onclick = async () => {
            const cls = (root.querySelector('#tp-assign-class-select') as HTMLSelectElement)?.value;
            const streamVal = (root.querySelector('#tp-assign-stream-select') as HTMLSelectElement)?.value || null;
            const subWrap = root.querySelector('#tp-assign-subject-wrap');
            const parts = subWrap
              ? Array.from(subWrap.querySelectorAll('.tp-subject-pick.selected')).map(
                  (b) => String((b as HTMLElement).dataset.subject || '').trim()
                )
              : [];
            if (!cls || !school_id) return;
            if (parts.length === 0) {
              window.alert('Select a class, then tap one or more subjects to assign.');
              return;
            }

            const teacherNameCache = new Map<string, string>();
            const getTeacherName = async (tid: string) => {
              if (teacherNameCache.has(tid)) return teacherNameCache.get(tid)!;
              const { data } = await supabase.from('teachers').select('name').eq('teacher_id', tid).maybeSingle();
              const n = String((data as { name?: string } | null)?.name || 'Another teacher').trim();
              teacherNameCache.set(tid, n);
              return n;
            };

            const toInsert: {
              school_id: string;
              teacher_id: string;
              class_name: string;
              subject: string;
              assignment_role: 'subject_teacher' | 'co_teacher';
              stream_name: string | null;
            }[] = [];

            for (const subject of parts) {
              const { data: primary } = await supabase
                .from('teacher_class_subjects')
                .select('teacher_id')
                .eq('school_id', school_id)
                .eq('class_name', cls)
                .eq('subject', subject)
                .eq('assignment_role', 'subject_teacher')
                .maybeSingle();

              const pid = (primary as { teacher_id?: string } | null)?.teacher_id;
              if (pid && pid === teacherId) {
                window.alert(`Already assigned as subject teacher: ${subject}`);
                continue;
              }
              if (pid && pid !== teacherId) {
                const otherName = await getTeacherName(pid);
                const ok = window.confirm(
                  `${cls} — ${subject} already has a subject teacher (${otherName}).\n\nAdd ${String(t.name || 'this teacher')} as a co-teacher for this subject?`
                );
                if (!ok) continue;
                toInsert.push({
                  school_id,
                  teacher_id: teacherId,
                  class_name: cls,
                  subject,
                  assignment_role: 'co_teacher',
                  stream_name: streamVal,
                });
              } else {
                toInsert.push({
                  school_id,
                  teacher_id: teacherId,
                  class_name: cls,
                  subject,
                  assignment_role: 'subject_teacher',
                  stream_name: streamVal,
                });
              }
            }

            if (toInsert.length === 0) return;
            const { error } = await supabase.from('teacher_class_subjects').upsert(toInsert, { onConflict: 'school_id,teacher_id,class_name,subject', ignoreDuplicates: true });
            if (error) {
              window.alert(error.message);
              return;
            }
            void refreshSubjectAssignments();
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
            ttBody.innerHTML = `<div class="tp-empty" style="padding:28px"><div class="tp-empty-icon">${CALENDAR_SVG}</div><div class="tp-empty-title">No timetable entries</div><div class="tp-empty-sub">When periods are scheduled for this teacher in Timetable, they will show here.</div></div>`;
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

        set('#tp-perf-present', String(presentDays));
        set('#tp-perf-absent', String(absentDays));
        set('#tp-perf-att-rate', attRatePct != null ? `${attRatePct}%` : '—');
        const attBar = root.querySelector('#tp-att-bar') as HTMLElement | null;
        if (attBar) attBar.style.width = `${attRatePct ?? 0}%`;
        set('#tp-perf-late', String(lateArrivalCount));
        set('#tp-perf-assignments-set', String(assignSetCount ?? 0));
        set('#tp-perf-marked', String(markedAssignCount));
        set('#tp-perf-mark-rate', markRatePct != null ? `${markRatePct}%` : '—');
        const markBar = root.querySelector('#tp-mark-bar') as HTMLElement | null;
        if (markBar) markBar.style.width = `${markRatePct ?? 0}%`;
        set('#tp-perf-avg-score', avgPct != null ? `${Math.round(avgPct)}%` : '—');

        const ratingVal = t.performance_review_rating != null ? String(t.performance_review_rating) : '';
        set('#tp-perf-rating', ratingVal ? `${ratingVal} / 5` : 'Not rated yet');
        set(
          '#tp-perf-review-date',
          pickStr(t.performance_reviewed_at as string | undefined) ? fmtDate(pickStr(t.performance_reviewed_at as string | undefined)) : '—'
        );
        set('#tp-perf-reviewer', pickStr(t.performance_reviewed_by) || '—');
        set('#tp-perf-notes', pickStr(t.performance_review_notes) || 'No review notes yet.');

        const payList = (payRows || []) as Array<{
          expense_id: string;
          amount: number | string;
          expense_date: string;
          created_at?: string;
          description: string;
          category_name: string;
          payment_method: string | null;
          status: string | null;
          salary_period_label: string | null;
          reference_number: string | null;
          expense_subcategories: { name?: string; is_salary?: boolean } | null;
        }>;

        const paymentBody = root.querySelector('#tp-payment-history-body') as HTMLElement | null;
        if (paymentBody) {
          if (payList.length === 0) {
            paymentBody.innerHTML = `<div class="tp-empty" style="padding:28px">
              <div class="tp-empty-icon">${PAY_ROW_SVG}</div>
              <div class="tp-empty-title">No payment lines yet</div>
              <div class="tp-empty-sub">When your accountant records salary or allowances in <strong>Expenses</strong>, link this teacher and choose a payroll subcategory. Past payments will appear here.</div>
            </div>`;
          } else {
            const rows = payList
              .map((row) => {
                const sub = row.expense_subcategories;
                const typeLabel = sub?.name || row.category_name || 'Payment';
                const kindTag = sub?.is_salary ? 'Payroll' : 'Expense';
                const desc = escapeHtml(String(row.description || '').slice(0, 160));
                const descTitle = escapeAttr(String(row.description || '').slice(0, 240));
                const ref = row.reference_number ? escapeHtml(row.reference_number) : '—';
                return `<tr>
                  <td style="padding:10px 12px;border-bottom:1px solid var(--border);white-space:nowrap">${escapeHtml(fmtDate(row.expense_date))}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid var(--border);color:var(--t2)">${escapeHtml(row.salary_period_label || '—')}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid var(--border)"><span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:var(--teal-s);color:var(--teal)">${escapeHtml(kindTag)}</span> ${escapeHtml(typeLabel)}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid var(--border);font-weight:600">${escapeHtml(fmtUGX(Number(row.amount)))}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid var(--border);color:var(--t3)">${escapeHtml(row.payment_method || '—')}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid var(--border)">${escapeHtml(fmtExpenseStatus(row.status))}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid var(--border);color:var(--t3)">${ref}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid var(--border);max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${descTitle}">${desc}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid var(--border)"><a href="#" data-nav="/dashboard/accountant/expenses/receipt/${escapeAttr(String(row.expense_id))}" style="color:var(--teal);font-weight:600">Voucher</a></td>
                </tr>`;
              })
              .join('');
            paymentBody.innerHTML = `<div style="overflow-x:auto;padding:10px 12px 16px">
              <table style="width:100%;border-collapse:collapse;font-size:12.5px">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:8px 10px;color:var(--t3);font-size:10px;text-transform:uppercase">Paid / dated</th>
                    <th style="text-align:left;padding:8px 10px;color:var(--t3);font-size:10px;text-transform:uppercase">Period</th>
                    <th style="text-align:left;padding:8px 10px;color:var(--t3);font-size:10px;text-transform:uppercase">Type</th>
                    <th style="text-align:left;padding:8px 10px;color:var(--t3);font-size:10px;text-transform:uppercase">Amount</th>
                    <th style="text-align:left;padding:8px 10px;color:var(--t3);font-size:10px;text-transform:uppercase">Method</th>
                    <th style="text-align:left;padding:8px 10px;color:var(--t3);font-size:10px;text-transform:uppercase">Status</th>
                    <th style="text-align:left;padding:8px 10px;color:var(--t3);font-size:10px;text-transform:uppercase">Ref</th>
                    <th style="text-align:left;padding:8px 10px;color:var(--t3);font-size:10px;text-transform:uppercase">Notes</th>
                    <th style="text-align:left;padding:8px 10px;color:var(--t3);font-size:10px;text-transform:uppercase"></th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>`;
          }
        }

        const fmtDocSize = (n: number | null | undefined) => {
          if (n == null || Number.isNaN(Number(n))) return '';
          if (n < 1024) return `${n} B`;
          if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
          return `${(n / (1024 * 1024)).toFixed(1)} MB`;
        };

        const docs = (docRows || []) as Array<{
          id: string;
          doc_kind: string;
          doc_category: string | null;
          original_filename: string;
          storage_path: string;
          file_size_bytes: number | null;
          created_at: string;
        }>;

        const renderDocRows = (kind: 'kyc' | 'academic') => {
          const list = docs.filter((d) => d.doc_kind === kind);
          if (list.length === 0) {
            return `<div class="tp-empty"><div class="tp-empty-icon">${EMPTY_FOLDER_SVG}</div><div class="tp-empty-title">No ${kind === 'kyc' ? 'KYC' : 'academic'} documents</div><div class="tp-empty-sub">Upload PDF or images using the area above.</div></div>`;
          }
          return list
            .map((d) => {
              const sz = fmtDocSize(d.file_size_bytes);
              const cat = d.doc_category || 'Other';
              return `<div class="tp-doc-row" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="tp-doc-ic pdf">${EMPTY_DOC_SVG}</div>
                <div style="flex:1;min-width:0">
                  <div class="tp-doc-name" style="font-weight:600">${escapeHtml(d.original_filename)}</div>
                  <div class="tp-doc-meta" style="font-size:12px;color:var(--t3)">${escapeHtml(cat)} · ${escapeHtml(fmtDate(d.created_at))}${sz ? ` · ${sz}` : ''}</div>
                </div>
                <button type="button" class="tp-doc-btn tp-doc-btn-ghost" data-tp-doc-download="${escapeAttr(d.storage_path)}">⬇ Open</button>
                <button type="button" class="tp-doc-btn" data-tp-doc-delete="${escapeAttr(d.id)}" data-tp-doc-path="${escapeAttr(d.storage_path)}" style="color:var(--rose)">Remove</button>
              </div>`;
            })
            .join('');
        };

        setHTML('#tp-kyc-body', renderDocRows('kyc'));
        setHTML('#tp-academic-body', renderDocRows('academic'));

        root.querySelectorAll('[data-tp-doc-download]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const path = (btn as HTMLElement).dataset.tpDocDownload;
            if (!path) return;
            const { data, error } = await supabase.storage.from(TEACHER_DOC_BUCKET).createSignedUrl(path, 3600);
            if (error || !data?.signedUrl) {
              window.alert(error?.message || 'Could not open file.');
              return;
            }
            window.open(data.signedUrl, '_blank', 'noopener');
          });
        });

        root.querySelectorAll('[data-tp-doc-delete]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = (btn as HTMLElement).dataset.tpDocDelete;
            const path = (btn as HTMLElement).dataset.tpDocPath;
            if (!id || !path) return;
            if (!window.confirm('Remove this document from the profile?')) return;
            const { error: delDb } = await supabase.from('teacher_documents').delete().eq('id', id);
            if (delDb) {
              window.alert(delDb.message);
              return;
            }
            await supabase.storage.from(TEACHER_DOC_BUCKET).remove([path]);
            void runFullProfileLoadRef.current?.();
            if (authUserId) {
              void queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachersDesign(authUserId) });
            }
          });
        });

        type ActRow = { at: string; title: string; sub: string };
        const actItems: ActRow[] = [];
        (recentAssignRows || []).forEach((r) => {
          const row = r as { title?: string; class_name?: string; subject?: string; created_at?: string };
          if (!row.created_at) return;
          actItems.push({
            at: row.created_at,
            title: `Assignment: ${String(row.title || '').slice(0, 80)}`,
            sub: `${String(row.class_name || '')} · ${String(row.subject || '')}`,
          });
        });
        docs.forEach((d) => {
          actItems.push({
            at: d.created_at,
            title: `Document · ${d.doc_kind === 'kyc' ? 'KYC' : 'Academic'}`,
            sub: d.original_filename,
          });
        });
        payList.forEach((row) => {
          const c = row.created_at;
          actItems.push({
            at: c || `${row.expense_date}T12:00:00.000Z`,
            title: `Payroll / expense · ${fmtUGX(Number(row.amount))}`,
            sub: String(row.description || row.category_name || '').slice(0, 120),
          });
        });
        actItems.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        const actTop = actItems.slice(0, 24);
        if (actTop.length === 0) {
          setHTML(
            '#tp-activity-body',
            `<div class="tp-empty"><div class="tp-empty-icon">${CLOCK_SVG}</div><div class="tp-empty-title">No recent activity</div><div class="tp-empty-sub">Assignments, document uploads, and recorded payroll lines will appear here.</div></div>`
          );
        } else {
          setHTML(
            '#tp-activity-body',
            `<div style="display:flex;flex-direction:column;gap:10px;padding:8px 0">
              ${actTop
                .map(
                  (a) => `
              <div style="display:flex;justify-content:space-between;gap:14px;padding:12px 14px;background:var(--s1);border:1px solid var(--border);border-radius:10px;font-size:13px">
                <div style="min-width:0">
                  <div style="font-weight:600;color:var(--t1)">${escapeHtml(a.title)}</div>
                  <div style="font-size:12px;color:var(--t3);margin-top:4px">${escapeHtml(a.sub)}</div>
                </div>
                <div style="white-space:nowrap;font-size:11.5px;color:var(--t3);align-self:flex-start">${escapeHtml(timeAgo(a.at))}</div>
              </div>`
                )
                .join('')}
            </div>`
          );
        }

        const profileShell = root as HTMLElement;
        if (!profileShell.dataset.tpDocCatDelegated) {
          profileShell.dataset.tpDocCatDelegated = '1';
          profileShell.addEventListener('click', (ev) => {
            const el = (ev.target as HTMLElement).closest('.tp-doc-cat-btn');
            if (!el || !profileShell.contains(el)) return;
            const wrap = el.closest('.tp-doc-categories');
            if (!wrap) return;
            wrap.querySelectorAll('.tp-doc-cat-btn').forEach((b) => b.classList.remove('active'));
            el.classList.add('active');
          });
        }

        const doUpload = async (files: FileList | null, kind: 'kyc' | 'academic', tabSel: string) => {
          if (!files?.length || !school_id) return;
          const { data: auth } = await supabase.auth.getUser();
          const uid = auth.user?.id ?? null;
          const cat = activeDocCategory(root, tabSel);
          for (const file of Array.from(files)) {
            if (file.size > 10 * 1024 * 1024) {
              window.alert(`${file.name} is larger than 10MB.`);
              continue;
            }
            const path = `${school_id}/${teacherId}/${kind}/${Date.now()}_${safeFileName(file.name)}`;
            const { error: upErr } = await supabase.storage.from(TEACHER_DOC_BUCKET).upload(path, file, {
              contentType: file.type || undefined,
              upsert: false,
            });
            if (upErr) {
              window.alert(upErr.message);
              continue;
            }
            const { error: insErr } = await supabase.from('teacher_documents').insert({
              school_id,
              teacher_id: teacherId,
              doc_kind: kind,
              doc_category: cat,
              storage_path: path,
              original_filename: file.name,
              mime_type: file.type || null,
              file_size_bytes: file.size,
              uploaded_by: uid,
            });
            if (insErr) {
              window.alert(insErr.message);
              await supabase.storage.from(TEACHER_DOC_BUCKET).remove([path]);
            }
          }
          void runFullProfileLoadRef.current?.();
          if (authUserId) {
            void queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachersDesign(authUserId) });
          }
        };

        const wireUpload = (inputSel: string, kind: 'kyc' | 'academic', tabSel: string) => {
          const inp = root.querySelector(inputSel) as HTMLInputElement | null;
          if (inp)
            inp.onchange = () => {
              const f = inp.files;
              void doUpload(f, kind, tabSel).finally(() => {
                inp.value = '';
              });
            };
        };
        wireUpload('#tp-kyc-file-input', 'kyc', '#tp-tab-kyc');
        wireUpload('#tp-academic-file-input', 'academic', '#tp-tab-academic');

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

        if (editMode) {
          applyTeacherEditMode(root as HTMLElement, t);
        }

        const printBtn = root.querySelector('#tp-btn-print') as HTMLElement | null;
        if (printBtn) printBtn.onclick = () => {
          const pdf = pdfDataRef.current;
          if (pdf) void downloadTeacherProfilePdf(pdf);
        };
        const editBtn = root.querySelector('#tp-btn-edit') as HTMLButtonElement | null;
        const cancelEditBtn = root.querySelector('#tp-btn-cancel-edit') as HTMLButtonElement | null;

        const updateButtons = (editing: boolean) => {
          if (editBtn) {
            editBtn.disabled = false;
            editBtn.innerHTML = editing ? `${SAVE_SVG} Save` : `${PENCIL_SVG} Edit`;
          }
          if (cancelEditBtn) {
            cancelEditBtn.disabled = false;
            cancelEditBtn.style.display = editing ? 'inline-flex' : 'none';
            cancelEditBtn.innerHTML = `${CANCEL_SVG} Cancel`;
          }
        };

        if (editBtn) {
          updateButtons(isEditingRef.current);
          editBtn.onclick = (e) => {
            e.preventDefault();
            if (isEditingRef.current) {
              void saveTeacherRef.current();
            } else {
              isEditingRef.current = true;
              setEditMode(true);
              updateButtons(true);
              applyTeacherEditMode(root as HTMLElement, t);
            }
          };
        }

        if (cancelEditBtn) {
          cancelEditBtn.onclick = (e) => {
            e.preventDefault();
            isEditingRef.current = false;
            setEditMode(false);
            updateButtons(false);
            setReloadToken((t) => t + 1);
          };
        }
        const createLoginBtn = root.querySelector('#tp-btn-create-login') as HTMLElement | null;
        if (createLoginBtn) createLoginBtn.onclick = () => navigate(`/dashboard/admin/teachers/${teacherId}/create-login`);
        const resetBtn = root.querySelector('#tp-btn-reset-pw') as HTMLElement | null;
        if (resetBtn) {
          const resetEmail = portalUser?.email || pdfDataRef.current?.email || null;
          if (resetEmail) {
            resetBtn.onclick = async () => {
              if (!window.confirm(`Send a password reset email to ${resetEmail}?`)) return;
              const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: 'https://www.pwezacore.com/dashboard/teacher',
              });
              if (error) toast.error('Failed: ' + error.message);
              else toast.success(`Password reset email sent to ${resetEmail}`);
            };
          } else {
            resetBtn.style.display = 'none';
          }
        }

        // Store topbar node so the React portal can render the Change Email button into it
        const topbarRight = root.querySelector('.tp-topbar-right') as HTMLElement | null;
        if (topbarRight) setTopbarPortalNode(topbarRight);
        const delBtn = root.querySelector('#tp-btn-delete') as HTMLElement | null;
        if (delBtn) {
          delBtn.innerHTML = `${TRASH_SVG} Delete`;
          delBtn.onclick = async () => {
            if (!window.confirm(`Delete ${fullName}? This cannot be undone.`)) return;
            const { error } = await supabase
              .from('teachers')
              .delete()
              .eq('teacher_id', teacherId);
            if (error) {
              toast.error(`Failed to delete teacher: ${error.message}`);
              return;
            }
            toast.success(isTertiaryRef.current ? 'Tutor deleted successfully' : 'Teacher deleted successfully');
            navigate('/dashboard/admin/teachers');
          };
        }
        const assignClassBtn = root.querySelector('#tp-btn-assign-class') as HTMLElement | null;
        if (assignClassBtn)
          assignClassBtn.onclick = () => {
            switchTab('classes');
            requestAnimationFrame(() => {
              root.querySelector('#tp-card-class-teacher')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          };
        const viewSched = root.querySelector('#tp-btn-view-schedule') as HTMLElement | null;
        if (viewSched) viewSched.onclick = () => navigate('/dashboard/teacher/timetable');
        const editTt = root.querySelector('#tp-btn-edit-timetable') as HTMLElement | null;
        if (editTt) editTt.onclick = () => navigate('/dashboard/admin/settings');
        const managePortal = root.querySelector('#tp-btn-manage-portal') as HTMLElement | null;
        if (managePortal) managePortal.onclick = () => navigate(`/dashboard/admin/teachers/${teacherId}/create-login`);
        const changePhoto = root.querySelector('#tp-btn-change-photo') as HTMLElement | null;
        const photoFileInp = root.querySelector('#tp-photo-file') as HTMLInputElement | null;
        if (changePhoto) {
          changePhoto.style.opacity = editMode ? '1' : '0.85';
          changePhoto.onclick = () => {
            if (editMode) photoFileInp?.click();
            else toast.info('Click Edit, then use the camera icon to change the photo.');
          };
        }

        root.querySelectorAll('[data-nav]').forEach((el) => {
          (el as HTMLElement).onclick = () => {
            const href = (el as HTMLElement).dataset.nav;
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

  const handleChangeEmail = useCallback(async () => {
    if (!linkedUserId || !changeEmailInput.trim()) return;
    setChangeEmailLoading(true);
    setChangeEmailError(null);
    setChangeEmailSuccess(false);
    setChangeEmailWarning(null);
    try {
      const resp = await fetch(registerApiUrl('/api/admin/change-teacher-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId: linkedUserId,
          teacherId,
          newEmail: changeEmailInput.trim(),
          schoolId: authSchoolId,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json.success) {
        setChangeEmailError(json.error || 'Failed to change email');
      } else {
        setChangeEmailSuccess(true);
        setChangeEmailWarning(json.warning ?? null);
        setPortalEmail(changeEmailInput.trim().toLowerCase());
        setChangeEmailInput('');
      }
    } catch {
      setChangeEmailError('Network error. Please try again.');
    } finally {
      setChangeEmailLoading(false);
    }
  }, [linkedUserId, teacherId, authSchoolId, changeEmailInput]);

  const changeEmailModal = (
    <NativeModal
      isOpen={changeEmailOpen}
      onClose={() => setChangeEmailOpen(false)}
      title="Change Login Email"
      subtitle={portalEmail ? `Current email: ${portalEmail}` : undefined}
      icon={Mail}
      size="md"
    >
      <div className="flex flex-col gap-3 text-white">
        {!changeEmailSuccess ? (
          <>
            {!linkedUserId && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200">
                No portal login account found for this teacher. Use <strong>Create Login</strong> to set one up first.
              </div>
            )}
            <p className="text-xs text-white/70">
              Enter the teacher's new email address. Their account will be moved immediately and a password-reset email will be sent to the new address so they can log in.
            </p>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">New email address</label>
              <input
                type="email"
                value={changeEmailInput}
                onChange={(e) => setChangeEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleChangeEmail(); }}
                placeholder="teacher@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
                autoFocus={changeEmailOpen}
              />
            </div>
            {changeEmailError && (
              <p className="text-xs text-rose-400">{changeEmailError}</p>
            )}
            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-white/15">
              <button
                type="button"
                onClick={() => setChangeEmailOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleChangeEmail()}
                disabled={changeEmailLoading || !changeEmailInput.trim() || !linkedUserId}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {changeEmailLoading ? 'Sending...' : 'Change & Send Email'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Done!</p>
                <p className="text-[11px] text-white/70">Email updated and access email sent</p>
              </div>
            </div>
            <p className="text-xs text-white/80">
              The teacher will receive an email at <strong className="text-white">{portalEmail}</strong> with a link to set their password and log in. Their account and all data remain intact.
            </p>
            {changeEmailWarning && (
              <p className="text-xs text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3">
                {changeEmailWarning}
              </p>
            )}
            <div className="flex justify-end pt-3 border-t border-white/15">
              <button
                type="button"
                onClick={() => setChangeEmailOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </NativeModal>
  );

  return (
    <>
      <ProfileContainer htmlContent={htmlContent} containerRef={containerRef} />
      <UserRolesSection userId={linkedUserId} schoolId={authSchoolId} />
      {topbarPortalNode && createPortal(
        <button
          type="button"
          id="tp-btn-change-email"
          onClick={() => {
            setChangeEmailError(null);
            setChangeEmailSuccess(false);
            setChangeEmailWarning(null);
            setChangeEmailInput('');
            setChangeEmailOpen(true);
          }}
          style={{
            background: '#0ea5e9',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            marginLeft: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Mail className="w-3.5 h-3.5 inline-block" /> Change Email
        </button>,
        topbarPortalNode
      )}
      {topbarPortalNode && createPortal(
        <button
          type="button"
          id="tp-btn-change-phone"
          onClick={() => setChangePhoneOpen(true)}
          style={{
            background: '#0ea5e9',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            marginLeft: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Phone className="w-3.5 h-3.5 inline-block" /> Change Phone
        </button>,
        topbarPortalNode
      )}
      {changeEmailModal}
      <ChangeTeacherPhoneModal
        open={changePhoneOpen}
        onClose={() => setChangePhoneOpen(false)}
        teacherId={teacherId}
        currentPhone={portalPhone}
        onChanged={(newPhone) => {
          setPortalPhone(newPhone);
          void runFullProfileLoadRef.current?.();
        }}
      />
    </>
  );
}
