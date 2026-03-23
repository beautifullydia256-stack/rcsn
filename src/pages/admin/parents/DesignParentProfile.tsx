import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { useAuthStore } from '@/store/authStore';
import { usePwezaStore } from '@/store/pwezaStore';
import { confirmProfileSave, escapeAttr } from '@/lib/profileInlineEdit';

import profileTemplateRaw from '@/assets/pwezacore-parent-profile.html?raw';

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

function applyParentEditMode(
  root: HTMLElement,
  fullName: string,
  phone: string,
  email: string,
  occupation: string,
  address: string,
  nin: string,
  firstName: string,
  lastName: string
) {
  const nameEl = root.querySelector('#pp-parent-name');
  if (nameEl) {
    nameEl.innerHTML = `<input type="text" class="pw-inline-input" data-pp-field="name" value="${escapeAttr(fullName)}" style="font:inherit;width:100%;max-width:420px"/>`;
  }
  const phoneMeta = root.querySelector('#pp-meta-phone');
  if (phoneMeta) {
    phoneMeta.innerHTML = `<input type="tel" class="pw-inline-input" data-pp-field="phone" value="${escapeAttr(phone)}" style="width:100%;max-width:280px"/>`;
  }
  const emailMeta = root.querySelector('#pp-meta-email');
  if (emailMeta) {
    emailMeta.innerHTML = `<input type="email" class="pw-inline-input" data-pp-field="email" value="${escapeAttr(email)}" style="width:100%;max-width:320px"/>`;
  }
  const occMeta = root.querySelector('#pp-meta-occupation');
  if (occMeta) {
    occMeta.innerHTML = `<input type="text" class="pw-inline-input" data-pp-field="occupation" value="${escapeAttr(occupation)}" style="width:100%"/>`;
  }
  const addrMeta = root.querySelector('#pp-meta-address');
  if (addrMeta) {
    addrMeta.innerHTML = `<input type="text" class="pw-inline-input" data-pp-field="address" value="${escapeAttr(address)}" style="width:100%"/>`;
  }
  setPPFieldInput(root, '#pp-first-name', 'first_name', firstName);
  setPPFieldInput(root, '#pp-last-name', 'last_name', lastName);
  setPPFieldInput(root, '#pp-nin', 'nin', nin);
  const phoneF = root.querySelector('#pp-phone')?.parentElement;
  if (phoneF) {
    phoneF.innerHTML = `<input type="tel" class="pw-inline-input" data-pp-field="phone_ov" value="${escapeAttr(phone)}" style="width:100%"/>`;
  }
  const emailF = root.querySelector('#pp-email')?.parentElement;
  if (emailF) {
    emailF.innerHTML = `<input type="email" class="pw-inline-input" data-pp-field="email_ov" value="${escapeAttr(email)}" style="width:100%"/>`;
  }
  setPPFieldInput(root, '#pp-occupation', 'occupation', occupation);
  setPPFieldInput(root, '#pp-address', 'address', address);
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
  const { parent_id: parentIdParam } = useParams<{ parent_id: string }>();
  const parentId = parentIdParam || '';
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const saveParentRef = useRef<() => Promise<void>>(async () => {});
  const parentCtxRef = useRef<{ schoolId: string; hasUser: boolean } | null>(null);

  const saveParent = useCallback(async () => {
    if (!confirmProfileSave()) return;
    const ctx = parentCtxRef.current;
    if (!ctx) return;
    const root = containerRef.current?.querySelector('.pw-parent-profile');
    if (!root) return;
    const get = (field: string) =>
      (root.querySelector(`[data-pp-field="${field}"]`) as HTMLInputElement | null)?.value?.trim() ?? '';
    const name = get('name') || `${get('first_name')} ${get('last_name')}`.trim();
    const phone = get('phone') || get('phone_ov');
    const email = get('email') || get('email_ov');
    const occupation = get('occupation');
    const address = get('address');
    const nin = get('nin');
    if (!name) {
      window.alert('Please enter a name.');
      return;
    }
    const { error: pErr } = await supabase
      .from('parents')
      .update({
        name,
        phone: phone || null,
        email: email || null,
        occupation: occupation || null,
        address: address || null,
        nin: nin || null,
      })
      .eq('school_id', ctx.schoolId)
      .eq('parent_id', parentId);
    if (pErr) {
      window.alert(pErr.message);
      return;
    }
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
    if (authUserId) {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.parentsDesign(authUserId) });
    }
    setEditMode(false);
    setReloadToken((x) => x + 1);
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

      const schoolId = usePwezaStore.getState().schoolId as string | undefined; // pweza speed system
      if (!schoolId) return;

      const [{ data: linkRows }, { data: parentUser }] = await Promise.all([
        supabase.from('parents').select('*').eq('school_id', schoolId).eq('parent_id', parentId),
        supabase.from('users').select('*').eq('user_id', parentId).eq('school_id', schoolId).maybeSingle(),
      ]);

      if (cancelled) return;

      parentCtxRef.current = schoolId ? { schoolId, hasUser: !!parentUser } : null;

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

      const studentIds = [...new Set((linkRows || []).map((r) => (r as { student_id?: string }).student_id).filter(Boolean))] as string[];

      const studentMap: Record<string, Record<string, unknown>> = {};
      const photoByStudent: Record<string, string> = {};
      if (studentIds.length) {
        const [{ data: studs }, { data: photos }] = await Promise.all([
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
        ]);
        for (const st of studs || []) {
          studentMap[String((st as { student_id: string }).student_id)] = st as Record<string, unknown>;
        }
        for (const ph of photos || []) {
          const sid = (ph as { student_id?: string }).student_id;
          const url = (ph as { photo_url?: string }).photo_url;
          if (sid && url && String(url).trim()) photoByStudent[sid] = String(url).trim();
        }
      }

      let totalBilled = 0;
      let totalPaid = 0;
      let totalBalance = 0;
      const paymentRows: { amount_paid: number; payment_method: string | null; payment_date: string | null }[] = [];

      if (studentIds.length) {
        const [{ data: bals }, { data: pays }] = await Promise.all([
          supabase.from('student_balances').select('total_fees, total_paid, balance').eq('school_id', schoolId).in('student_id', studentIds),
          supabase
            .from('student_payments')
            .select('amount_paid, payment_method, payment_date')
            .eq('school_id', schoolId)
            .in('student_id', studentIds)
            .order('payment_date', { ascending: false })
            .limit(40),
        ]);
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

      const phone = pickStr(pr?.phone) ?? pickStr(pu?.phone);
      const email = pickStr(pr?.email) ?? pickStr(pu?.email);
      const relationship = pickStr(pr?.relationship) ?? 'Guardian';
      const occupation = pickStr(pr?.occupation);
      const address = pickStr(pr?.address);
      const nin =
        pickStr(pr?.nin) ?? pickStr(pr?.national_id) ?? pickStr(pr?.national_identification_number);

      const portalActive = parentUser ? (pu as { is_active?: boolean } | null)?.is_active !== false : false;
      const portalEmail = pickStr(pu?.email);

      if (cancelled) return;

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const root = el.querySelector('.pw-parent-profile') || el;

        const set = (id: string, val: string) => {
          const n = root.querySelector(id);
          if (n) n.textContent = val;
        };
        const setHTML = (id: string, html: string) => {
          const n = root.querySelector(id);
          if (n) (n as HTMLElement).innerHTML = html;
        };

        set('#pp-breadcrumb-name', fullName);
        set('#pp-parent-name', fullName);

        const img = root.querySelector('#pp-photo-img') as HTMLImageElement | null;
        const ini = root.querySelector('#pp-photo-initials') as HTMLElement | null;
        if (img && ini) {
          img.style.display = 'none';
          ini.style.display = 'flex';
          ini.textContent = initials(fullName);
        }

        const relChip = root.querySelector('#pp-chip-relation') as HTMLElement | null;
        if (relChip) {
          const rel = relationship;
          const icon = rel.toLowerCase() === 'mother' ? '👩' : rel.toLowerCase() === 'father' ? '👨' : '👴';
          relChip.textContent = `${icon} ${rel}`;
        }

        const portalChip = root.querySelector('#pp-chip-portal') as HTMLElement | null;
        if (portalChip) {
          if (parentUser) {
            if (portalActive) {
              portalChip.textContent = '🌐 Portal Active';
              portalChip.className = 'pp-chip green';
            } else {
              portalChip.textContent = '✗ No Portal';
              portalChip.className = 'pp-chip rose';
            }
          } else {
            portalChip.textContent = '⏳ No login (link only)';
            portalChip.className = 'pp-chip amber';
          }
        }

        set('#pp-chip-nin', nin ? `🪪 ${nin}` : '🪪 Not recorded');

        const nKids = studentIds.length;
        const kidChip = root.querySelector('#pp-chip-children-count') as HTMLElement | null;
        if (kidChip) {
          const icon = nKids === 1 ? '👦' : '👧';
          kidChip.textContent = `${icon} ${nKids} Child${nKids !== 1 ? 'ren' : ''}`;
        }

        const phoneMeta = root.querySelector('#pp-meta-phone') as HTMLAnchorElement | null;
        if (phoneMeta) {
          if (phone) {
            phoneMeta.href = `tel:${phone.replace(/\s/g, '')}`;
            phoneMeta.textContent = phone;
          } else {
            phoneMeta.removeAttribute('href');
            phoneMeta.textContent = '—';
          }
        }
        const emailMeta = root.querySelector('#pp-meta-email') as HTMLAnchorElement | null;
        if (emailMeta) {
          if (email) {
            emailMeta.href = `mailto:${email}`;
            emailMeta.textContent = email;
          } else {
            emailMeta.removeAttribute('href');
            emailMeta.textContent = '—';
          }
        }
        set('#pp-meta-occupation', occupation || '—');
        set('#pp-meta-address', address || '—');
        set('#pp-meta-joined', fmtShort((pr?.created_at as string) ?? (pu?.created_at as string)));

        set('#pp-first-name', firstName);
        set('#pp-last-name', lastName);
        set('#pp-gender', '—');
        set('#pp-relationship', relationship);
        set('#pp-nin', nin || '—');
        set('#pp-nationality', '—');
        set('#pp-religion', '—');
        set('#pp-dob', '—');

        const phoneField = root.querySelector('#pp-phone') as HTMLAnchorElement | null;
        if (phoneField) {
          if (phone) {
            phoneField.href = `tel:${phone.replace(/\s/g, '')}`;
            phoneField.textContent = phone;
          } else {
            phoneField.removeAttribute('href');
            phoneField.textContent = '—';
          }
        }
        const waField = root.querySelector('#pp-whatsapp') as HTMLElement | null;
        if (waField) {
          if (phone) {
            const wa = phone.replace(/\D/g, '');
            waField.innerHTML = `<a href="https://wa.me/${wa}" target="_blank" rel="noreferrer">${escapeHtml(phone)}</a>`;
          } else {
            waField.textContent = '—';
          }
        }

        const emailField = root.querySelector('#pp-email') as HTMLAnchorElement | null;
        if (emailField) {
          if (email) {
            emailField.href = `mailto:${email}`;
            emailField.textContent = email;
          } else {
            emailField.removeAttribute('href');
            emailField.textContent = '—';
          }
        }

        set('#pp-occupation', occupation || '—');
        set('#pp-employer', '—');
        set('#pp-address', address || '—');
        set('#pp-district', '—');
        set('#pp-emergency', '—');

        const psEl = root.querySelector('#pp-portal-status') as HTMLElement | null;
        if (psEl) {
          if (!parentUser) {
            psEl.textContent = '— (no login)';
            psEl.className = 'pp-field-value muted';
          } else if (portalActive) {
            psEl.textContent = '✓ Active';
            psEl.className = 'pp-field-value green';
          } else {
            psEl.textContent = '✗ Inactive';
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
            ? `<div class="pp-empty"><div class="pp-empty-icon">👧</div><div class="pp-empty-title">No children linked</div><div class="pp-empty-sub">Link a student to this parent to see them here.</div></div>`
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
            ? `<div class="pp-empty"><div class="pp-empty-icon">💳</div><div class="pp-empty-title">No payments recorded</div><div class="pp-empty-sub">Payments for linked students will appear here.</div></div>`
            : paymentRows
                .map(
                  (p) => `
              <div class="pp-pay-row">
                <div class="pp-pay-ic" style="background:var(--green-s)">💵</div>
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
          `<div class="pp-empty"><div class="pp-empty-icon">💬</div><div class="pp-empty-title">No messages yet</div><div class="pp-empty-sub">School messaging can be connected here later.</div></div>`
        );
        setHTML(
          '#pp-activity-body',
          `<div class="pp-empty"><div class="pp-empty-icon">🕐</div><div class="pp-empty-title">No activity recorded</div></div>`
        );
        setHTML(
          '#pp-documents-body',
          `<div class="pp-empty"><div class="pp-empty-icon">📁</div><div class="pp-empty-title">No documents uploaded</div><div class="pp-empty-sub">Upload ID copies and consent forms when document storage is enabled.</div></div>`
        );

        if (editMode) {
          applyParentEditMode(
            root as HTMLElement,
            fullName,
            phone || '',
            email || '',
            occupation || '',
            address || '',
            nin || '',
            firstName,
            lastName
          );
        }

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

        root.querySelector('#pp-btn-print')?.addEventListener('click', () => window.print());
        root.querySelector('#pp-btn-message')?.addEventListener('click', () => navigate('/dashboard/admin/notifications'));
        root.querySelector('#pp-btn-portal')?.addEventListener('click', () => navigate('/dashboard/admin/parents/add'));
        root.querySelector('#pp-btn-manage-portal')?.addEventListener('click', () => navigate('/dashboard/admin/parents/add'));
        root.querySelector('#pp-btn-link-child')?.addEventListener('click', () => navigate('/dashboard/admin/students/add'));
        root.querySelector('#pp-btn-record-payment')?.addEventListener('click', () => navigate('/dashboard/admin/outstanding'));
        root.querySelector('#pp-btn-upload')?.addEventListener('click', () => {
          window.alert('Document uploads can be enabled in a future update.');
        });
        const ppEdit = root.querySelector('#pp-btn-edit') as HTMLElement | null;
        if (ppEdit) {
          ppEdit.textContent = editMode ? '💾 Save' : '✏️ Edit';
          ppEdit.onclick = (e) => {
            e.preventDefault();
            if (editMode) void saveParentRef.current();
            else setEditMode(true);
          };
        }
        const ppCancel = root.querySelector('#pp-btn-cancel-edit') as HTMLElement | null;
        if (ppCancel) {
          ppCancel.style.display = editMode ? 'inline-flex' : 'none';
          ppCancel.onclick = () => setEditMode(false);
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
  }, [htmlContent, parentId, navigate, reloadToken, editMode]);

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
