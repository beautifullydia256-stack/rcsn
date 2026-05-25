import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { pwDirInitials } from '@/components/admin/pwDirectoryUtils';
import UserRolesSection from '@/components/admin/UserRolesSection';
import { readFileAsDataURL } from '@/lib/profileInlineEdit';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { STAFF_ROSTER_ROLES } from '@/lib/staffRosterRoles';

import '@/pages/admin/staff/teacherProfileShell.css';

const PROFILE_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

const PAY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'termly', label: 'Per term' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom / other' },
];

const DOC_KIND_OPTIONS = [
  { value: 'drivers_license', label: "Driver's license" },
  { value: 'employment_contract', label: 'Employment contract' },
  { value: 'kyc_id', label: 'KYC — ID document' },
  { value: 'kyc_proof', label: 'KYC — proof of address / supplemental' },
  { value: 'other', label: 'Other' },
] as const;

const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const FORM_ID = 'os-profile-form';

export type StaffAttachment = {
  id: string;
  kind: string;
  label: string;
  file_url: string;
  mime_type: string;
  file_name: string;
  uploaded_at: string;
};

function parseDocuments(raw: unknown): StaffAttachment[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  const out: StaffAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : '';
    const file_url = typeof o.file_url === 'string' ? o.file_url : '';
    if (!id || !file_url) continue;
    out.push({
      id,
      kind: typeof o.kind === 'string' ? o.kind : 'other',
      label: typeof o.label === 'string' ? o.label : 'Document',
      file_url,
      mime_type: typeof o.mime_type === 'string' ? o.mime_type : 'application/octet-stream',
      file_name: typeof o.file_name === 'string' ? o.file_name : 'file',
      uploaded_at: typeof o.uploaded_at === 'string' ? o.uploaded_at : new Date().toISOString(),
    });
  }
  return out;
}

function kindLabel(kind: string) {
  return DOC_KIND_OPTIONS.find((k) => k.value === kind)?.label || kind.replace(/_/g, ' ');
}

function roleLabel(value: string | null) {
  if (!value) return null;
  return STAFF_ROSTER_ROLES.find((x) => x.value === value)?.label || value.replace(/_/g, ' ');
}

function payLabel(v: string) {
  return PAY_OPTIONS.find((o) => o.value === v)?.label || '—';
}

function fmtDateUg(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtUGX(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `UGX ${Number(n).toLocaleString()}`;
}

type OtherStaffRecord = {
  id: string;
  school_id: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  staff_role: string | null;
  linked_user_id: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  hire_date: string | null;
  salary_amount: number | null;
  pay_frequency: string | null;
  photo_url: string | null;
  documents: unknown;
  created_at: string;
  updated_at: string | null;
};

function TpCard({
  title,
  emoji,
  iconBg,
  children,
}: {
  title: string;
  emoji: string;
  iconBg: string;
  children: ReactNode;
}) {
  return (
    <div className="tp-card">
      <div className="tp-card-head">
        <div className="tp-card-title">
          <div className="tp-card-title-ic" style={{ background: iconBg }}>
            {emoji}
          </div>
          {title}
        </div>
      </div>
      <div className="tp-card-body">{children}</div>
    </div>
  );
}

function shellLoading(message: string) {
  return (
    <div className="pw-teacher-profile">
      <div className="tp-content">
        <div className="tp-shell-inner">
          <p style={{ color: 'var(--t3)', padding: '24px 0' }}>{message}</p>
        </div>
      </div>
    </div>
  );
}

export default function OtherStaffProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { member_id: memberIdParam } = useParams<{ member_id: string }>();
  const memberId = memberIdParam || '';
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const authUser = useAuthStore((s) => s.user);
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const setSchoolIdStore = useAuthStore((s) => s.setSchoolId);

  const [schoolId, setSchoolId] = useState<string | null>(() => schoolIdFromStore ?? null);
  const [schoolResolved, setSchoolResolved] = useState(() => !!schoolIdFromStore);

  const [isEditing, setIsEditing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [documents, setDocuments] = useState<StaffAttachment[]>([]);
  const [newDocKind, setNewDocKind] = useState<string>('drivers_license');
  const [newDocCustomLabel, setNewDocCustomLabel] = useState('');

  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [payFrequency, setPayFrequency] = useState('');

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
    const sync = () =>
      document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (schoolIdFromStore) {
      setSchoolId(schoolIdFromStore);
      setSchoolResolved(true);
      return;
    }
    const run = async () => {
      if (!authUser?.id) {
        setSchoolResolved(true);
        return;
      }
      const { data } = await supabase.from('users').select('school_id').eq('user_id', authUser.id).single();
      const sid = (data?.school_id as string | undefined) ?? null;
      setSchoolId(sid);
      if (sid) setSchoolIdStore(sid);
      setSchoolResolved(true);
    };
    void run();
  }, [authUser?.id, schoolIdFromStore, setSchoolIdStore]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  const { data: row, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'other-staff-member', memberId, schoolId],
    queryFn: async (): Promise<OtherStaffRecord> => {
      const { data, error: qErr } = await supabase.from('other_staff_members').select('*').eq('id', memberId).maybeSingle();
      if (qErr) throw qErr;
      if (!data) throw new Error('Record not found. The staff member may have been removed.');
      const record = data as OtherStaffRecord;
      if (schoolId && record.school_id !== schoolId) throw new Error('This person belongs to another school.');
      return record;
    },
    enabled: !!memberId && !!schoolId && schoolResolved,
    retry: 1,
    retryDelay: 1000,
  });

  const hydrateFromRow = useCallback((r: OtherStaffRecord) => {
    setFullName(r.full_name || '');
    setJobTitle(r.job_title || '');
    setDepartment(r.department || '');
    setStaffRole(r.staff_role || '');
    setPhone(r.phone || '');
    setEmail(r.email || '');
    setNationalId(r.national_id || '');
    setAddress(r.address || '');
    setEmergencyName(r.emergency_contact_name || '');
    setEmergencyPhone(r.emergency_contact_phone || '');
    setNotes(r.notes || '');
    setHireDate(r.hire_date ? String(r.hire_date).slice(0, 10) : '');
    setSalaryAmount(r.salary_amount != null ? String(r.salary_amount) : '');
    setPayFrequency(r.pay_frequency || '');
    setPhotoFile(null);
    setRemovePhoto(false);
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPhotoPreview(r.photo_url || null);
    setDocuments(parseDocuments(r.documents));
    setNewDocKind('drivers_license');
    setNewDocCustomLabel('');
  }, []);

  useEffect(() => {
    if (!row) return;
    hydrateFromRow(row);
  }, [row, hydrateFromRow]);

  const formatTs = (iso: string | null | undefined) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  const cancelEditing = () => {
    if (row) hydrateFromRow(row);
    setIsEditing(false);
    setSaveError(null);
    setSaveOk(false);
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !f.type.startsWith('image/')) return;
    setRemovePhoto(false);
    setPhotoFile(f);
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    const url = URL.createObjectURL(f);
    previewObjectUrlRef.current = url;
    setPhotoPreview(url);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setRemovePhoto(true);
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPhotoPreview(null);
  };

  const addDocumentFromFile = async (file: File) => {
    if (file.size > MAX_DOCUMENT_BYTES) {
      setSaveError(`Each file must be under ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    const mime = file.type || 'application/octet-stream';
    const labelBase =
      newDocKind === 'other' && newDocCustomLabel.trim()
        ? newDocCustomLabel.trim()
        : DOC_KIND_OPTIONS.find((k) => k.value === newDocKind)?.label || 'Document';
    const dataUrl = await readFileAsDataURL(file);
    const att: StaffAttachment = {
      id: crypto.randomUUID(),
      kind: newDocKind,
      label: labelBase,
      file_url: dataUrl,
      mime_type: mime,
      file_name: file.name || 'document',
      uploaded_at: new Date().toISOString(),
    };
    setDocuments((prev) => [...prev, att]);
    setSaveError(null);
  };

  const onPickDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      await addDocumentFromFile(f);
    } catch {
      setSaveError('Could not read that file.');
    }
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveOk(false);
    const name = fullName.trim();
    if (!name || !memberId || !schoolId) {
      setSaveError('Full name is required.');
      return;
    }
    setSaving(true);
    try {
      let photo_url: string | null = row?.photo_url ?? null;
      if (removePhoto) photo_url = null;
      else if (photoFile) photo_url = await readFileAsDataURL(photoFile);

      const { error: uErr } = await supabase
        .from('other_staff_members')
        .update({
          full_name: name,
          job_title: jobTitle.trim() || null,
          department: department.trim() || null,
          staff_role: staffRole.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          national_id: nationalId.trim() || null,
          address: address.trim() || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          notes: notes.trim() || null,
          hire_date: hireDate || null,
          salary_amount: salaryAmount ? Number(salaryAmount) : null,
          pay_frequency: payFrequency || null,
          photo_url,
          documents: documents as unknown as Record<string, unknown>[],
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .eq('school_id', schoolId);
      if (uErr) throw uErr;
      setPhotoFile(null);
      setRemovePhoto(false);
      if (previewObjectUrlRef.current && previewObjectUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setSaveOk(true);
      setIsEditing(false);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'school-roster', schoolId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'other-staff', schoolId] });
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!row || !confirm(`Remove "${row.full_name}" from other staff? This cannot be undone.`)) return;
    const { error: dErr } = await supabase.from('other_staff_members').delete().eq('id', memberId).eq('school_id', schoolId!);
    if (dErr) {
      alert(dErr.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['admin', 'school-roster', schoolId] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'other-staff', schoolId] });
    navigate('/dashboard/admin/staff');
  };

  if (!schoolResolved) {
    return shellLoading('Loading…');
  }

  if (!schoolId) {
    return (
      <div className="pw-teacher-profile">
        <div className="tp-content">
          <div className="tp-shell-inner">
            <p style={{ color: 'var(--t2)' }}>No school linked to your account.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return shellLoading('Loading profile…');
  }

  if (error || !row) {
    return (
      <div className="pw-teacher-profile">
        <div className="tp-topbar tp-fu">
          <button type="button" className="tp-back" onClick={() => navigate('/dashboard/admin/staff')}>
            ← Staff
          </button>
        </div>
        <div className="tp-content">
          <div className="tp-shell-inner">
            <div className="tp-card">
              <div className="tp-card-body">
                <p style={{ color: 'var(--rose)' }}>
                  {error instanceof Error ? error.message : 'Could not load this record.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = pwDirInitials(fullName || row.full_name || '?');
  const rLab = roleLabel(staffRole);
  const subtitleParts = [jobTitle, department].filter(Boolean).join(' · ') || (rLab || 'School staff');
  const hireDisplay = hireDate ? fmtDateUg(hireDate) : '—';
  const salaryNum = salaryAmount.trim() === '' ? null : Number(salaryAmount);
  const dis = !isEditing;

  return (
    <div className="pw-teacher-profile">
      <div className="tp-topbar tp-fu">
        <button type="button" className="tp-back" onClick={() => navigate('/dashboard/admin/staff')}>
          ← Staff
        </button>
        <div className="tp-breadcrumb">
          <button type="button" className="tp-bc-link" onClick={() => navigate('/dashboard/admin/staff')} style={{ border: 'none', background: 'none', padding: 0, font: 'inherit' }}>
            Staff
          </button>
          <span style={{ color: 'var(--t3)' }}>/</span>
          <span className="tp-bc-current">{fullName || '—'}</span>
        </div>
        <div className="tp-topbar-right">
          <Link to="/dashboard/admin/accounts/invite" className="tp-btn tp-btn-blue tp-btn-sm">
            Invitations
          </Link>
          {isEditing ? (
            <>
              <button type="button" className="tp-btn tp-btn-ghost tp-btn-sm" onClick={cancelEditing}>
                Cancel
              </button>
              <button type="submit" form={FORM_ID} className="tp-btn tp-btn-amber tp-btn-sm" disabled={saving}>
                {saving ? 'Saving…' : '💾 Save'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="tp-btn tp-btn-ghost tp-btn-sm"
              onClick={() => {
                setSaveOk(false);
                setSaveError(null);
                setIsEditing(true);
              }}
            >
              ✏️ Edit
            </button>
          )}
        </div>
      </div>

      <div className="tp-content">
        <div className="tp-shell-inner">
          <form id={FORM_ID} onSubmit={handleSave}>
            <div className="tp-hero tp-fu">
              <div className="tp-banner" />
              <div className="tp-hero-body">
                <div className="tp-photo-wrap">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={onPickPhoto} />
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="tp-photo-img" />
                  ) : (
                    <div className="tp-photo-initials">{initials}</div>
                  )}
                  <button
                    type="button"
                    className="tp-photo-edit"
                    title={isEditing ? 'Change photo' : 'Enable edit to change photo'}
                    onClick={() => {
                      if (isEditing) fileRef.current?.click();
                      else window.alert('Click Edit, then use the camera control to change the photo.');
                    }}
                    aria-label="Change photo"
                  >
                    <Camera size={14} strokeWidth={2} />
                  </button>
                </div>

                <div className="tp-hero-info">
                  <h1 className="tp-teacher-name os-staff-name">{fullName || '—'}</h1>
                  <p style={{ color: 'var(--t2)', fontSize: 14, marginBottom: 10 }}>{subtitleParts}</p>
                  <div className="tp-hero-chips">
                    <span className="tp-chip muted">Non-teaching</span>
                    {rLab ? <span className="tp-chip teal">{rLab}</span> : <span className="tp-chip muted">No dashboard role</span>}
                    {row.linked_user_id ? (
                      <span className="tp-chip green">Dashboard linked</span>
                    ) : (
                      <span className="tp-chip muted">No login yet</span>
                    )}
                  </div>
                  <div className="tp-hero-meta">
                    <div className="tp-meta-item">
                      <span className="tp-meta-label">Phone</span>
                      <span className="tp-meta-value">
                        {phone.trim() ? (
                          <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                    <div className="tp-meta-item">
                      <span className="tp-meta-label">Email</span>
                      <span className="tp-meta-value">
                        {email.trim() ? (
                          <a href={`mailto:${email.trim()}`} className="email">
                            {email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                    <div className="tp-meta-item">
                      <span className="tp-meta-label">Hired</span>
                      <span className="tp-meta-value">{hireDate ? fmtDateUg(hireDate) : '—'}</span>
                    </div>
                    <div className="tp-meta-item">
                      <span className="tp-meta-label">Salary (ref.)</span>
                      <span className="tp-meta-value teal">
                        {fmtUGX(salaryNum)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tp-hero-actions">
                  <span className="tp-tag">ID</span>
                  <span className="tp-field-value mono" style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--t3)' }}>
                    {row.id}
                  </span>
                  {isEditing ? (
                    <p style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4, maxWidth: 200 }}>
                      Photo and documents apply after you save.
                    </p>
                  ) : null}
                  {photoPreview && isEditing ? (
                    <button type="button" className="tp-remove-btn" style={{ alignSelf: 'flex-start' }} onClick={clearPhoto}>
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {saveError ? (
              <div className="tp-card" style={{ marginBottom: 16 }}>
                <div className="tp-card-body">
                  <p style={{ color: 'var(--rose)', fontSize: 14 }}>{saveError}</p>
                </div>
              </div>
            ) : null}
            {saveOk ? (
              <div className="tp-card" style={{ marginBottom: 16, borderColor: 'rgba(39,224,159,.25)' }}>
                <div className="tp-card-body">
                  <p style={{ color: 'var(--green)', fontSize: 14 }}>Saved successfully.</p>
                </div>
              </div>
            ) : null}

            <div className="tp-grid tp-fu tp-d1">
              <TpCard title="Identity & role" emoji="👤" iconBg="var(--amber-s)">
                <div className="tp-fields">
                  <div className="tp-field" style={{ gridColumn: 'span 2' }}>
                    <span className="tp-field-label">Full name *</span>
                    {dis ? (
                      <span className="tp-field-value">{fullName || '—'}</span>
                    ) : (
                      <input className="pw-inline-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    )}
                  </div>
                  <div className="tp-field">
                    <span className="tp-field-label">Dashboard role</span>
                    {dis ? (
                      <span className="tp-field-value muted">{rLab || '—'}</span>
                    ) : (
                      <select className="pw-inline-input" value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                        <option value="">— None —</option>
                        {STAFF_ROSTER_ROLES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="tp-field">
                    <span className="tp-field-label">Job title</span>
                    {dis ? (
                      <span className="tp-field-value muted">{jobTitle || '—'}</span>
                    ) : (
                      <input className="pw-inline-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Driver" />
                    )}
                  </div>
                  <div className="tp-field" style={{ gridColumn: 'span 2' }}>
                    <span className="tp-field-label">Department / unit</span>
                    {dis ? (
                      <span className="tp-field-value muted">{department || '—'}</span>
                    ) : (
                      <input className="pw-inline-input" value={department} onChange={(e) => setDepartment(e.target.value)} />
                    )}
                  </div>
                </div>
              </TpCard>

              <TpCard title="Contact" emoji="📞" iconBg="var(--blue-s)">
                <div className="tp-fields">
                  <div className="tp-field">
                    <span className="tp-field-label">Phone</span>
                    {dis ? (
                      <span className="tp-field-value">{phone.trim() ? phone : '—'}</span>
                    ) : (
                      <input className="pw-inline-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    )}
                  </div>
                  <div className="tp-field">
                    <span className="tp-field-label">Email</span>
                    {dis ? (
                      <span className="tp-field-value muted">{email.trim() ? email : '—'}</span>
                    ) : (
                      <input className="pw-inline-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    )}
                  </div>
                  <div className="tp-field">
                    <span className="tp-field-label">National ID</span>
                    {dis ? (
                      <span className="tp-field-value muted">{nationalId || '—'}</span>
                    ) : (
                      <input className="pw-inline-input" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
                    )}
                  </div>
                  <div className="tp-field" style={{ gridColumn: 'span 2' }}>
                    <span className="tp-field-label">Address</span>
                    {dis ? (
                      <span className="tp-field-value muted">{address || '—'}</span>
                    ) : (
                      <input className="pw-inline-input" value={address} onChange={(e) => setAddress(e.target.value)} />
                    )}
                  </div>
                </div>
              </TpCard>
            </div>

            <div className="tp-grid tp-fu tp-d2" style={{ marginTop: 16 }}>
              <TpCard title="Emergency" emoji="🛟" iconBg="var(--rose-s)">
                <div className="tp-fields">
                  <div className="tp-field">
                    <span className="tp-field-label">Contact name</span>
                    {dis ? (
                      <span className="tp-field-value muted">{emergencyName || '—'}</span>
                    ) : (
                      <input className="pw-inline-input" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
                    )}
                  </div>
                  <div className="tp-field">
                    <span className="tp-field-label">Contact phone</span>
                    {dis ? (
                      <span className="tp-field-value muted">{emergencyPhone || '—'}</span>
                    ) : (
                      <input className="pw-inline-input" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                    )}
                  </div>
                </div>
              </TpCard>

              <TpCard title="Employment (reference)" emoji="💼" iconBg="var(--teal-s)">
                <div className="tp-fields">
                  <div className="tp-field">
                    <span className="tp-field-label">Hire date</span>
                    {dis ? (
                      <span className="tp-field-value">{hireDisplay}</span>
                    ) : (
                      <input className="pw-inline-input" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
                    )}
                  </div>
                  <div className="tp-field">
                    <span className="tp-field-label">Pay cycle</span>
                    {dis ? (
                      <span className="tp-field-value muted">{payLabel(payFrequency)}</span>
                    ) : (
                      <select className="pw-inline-input" value={payFrequency} onChange={(e) => setPayFrequency(e.target.value)}>
                        {PAY_OPTIONS.map((o) => (
                          <option key={o.value || 'empty'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="tp-field" style={{ gridColumn: 'span 2' }}>
                    <span className="tp-field-label">Salary (reference)</span>
                    {dis ? (
                      <span className="tp-field-value teal">{fmtUGX(salaryNum)}</span>
                    ) : (
                      <input className="pw-inline-input" type="number" min={0} step={1000} value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} />
                    )}
                  </div>
                </div>
              </TpCard>
            </div>

            <div className="tp-grid full" style={{ marginTop: 16 }}>
              <TpCard title="Documents & KYC" emoji="🪪" iconBg="var(--violet-s)">
                <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 14, lineHeight: 1.5 }}>
                  Licenses, contracts, and KYC proofs. PDF and images up to {MAX_DOCUMENT_BYTES / (1024 * 1024)} MB each. Edit, attach files,
                  then save.
                </p>
                <input ref={docFileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={onPickDocument} />
                {isEditing ? (
                  <>
                    <div className="tp-fields" style={{ marginBottom: 14 }}>
                      <div className="tp-field">
                        <span className="tp-field-label">Document type</span>
                        <select className="pw-inline-input" value={newDocKind} onChange={(e) => setNewDocKind(e.target.value)}>
                          {DOC_KIND_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {newDocKind === 'other' ? (
                        <div className="tp-field">
                          <span className="tp-field-label">Custom label</span>
                          <input
                            className="pw-inline-input"
                            value={newDocCustomLabel}
                            onChange={(e) => setNewDocCustomLabel(e.target.value)}
                            placeholder="e.g. Vehicle insurance"
                          />
                        </div>
                      ) : null}
                    </div>
                    <button type="button" className="tp-doc-upload-zone" style={{ border: '2px dashed rgba(255,255,255,.12)', width: '100%' }} onClick={() => docFileRef.current?.click()}>
                      <span className="tp-doc-upload-ic">➕</span>
                      <span className="tp-doc-upload-title">Choose file to attach</span>
                      <span className="tp-doc-upload-sub">PDF or image</span>
                    </button>
                  </>
                ) : null}

                {documents.length === 0 ? (
                  <div className="tp-empty">
                    <div className="tp-empty-icon">📄</div>
                    <div className="tp-empty-title">No documents on file</div>
                    <div className="tp-empty-sub">Edit the profile to upload driver license, contract, or KYC.</div>
                  </div>
                ) : (
                  <div>
                    {documents.map((d) => (
                      <div className="tp-doc-row" key={d.id}>
                        <div className={`tp-doc-ic ${d.mime_type.includes('pdf') ? 'pdf' : 'img'}`}>
                          {d.mime_type.includes('pdf') ? '📕' : '🖼'}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="tp-doc-name">{d.label}</div>
                          <div className="tp-doc-meta">
                            {kindLabel(d.kind)} · {d.file_name} · {formatTs(d.uploaded_at)}
                          </div>
                        </div>
                        <div className="tp-doc-actions">
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="tp-doc-btn tp-doc-btn-ghost">
                            Open
                          </a>
                          {isEditing ? (
                            <button type="button" className="tp-doc-btn tp-doc-btn-rose" onClick={() => removeDocument(d.id)}>
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TpCard>
            </div>

            <div className="tp-grid full" style={{ marginTop: 16 }}>
              <TpCard title="Internal notes" emoji="📝" iconBg="var(--amber-s)">
                <div className="tp-fields one">
                  <div className="tp-field">
                    <span className="tp-field-label">Notes</span>
                    {dis ? (
                      <span className="tp-field-value muted" style={{ whiteSpace: 'pre-wrap' }}>
                        {notes.trim() ? notes : '—'}
                      </span>
                    ) : (
                      <textarea className="pw-inline-input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    )}
                  </div>
                </div>
              </TpCard>
            </div>

            <div className="tp-grid full" style={{ marginTop: 16 }}>
              <TpCard title="Record" emoji="🕐" iconBg="var(--s3)">
                <div className="tp-fields">
                  <div className="tp-field">
                    <span className="tp-field-label">Created</span>
                    <span className="tp-field-value">{formatTs(row.created_at)}</span>
                  </div>
                  <div className="tp-field">
                    <span className="tp-field-label">Updated</span>
                    <span className="tp-field-value">{formatTs(row.updated_at)}</span>
                  </div>
                </div>
              </TpCard>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24, paddingBottom: 8 }}>
                <button type="button" className="tp-btn tp-btn-ghost" disabled={saving} onClick={() => void refetch()}>
                  Reload
                </button>
                <button type="button" className="tp-btn tp-btn-danger" onClick={() => void handleDelete()}>
                  Remove from roster
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </div>
      <UserRolesSection userId={row?.linked_user_id} schoolId={schoolId} />
    </div>
  );
}
