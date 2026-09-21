import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { useAuthStore } from '@/store/authStore';
import { usePwezaStore } from '@/store/pwezaStore';
import { confirmProfileSave, escapeAttr } from '@/lib/profileInlineEdit';

import profileTemplateRaw from '@/assets/pwezacore-parent-profile.html?raw';
import { downloadParentProfilePdf, type ParentProfilePdfData } from '@/lib/adminPdfDownload';
import UserRolesSection from '@/components/admin/UserRolesSection';

const PROFILE_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

let cachedParentProfileHtml: string | null = null;

const CHILD_GRADIENTS = [
  'linear-gradient(135deg,#ffb547,#ff4f6a)',
  'linear-gradient(135deg,#3d7eff,#9d7eff)',
  'linear-gradient(135deg,#27e09f,#3d7eff)',
  'linear-gradient(135deg,#9d7eff,#ff4f6a)',
];
const cGrad = (i: number) => CHILD_GRADIENTS[i % CHILD_GRADIENTS.length];

// Professional SVG Icons (Replacing all emojis)
const PENCIL_SVG = `<svg class="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`;
const SAVE_SVG = `<svg class="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>`;
const CANCEL_SVG = `<svg class="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
const USER_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`;
const USERS_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`;
const ID_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" stroke-width="2"/><circle cx="9" cy="10" r="2" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M15 8h2M15 12h2M7 16h10"/></svg>`;
const GLOBE_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-width="2" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`;
const CHECK_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
const X_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
const CLOCK_SVG = `<svg class="w-3.5 h-3.5 mr-1 inline-block text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 6v6l4 2"/></svg>`;
const EMPTY_USERS_SVG = `<svg class="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`;
const EMPTY_PAY_SVG = `<svg class="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" stroke-width="1.5"/><path stroke-width="1.5" d="M2 10h20M6 15h4"/></svg>`;
const PAY_ROW_SVG = `<svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" stroke-width="1.75"/><path stroke-width="1.75" d="M2 10h20M6 15h4"/></svg>`;
const EMPTY_MSG_SVG = `<svg class="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`;
const EMPTY_CLOCK_SVG = `<svg class="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="1.5"/><path stroke-linecap="round" stroke-width="1.5" d="M12 7v5l3 2"/></svg>`;
const EMPTY_DOC_SVG = `<svg class="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>`;

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

function displayStudentName(s: Record<string, unknown>): string {
  const fn = String(s.first_name ?? '').trim();
  const mn = String(s.middle_name ?? '').trim();
  const ln = String(s.last_name ?? '').trim();
  const parts = [fn, mn, ln].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(s.name ?? '').trim() || '—';
}

function splitName(full: string): { first: string; last: string } {
  const t = full.trim();
  if (!t) return { first: '—', last: '—' };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '—' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function fmtUGX(n: number): string {
  if (Number.isNaN(n)) return '—';
  return `UGX ${Number(n).toLocaleString()}`;
}

function pickStr(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

const PP_TABS = ['overview', 'children', 'payments', 'messages', 'activity', 'documents'] as const;

interface ParentSnapshot {
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  gender: string;
  relationship: string;
  occupation: string;
  address: string;
  nin: string;
  nationality: string;
  religion: string;
  dob: string;
  portalActive: boolean;
  portalEmail: string;
  parentUser: Record<string, unknown> | null;
  studentIds: string[];
}

function renderParentDisplayValues(root: HTMLElement, d: ParentSnapshot) {
  const set = (id: string, val: string) => {
    const n = root.querySelector(id);
    if (n) n.textContent = val;
  };

  set('#pp-breadcrumb-name', d.fullName);
  set('#pp-parent-name', d.fullName);

  const img = root.querySelector('#pp-photo-img') as HTMLImageElement | null;
  const ini = root.querySelector('#pp-photo-initials') as HTMLElement | null;
  if (img && ini) {
    img.style.display = 'none';
    ini.style.display = 'flex';
    ini.textContent = initials(d.fullName);
  }

  const relChip = root.querySelector('#pp-chip-relation') as HTMLElement | null;
  if (relChip) {
    relChip.innerHTML = `${USER_SVG} ${escapeHtml(d.relationship || 'Guardian')}`;
  }

  const portalChip = root.querySelector('#pp-chip-portal') as HTMLElement | null;
  if (portalChip) {
    if (d.parentUser) {
      if (d.portalActive) {
        portalChip.innerHTML = `${GLOBE_SVG} Portal Active`;
        portalChip.className = 'pp-chip green';
      } else {
        portalChip.innerHTML = `${X_SVG} No Portal`;
        portalChip.className = 'pp-chip rose';
      }
    } else {
      portalChip.innerHTML = `${CLOCK_SVG} No login (link only)`;
      portalChip.className = 'pp-chip amber';
    }
  }

  const ninEl = root.querySelector('#pp-chip-nin') as HTMLElement | null;
  if (ninEl) {
    ninEl.innerHTML = `${ID_SVG} ${escapeHtml(d.nin || 'Not recorded')}`;
  }

  const kidChip = root.querySelector('#pp-chip-children-count') as HTMLElement | null;
  if (kidChip) {
    const nKids = d.studentIds.length;
    kidChip.innerHTML = `${USERS_SVG} ${nKids} Child${nKids !== 1 ? 'ren' : ''}`;
  }

  const phoneMeta = root.querySelector('#pp-meta-phone') as HTMLAnchorElement | null;
  if (phoneMeta) {
    if (d.phone) {
      phoneMeta.href = `tel:${d.phone.replace(/\s/g, '')}`;
      phoneMeta.textContent = d.phone;
    } else {
      phoneMeta.removeAttribute('href');
      phoneMeta.textContent = '—';
    }
  }
  const emailMeta = root.querySelector('#pp-meta-email') as HTMLAnchorElement | null;
  if (emailMeta) {
    if (d.email) {
      emailMeta.href = `mailto:${d.email}`;
      emailMeta.textContent = d.email;
    } else {
      emailMeta.removeAttribute('href');
      emailMeta.textContent = '—';
    }
  }
  set('#pp-meta-occupation', d.occupation || '—');
  set('#pp-meta-address', d.address || '—');

  set('#pp-first-name', d.firstName || '—');
  set('#pp-last-name', d.lastName || '—');
  set('#pp-gender', d.gender || '—');
  set('#pp-relationship', d.relationship || 'Guardian');
  set('#pp-nin', d.nin || '—');
  set('#pp-nationality', d.nationality || '—');
  set('#pp-religion', d.religion || '—');
  set('#pp-dob', d.dob ? fmtDate(d.dob) : '—');

  const phoneField = root.querySelector('#pp-phone') as HTMLAnchorElement | null;
  if (phoneField) {
    if (d.phone) {
      phoneField.href = `tel:${d.phone.replace(/\s/g, '')}`;
      phoneField.textContent = d.phone;
    } else {
      phoneField.removeAttribute('href');
      phoneField.textContent = '—';
    }
  }
  const waField = root.querySelector('#pp-whatsapp') as HTMLElement | null;
  if (waField) {
    if (d.phone) {
      const wa = d.phone.replace(/\D/g, '');
      waField.innerHTML = `<a href="https://wa.me/${wa}" target="_blank" rel="noreferrer">${escapeHtml(d.phone)}</a>`;
    } else {
      waField.textContent = '—';
    }
  }

  const emailField = root.querySelector('#pp-email') as HTMLAnchorElement | null;
  if (emailField) {
    if (d.email) {
      emailField.href = `mailto:${d.email}`;
      emailField.textContent = d.email;
    } else {
      emailField.removeAttribute('href');
      emailField.textContent = '—';
    }
  }

  set('#pp-occupation', d.occupation || '—');
  set('#pp-address', d.address || '—');
}

function applyParentEditMode(root: HTMLElement, d: ParentSnapshot) {
  const nameEl = root.querySelector('#pp-parent-name');
  if (nameEl) {
    nameEl.innerHTML = `<input type="text" class="pw-inline-input" data-pp-field="name" value="${escapeAttr(d.fullName)}" style="font:inherit;width:100%;max-width:420px"/>`;
  }
  const phoneMeta = root.querySelector('#pp-meta-phone');
  if (phoneMeta) {
    phoneMeta.innerHTML = `<input type="tel" class="pw-inline-input" data-pp-field="phone" value="${escapeAttr(d.phone)}" style="width:100%;max-width:280px"/>`;
  }
  const emailMeta = root.querySelector('#pp-meta-email');
  if (emailMeta) {
    emailMeta.innerHTML = `<input type="email" class="pw-inline-input" data-pp-field="email" value="${escapeAttr(d.email)}" style="width:100%;max-width:320px"/>`;
  }
  const occMeta = root.querySelector('#pp-meta-occupation');
  if (occMeta) {
    occMeta.innerHTML = `<input type="text" class="pw-inline-input" data-pp-field="occupation" value="${escapeAttr(d.occupation)}" style="width:100%"/>`;
  }
  const addrMeta = root.querySelector('#pp-meta-address');
  if (addrMeta) {
    addrMeta.innerHTML = `<input type="text" class="pw-inline-input" data-pp-field="address" value="${escapeAttr(d.address)}" style="width:100%"/>`;
  }
  setPPFieldInput(root, '#pp-first-name', 'first_name', d.firstName);
  setPPFieldInput(root, '#pp-last-name', 'last_name', d.lastName);

  // Gender select
  const gEl = root.querySelector('#pp-gender');
  if (gEl) {
    gEl.innerHTML = `
      <select class="pw-inline-input" data-pp-field="gender" style="width:100%">
        <option value="">— Select Gender —</option>
        <option value="Male" ${d.gender.toLowerCase() === 'male' ? 'selected' : ''}>Male</option>
        <option value="Female" ${d.gender.toLowerCase() === 'female' ? 'selected' : ''}>Female</option>
        <option value="Other" ${d.gender.toLowerCase() === 'other' ? 'selected' : ''}>Other</option>
      </select>
    `;
  }

  // Relationship select
  const relEl = root.querySelector('#pp-relationship');
  if (relEl) {
    const rLower = (d.relationship || '').toLowerCase();
    relEl.innerHTML = `
      <select class="pw-inline-input" data-pp-field="relationship" style="width:100%">
        <option value="Father" ${rLower === 'father' ? 'selected' : ''}>Father</option>
        <option value="Mother" ${rLower === 'mother' ? 'selected' : ''}>Mother</option>
        <option value="Guardian" ${rLower === 'guardian' || !rLower ? 'selected' : ''}>Guardian</option>
        <option value="Uncle" ${rLower === 'uncle' ? 'selected' : ''}>Uncle</option>
        <option value="Aunt" ${rLower === 'aunt' ? 'selected' : ''}>Aunt</option>
        <option value="Brother" ${rLower === 'brother' ? 'selected' : ''}>Brother</option>
        <option value="Sister" ${rLower === 'sister' ? 'selected' : ''}>Sister</option>
        <option value="Parent" ${rLower === 'parent' ? 'selected' : ''}>Parent</option>
        <option value="Other" ${rLower === 'other' ? 'selected' : ''}>Other</option>
      </select>
    `;
  }

  setPPFieldInput(root, '#pp-nin', 'nin', d.nin);
  setPPFieldInput(root, '#pp-nationality', 'nationality', d.nationality);
  setPPFieldInput(root, '#pp-religion', 'religion', d.religion);

  const dobEl = root.querySelector('#pp-dob');
  if (dobEl) {
    const val = d.dob ? d.dob.slice(0, 10) : '';
    dobEl.innerHTML = `<input type="date" class="pw-inline-input" data-pp-field="date_of_birth" value="${escapeAttr(val)}" style="width:100%"/>`;
  }

  const phoneF = root.querySelector('#pp-phone')?.parentElement;
  if (phoneF) {
    phoneF.innerHTML = `<input type="tel" class="pw-inline-input" data-pp-field="phone_ov" value="${escapeAttr(d.phone)}" style="width:100%"/>`;
  }
  const emailF = root.querySelector('#pp-email')?.parentElement;
  if (emailF) {
    emailF.innerHTML = `<input type="email" class="pw-inline-input" data-pp-field="email_ov" value="${escapeAttr(d.email)}" style="width:100%"/>`;
  }
  setPPFieldInput(root, '#pp-occupation', 'occupation', d.occupation);
  setPPFieldInput(root, '#pp-address', 'address', d.address);
}

function setPPFieldInput(root: HTMLElement, sel: string, field: string, value: string) {
  const el = root.querySelector(sel);
  if (!el) return;
  el.innerHTML = `<input type="text" class="pw-inline-input" data-pp-field="${field}" value="${escapeAttr(value)}" style="width:100%"/>`;
}

export default function DesignParentProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUserId = useAuthStore((s) => s.user?.id);
  const authSchoolId = useAuthStore((s) => s.schoolId);
  const { parent_id: parentIdParam } = useParams<{ parent_id: string }>();
  const parentId = parentIdParam || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const isEditingRef = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);
  const saveParentRef = useRef<() => Promise<void>>(async () => {});
  const parentCtxRef = useRef<{ schoolId: string; hasUser: boolean; studentIds: string[] } | null>(null);
  const parentSnapshotRef = useRef<ParentSnapshot | null>(null);
  const pdfDataRef = useRef<ParentProfilePdfData | null>(null);

  const saveParent = useCallback(async () => {
    if (!confirmProfileSave()) return;
    const ctx = parentCtxRef.current;
    if (!ctx) return;
    const root = containerRef.current?.querySelector('.pw-parent-profile') as HTMLElement | null;
    if (!root) return;
    const get = (field: string) =>
      (root.querySelector(`[data-pp-field="${field}"]`) as HTMLInputElement | HTMLSelectElement | null)?.value?.trim() ?? '';

    const name = get('name') || `${get('first_name')} ${get('last_name')}`.trim();
    const phone = get('phone') || get('phone_ov');
    const email = get('email') || get('email_ov');
    const gender = get('gender');
    const relationship = get('relationship');
    const occupation = get('occupation');
    const address = get('address');
    const nin = get('nin');
    const nationality = get('nationality');
    const religion = get('religion');
    const dob = get('date_of_birth');

    if (!name) {
      window.alert('Please enter a name.');
      return;
    }

    const { error: pErr } = await supabase
      .from('parents')
      .update({
        name,
        gender: gender || null,
        relationship: relationship || null,
        phone: phone || null,
        email: email || null,
        occupation: occupation || null,
        address: address || null,
        nin: nin || null,
        nationality: nationality || null,
        religion: religion || null,
        date_of_birth: dob || null,
      })
      .eq('school_id', ctx.schoolId)
      .eq('parent_id', parentId);

    if (pErr) {
      window.alert(pErr.message);
      return;
    }

    // Sync guardian info to linked student records
    if (ctx.studentIds.length > 0) {
      const { error: sErr } = await supabase
        .from('students')
        .update({
          guardian_name: name,
          guardian_relationship: relationship || null,
          guardian_phone: phone || null,
          guardian_email: email || null,
          guardian_occupation: occupation || null,
          guardian_address: address || null,
        })
        .eq('school_id', ctx.schoolId)
        .in('student_id', ctx.studentIds);
      if (sErr && import.meta.env.DEV) console.warn('[DesignParentProfile] student guardian sync:', sErr.message);
    }

    // Update login account in users if present
    if (ctx.hasUser) {
      const { error: uErr } = await supabase
        .from('users')
        .update({
          name,
          phone: phone || null,
          email: email || null,
        })
        .eq('user_id', parentId)
        .eq('school_id', ctx.schoolId);
      if (uErr && import.meta.env.DEV) console.warn('[DesignParentProfile] users update:', uErr.message);
    }

    // Update in-memory snapshot
    const { first, last } = splitName(name);
    if (parentSnapshotRef.current) {
      parentSnapshotRef.current = {
        ...parentSnapshotRef.current,
        fullName: name,
        firstName: first,
        lastName: last,
        phone,
        email,
        gender,
        relationship,
        occupation,
        address,
        nin,
        nationality,
        religion,
        dob,
      };
    }

    // Update pdf data
    if (pdfDataRef.current) {
      pdfDataRef.current = {
        ...pdfDataRef.current,
        name,
        email: email || null,
        phone: phone || null,
        relationship: relationship || null,
        address: address || null,
        occupation: occupation || null,
      };
    }

    if (authUserId) {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.parentsDesign(authUserId) });
    }

    // Exit edit mode instantaneously
    isEditingRef.current = false;
    setEditMode(false);
    if (parentSnapshotRef.current) {
      renderParentDisplayValues(root, parentSnapshotRef.current);
    }

    // Update action buttons
    const ppEdit = root.querySelector('#pp-btn-edit') as HTMLElement | null;
    if (ppEdit) ppEdit.innerHTML = `${PENCIL_SVG} Edit Profile`;
    const ppCancel = root.querySelector('#pp-btn-cancel-edit') as HTMLElement | null;
    if (ppCancel) ppCancel.style.display = 'none';
  }, [parentId, authUserId, queryClient]);

  saveParentRef.current = saveParent;

  useEffect(() => {
    const id = 'pweza-parent-profile-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = PROFILE_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (cachedParentProfileHtml) {
      setHtmlContent(cachedParentProfileHtml);
      return;
    }
    cachedParentProfileHtml = parseInjectedHtml(profileTemplateRaw);
    setHtmlContent(cachedParentProfileHtml);
  }, []);

  // Main data load — runs on mount or after full reload, decoupled from editMode
  useEffect(() => {
    if (!htmlContent || !parentId) return;

    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const schoolId = usePwezaStore.getState().schoolId as string | undefined;
      if (!schoolId) return;

      const [{ data: linkRows }, { data: parentUser }] = await Promise.all([
        supabase.from('parents').select('*').eq('school_id', schoolId).eq('parent_id', parentId),
        supabase.from('users').select('*').eq('user_id', parentId).eq('school_id', schoolId).maybeSingle(),
      ]);

      if (cancelled) return;

      const studentIds = [...new Set((linkRows || []).map((r) => (r as { student_id?: string }).student_id).filter(Boolean))] as string[];

      parentCtxRef.current = schoolId ? { schoolId, hasUser: !!parentUser, studentIds } : null;

      if ((!linkRows || linkRows.length === 0) && !parentUser) {
        requestAnimationFrame(() => {
          const el = containerRef.current;
          if (!el) return;
          const n = el.querySelector('#pp-breadcrumb-name');
          if (n) n.textContent = 'Parent not found';
        });
        return;
      }

      const primary =
        (linkRows || []).find((r: { is_primary_contact?: boolean }) => r.is_primary_contact === true) ||
        (linkRows || [])[0];
      const pr = primary as Record<string, unknown> | undefined;
      const pu = parentUser as Record<string, unknown> | null;

      const fullName = (pickStr(pr?.name) ?? pickStr(pu?.name) ?? pickStr(pu?.email)) || 'Guardian';
      const { first: firstName, last: lastName } = splitName(fullName);

      const studentMap: Record<string, Record<string, unknown>> = {};
      const photoByStudent: Record<string, string> = {};
      let totalBilled = 0;
      let totalPaid = 0;
      let totalBalance = 0;
      const paymentRows: { amount_paid: number; payment_method: string | null; payment_date: string | null }[] = [];

      if (studentIds.length) {
        const [{ data: studs }, { data: photos }, { data: bals }, { data: pays }] = await Promise.all([
          supabase
            .from('students')
            .select('student_id, name, first_name, middle_name, last_name, current_class, admission_number, status')
            .eq('school_id', schoolId)
            .in('student_id', studentIds),
          supabase
            .from('student_photos')
            .select('student_id, photo_url')
            .eq('school_id', schoolId)
            .in('student_id', studentIds)
            .eq('is_primary', true),
          supabase.from('student_balances').select('total_fees, total_paid, balance').eq('school_id', schoolId).in('student_id', studentIds),
          supabase
            .from('student_payments')
            .select('amount_paid, payment_method, payment_date')
            .eq('school_id', schoolId)
            .in('student_id', studentIds)
            .order('payment_date', { ascending: false })
            .limit(40),
        ]);
        for (const st of studs || []) {
          studentMap[String((st as { student_id: string }).student_id)] = st as Record<string, unknown>;
        }
        for (const ph of photos || []) {
          const sid = (ph as { student_id?: string }).student_id;
          const url = (ph as { photo_url?: string }).photo_url;
          if (sid && url && String(url).trim()) photoByStudent[sid] = String(url).trim();
        }
        for (const b of bals || []) {
          totalBilled += Number((b as { total_fees?: number }).total_fees ?? 0);
          totalPaid += Number((b as { total_paid?: number }).total_paid ?? 0);
          totalBalance += Number((b as { balance?: number }).balance ?? 0);
        }
        for (const p of pays || []) {
          paymentRows.push({
            amount_paid: Number((p as { amount_paid?: number }).amount_paid ?? 0),
            payment_method: (p as { payment_method?: string }).payment_method ?? null,
            payment_date: (p as { payment_date?: string }).payment_date ?? null,
          });
        }
      }

      const phone = pickStr(pr?.phone) ?? pickStr(pu?.phone) ?? '';
      const email = pickStr(pr?.email) ?? pickStr(pu?.email) ?? '';
      const gender = pickStr(pr?.gender) ?? '';
      const relationship = pickStr(pr?.relationship) ?? 'Guardian';
      const occupation = pickStr(pr?.occupation) ?? '';
      const address = pickStr(pr?.address) ?? '';
      const nin = pickStr(pr?.nin) ?? pickStr(pr?.national_id) ?? '';
      const nationality = pickStr(pr?.nationality) ?? '';
      const religion = pickStr(pr?.religion) ?? '';
      const dob = pickStr(pr?.date_of_birth) ?? '';

      const portalActive = parentUser ? (pu as { is_active?: boolean } | null)?.is_active !== false : false;
      const portalEmail = pickStr(pu?.email) ?? '';

      const snapshot: ParentSnapshot = {
        fullName,
        firstName,
        lastName,
        phone,
        email,
        gender,
        relationship,
        occupation,
        address,
        nin,
        nationality,
        religion,
        dob,
        portalActive,
        portalEmail,
        parentUser,
        studentIds,
      };
      parentSnapshotRef.current = snapshot;

      pdfDataRef.current = {
        name: fullName,
        email: email || null,
        phone: phone || null,
        relationship: relationship || null,
        address: address || null,
        occupation: occupation || null,
        created_at: pickStr(pr?.created_at) ?? null,
        children: studentIds.map((sid) => {
          const st = studentMap[sid] as Record<string, unknown> | undefined;
          if (!st) return null;
          const stName = [st.first_name, st.middle_name, st.last_name]
            .filter((x) => x != null && String(x).trim())
            .map((x) => String(x).trim())
            .join(' ') || String(st.name ?? '').trim() || '—';
          return {
            student_id: sid,
            name: stName,
            current_class: pickStr(st.current_class) ?? null,
            admission_number: pickStr(st.admission_number) ?? null,
            photoUrl: photoByStudent[sid] ?? null,
          };
        }).filter(Boolean) as ParentProfilePdfData['children'],
      };

      if (cancelled) return;

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const root = (el.querySelector('.pw-parent-profile') || el) as HTMLElement;

        const set = (id: string, val: string) => {
          const n = root.querySelector(id);
          if (n) n.textContent = val;
        };
        const setHTML = (id: string, html: string) => {
          const n = root.querySelector(id);
          if (n) (n as HTMLElement).innerHTML = html;
        };

        // Render display values
        renderParentDisplayValues(root, snapshot);

        set('#pp-meta-joined', fmtShort((pr?.created_at as string) ?? (pu?.created_at as string)));
        set('#pp-employer', '—');
        set('#pp-district', '—');
        set('#pp-emergency', '—');

        const psEl = root.querySelector('#pp-portal-status') as HTMLElement | null;
        if (psEl) {
          if (!parentUser) {
            psEl.textContent = '— (no login)';
            psEl.className = 'pp-field-value muted';
          } else if (portalActive) {
            psEl.innerHTML = `${CHECK_SVG} Active`;
            psEl.className = 'pp-field-value green';
          } else {
            psEl.innerHTML = `${X_SVG} Inactive`;
            psEl.className = 'pp-field-value rose';
          }
        }
        set('#pp-portal-email', portalEmail || email || '—');
        set('#pp-portal-last-login', '—');
        setHTML('#pp-portal-permissions', `<span class="pp-tag">Parent portal</span>`);
        set('#pp-portal-registered', pu?.created_at ? fmtDate(pu.created_at as string) : '—');
        set('#pp-portal-2fa', '—');

        const childrenHtml =
          studentIds.length === 0
            ? `<div class="pp-empty"><div class="pp-empty-icon">${EMPTY_USERS_SVG}</div><div class="pp-empty-title">No children linked</div><div class="pp-empty-sub">Link a student to this parent to see them here.</div></div>`
            : studentIds
                .map((sid) => studentMap[sid])
                .filter(Boolean)
                .map((st, i) => {
                  const sid = String(st.student_id);
                  const nm = displayStudentName(st);
                  const cls = String(st.current_class ?? '—');
                  const adm = String(st.admission_number ?? '—');
                  const pho = photoByStudent[sid];
                  const ini = initials(nm);
                  return `
                <div class="pp-child-card" data-nav="/dashboard/admin/students/${escapeHtml(sid)}">
                  <div class="pp-child-av" style="background:${cGrad(i)}">
                    ${pho ? `<img src="${pho.replace(/"/g, '&quot;')}" alt="${escapeHtml(nm)}">` : escapeHtml(ini)}
                  </div>
                  <div style="flex:1">
                    <div class="pp-child-name">${escapeHtml(nm)}</div>
                    <div class="pp-child-sub">${escapeHtml(cls)} · ${escapeHtml(adm)}</div>
                  </div>
                  <div class="pp-child-actions">
                    <button type="button" class="pp-child-btn pp-child-btn-teal" data-nav="/dashboard/admin/students/${escapeHtml(sid)}">View Profile →</button>
                  </div>
                </div>`;
                })
                .join('');
        setHTML('#pp-children-body', childrenHtml);

        set('#pp-pay-total-billed', fmtUGX(totalBilled));
        set('#pp-pay-total-paid', fmtUGX(totalPaid));
        const balEl = root.querySelector('#pp-pay-balance') as HTMLElement | null;
        if (balEl) {
          balEl.textContent = fmtUGX(totalBalance);
          balEl.className = `pp-field-value ${totalBalance <= 0 ? 'green' : 'amber'}`;
        }

        const payHtml =
          paymentRows.length === 0
            ? `<div class="pp-empty"><div class="pp-empty-icon">${EMPTY_PAY_SVG}</div><div class="pp-empty-title">No payments recorded</div><div class="pp-empty-sub">Payments for linked students will appear here.</div></div>`
            : paymentRows
                .map(
                  (p) => `
              <div class="pp-pay-row">
                <div class="pp-pay-ic" style="background:var(--green-s)">${PAY_ROW_SVG}</div>
                <div style="flex:1">
                  <div class="pp-pay-name">${escapeHtml(p.payment_method || 'Payment')}</div>
                  <div class="pp-pay-sub">${fmtDate(p.payment_date)}</div>
                </div>
                <div class="pp-pay-amount green">+ ${fmtUGX(p.amount_paid)}</div>
              </div>`
                )
                .join('');
        setHTML('#pp-payments-body', payHtml);

        setHTML(
          '#pp-messages-body',
          `<div class="pp-empty"><div class="pp-empty-icon">${EMPTY_MSG_SVG}</div><div class="pp-empty-title">No messages yet</div><div class="pp-empty-sub">School messaging can be connected here later.</div></div>`
        );
        setHTML(
          '#pp-activity-body',
          `<div class="pp-empty"><div class="pp-empty-icon">${EMPTY_CLOCK_SVG}</div><div class="pp-empty-title">No activity recorded</div></div>`
        );
        setHTML(
          '#pp-documents-body',
          `<div class="pp-empty"><div class="pp-empty-icon">${EMPTY_DOC_SVG}</div><div class="pp-empty-title">No documents uploaded</div><div class="pp-empty-sub">Upload ID copies and consent forms when document storage is enabled.</div></div>`
        );

        root.querySelectorAll('[data-nav]').forEach((node) => {
          (node as HTMLElement).onclick = (e) => {
            e.preventDefault();
            const href = (node as HTMLElement).getAttribute('data-nav');
            if (href) navigate(href);
          };
        });

        const callBtn = root.querySelector('#pp-btn-call') as HTMLButtonElement | null;
        if (callBtn) {
          callBtn.onclick = () => {
            if (phone) window.location.href = `tel:${phone.replace(/\s/g, '')}`;
          };
        }

        root.querySelector('#pp-btn-print')?.addEventListener('click', () => {
          const pdf = pdfDataRef.current;
          if (pdf) void downloadParentProfilePdf(pdf);
        });
        root.querySelector('#pp-btn-message')?.addEventListener('click', () => navigate('/dashboard/admin/notifications'));
        const portalHero = root.querySelector('#pp-btn-portal') as HTMLElement | null;
        if (portalHero) {
          portalHero.onclick = () => navigate(`/dashboard/admin/parents/${parentId}/create-login`);
        }
        const managePortal = root.querySelector('#pp-btn-manage-portal') as HTMLElement | null;
        if (managePortal) {
          managePortal.onclick = () => navigate(`/dashboard/admin/parents/${parentId}/create-login`);
        }
        root.querySelector('#pp-btn-link-child')?.addEventListener('click', () => navigate('/dashboard/admin/students?add=1'));
        root.querySelector('#pp-btn-record-payment')?.addEventListener('click', () => navigate('/dashboard/admin/outstanding'));
        root.querySelector('#pp-btn-upload')?.addEventListener('click', () => {
          window.alert('Document uploads can be enabled in a future update.');
        });

        // Instantaneous Edit Toggle without network reload
        const ppEdit = root.querySelector('#pp-btn-edit') as HTMLElement | null;
        const ppCancel = root.querySelector('#pp-btn-cancel-edit') as HTMLElement | null;

        const updateButtons = (editing: boolean) => {
          if (ppEdit) ppEdit.innerHTML = editing ? `${SAVE_SVG} Save` : `${PENCIL_SVG} Edit Profile`;
          if (ppCancel) {
            ppCancel.style.display = editing ? 'inline-flex' : 'none';
            ppCancel.innerHTML = `${CANCEL_SVG} Cancel`;
          }
        };

        if (ppEdit) {
          updateButtons(isEditingRef.current);
          ppEdit.onclick = (e) => {
            e.preventDefault();
            if (isEditingRef.current) {
              void saveParentRef.current();
            } else {
              isEditingRef.current = true;
              setEditMode(true);
              updateButtons(true);
              if (parentSnapshotRef.current) {
                applyParentEditMode(root, parentSnapshotRef.current);
              }
            }
          };
        }

        if (ppCancel) {
          ppCancel.onclick = (e) => {
            e.preventDefault();
            isEditingRef.current = false;
            setEditMode(false);
            updateButtons(false);
            if (parentSnapshotRef.current) {
              renderParentDisplayValues(root, parentSnapshotRef.current);
            }
          };
        }

        root.querySelector('#pp-btn-delete')?.addEventListener('click', () => {
          if (!window.confirm(`Remove all links for ${fullName}? This does not delete their login account.`)) return;
          void supabase
            .from('parents')
            .delete()
            .eq('school_id', schoolId)
            .eq('parent_id', parentId)
            .then(() => navigate('/dashboard/admin/parents'));
        });

        const switchTab = (name: string) => {
          PP_TABS.forEach((t) => {
            const panel = root.querySelector(`#pp-tab-${t}`) as HTMLElement | null;
            if (panel) panel.style.display = t === name ? '' : 'none';
          });
          root.querySelectorAll('.pp-tab').forEach((btn) => {
            btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === name);
          });
        };
        root.querySelectorAll('.pp-tab').forEach((btn) => {
          (btn as HTMLElement).onclick = () => switchTab((btn as HTMLElement).dataset.tab || 'overview');
        });
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [htmlContent, parentId, navigate, reloadToken]);

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
    <>
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{ width: '100%', minHeight: '100vh', display: 'block' }}
      />
      <UserRolesSection userId={parentId || null} schoolId={authSchoolId} />
    </>
  );
}
