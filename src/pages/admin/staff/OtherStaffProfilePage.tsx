import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { pwDirGrad, pwDirInitials } from '@/components/admin/pwDirectoryUtils';
import { readFileAsDataURL } from '@/lib/profileInlineEdit';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { STAFF_ROSTER_ROLES } from '@/lib/staffRosterRoles';

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

const fieldBase =
  'w-full min-h-[44px] rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm ' +
  'bg-white text-slate-900 placeholder:text-slate-400 ' +
  'dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
  'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-65';

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide ac-text-muted';

function roleLabel(value: string | null) {
  if (!value) return null;
  return STAFF_ROSTER_ROLES.find((x) => x.value === value)?.label || value.replace(/_/g, ' ');
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${adminCardClass} rounded-2xl border border-[var(--ac-border)] space-y-4`}>
      {eyebrow ? (
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{eyebrow}</p>
      ) : null}
      <h2 className="text-base font-semibold ac-text-primary border-b border-[var(--ac-border)] pb-2">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
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
  const [schoolResolved, setSchoolResolved] = useState(false);

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
      if (!data) throw new Error('Record not found.');
      const record = data as OtherStaffRecord;
      if (schoolId && record.school_id !== schoolId) throw new Error('This person belongs to another school.');
      return record;
    },
    enabled: !!memberId && !!schoolId && schoolResolved,
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

  const shell = (inner: React.ReactNode) => (
    <div className="min-h-[100dvh] bg-[var(--ac-bg-base,#0f1419)] text-[var(--ac-text-primary)] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-6 sm:pt-6">{inner}</div>
    </div>
  );

  if (!schoolResolved) {
    return shell(
      <div className="flex min-h-[40vh] items-center justify-center ac-text-muted text-sm">Loading…</div>
    );
  }

  if (!schoolId) {
    return shell(
      <div className={`${adminCardClass} rounded-2xl text-center ac-text-secondary`}>No school linked to your account.</div>
    );
  }

  if (isLoading) {
    return shell(
      <div className="flex min-h-[40vh] items-center justify-center ac-text-muted text-sm">Loading profile…</div>
    );
  }

  if (error || !row) {
    return shell(
      <div className="space-y-4">
        <Link
          to="/dashboard/admin/staff"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--ac-border)] bg-white/5 px-4 py-2.5 text-sm font-medium ac-text-primary hover:bg-white/10 dark:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Staff
        </Link>
        <div className={`${adminCardClass} rounded-2xl border border-rose-500/30 bg-rose-500/5`}>
          <p className="font-medium text-rose-800 dark:text-rose-200">
            {error instanceof Error ? error.message : 'Could not load this record.'}
          </p>
        </div>
      </div>
    );
  }

  const initials = pwDirInitials(fullName || row.full_name || '?');
  const gradSeed = [...memberId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const grad = pwDirGrad(gradSeed % 7);
  const rLabel = roleLabel(staffRole);
  const subtitleParts = [jobTitle, department].filter(Boolean).join(' · ') || (rLabel || 'School staff');

  const dis = !isEditing;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-6 sm:pt-8 space-y-5 sm:space-y-6">
        <header className="sticky top-0 z-20 -mx-3 px-3 pt-1 sm:-mx-6 sm:px-6 sm:static sm:px-0">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2.5 shadow-lg backdrop-blur-md sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/staff')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Staff
            </button>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setSaveOk(false);
                  setSaveError(null);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/25"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Edit profile
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                <X className="h-4 w-4" aria-hidden />
                Cancel
              </button>
            )}
            <Link
              to="/dashboard/admin/accounts/invite"
              className="ml-auto inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 sm:ml-0"
            >
              Invitations
            </Link>
          </div>
        </header>

        <form onSubmit={handleSave} className="space-y-5 sm:space-y-6">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-xl shadow-black/20">
            <div className="flex flex-col items-center gap-6 p-5 sm:flex-row sm:items-start sm:p-8">
              <div className="relative shrink-0">
                <div
                  className="relative h-32 w-32 overflow-hidden rounded-2xl ring-2 ring-white/20 shadow-lg sm:h-40 sm:w-40"
                  style={{ background: photoPreview ? undefined : grad }}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {initials}
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPickPhoto} />
                {isEditing ? (
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15"
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden />
                      {photoPreview && !removePhoto ? 'Change photo' : 'Add photo'}
                    </button>
                    {(row.photo_url || photoPreview) && !removePhoto ? (
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Remove
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <p className="mt-2 max-w-[14rem] text-center text-[10px] leading-snug text-slate-400 sm:text-left">
                  {isEditing
                    ? 'Photo & files are stored on this record. Save to apply.'
                    : 'Tap Edit profile to change photo, details, or documents.'}
                </p>
              </div>

              <div className="min-w-0 flex-1 text-center sm:pt-1 sm:text-left">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">Non-teaching staff</p>
                <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">{fullName || '—'}</h1>
                <p className="mt-2 text-sm text-slate-300">{subtitleParts}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {rLabel ? (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-500/30">
                      {rLabel}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">On file · no dashboard role</span>
                  )}
                  {row.linked_user_id ? (
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-200 ring-1 ring-green-500/35">
                      Dashboard linked
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-500/20 px-3 py-1 text-xs text-slate-400 ring-1 ring-white/10">No login yet</span>
                  )}
                </div>
                <p className="mt-4 hidden text-xs text-slate-500 sm:block">
                  Record · <span className="font-mono text-[11px] text-slate-400">{row.id}</span>
                </p>
              </div>
            </div>
          </div>

          {saveError ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{saveError}</div>
          ) : null}
          {saveOk ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Saved successfully.
            </div>
          ) : null}

          <Section title="Identity & role" eyebrow="Directory">
            <div>
              <label className={labelClass}>
                Full name <span className="text-red-400">*</span>
              </label>
              <input className={fieldBase} value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={dis} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Dashboard role</label>
                <select className={fieldBase} value={staffRole} onChange={(e) => setStaffRole(e.target.value)} disabled={dis}>
                  <option value="">— None —</option>
                  {STAFF_ROSTER_ROLES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Job title</label>
                <input
                  className={fieldBase}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Driver, Senior accountant"
                  disabled={dis}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Department / unit</label>
                <input className={fieldBase} value={department} onChange={(e) => setDepartment(e.target.value)} disabled={dis} />
              </div>
            </div>
          </Section>

          <Section title="Contact" eyebrow="Reach">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Phone</label>
                <input className={fieldBase} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={dis} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input className={fieldBase} type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={dis} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>National ID</label>
                <input className={fieldBase} value={nationalId} onChange={(e) => setNationalId(e.target.value)} disabled={dis} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <input className={fieldBase} value={address} onChange={(e) => setAddress(e.target.value)} disabled={dis} />
              </div>
            </div>
          </Section>

          <Section title="Emergency" eyebrow="Safety">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Contact name</label>
                <input className={fieldBase} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} disabled={dis} />
              </div>
              <div>
                <label className={labelClass}>Contact phone</label>
                <input className={fieldBase} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} disabled={dis} />
              </div>
            </div>
          </Section>

          <Section title="Employment (reference)" eyebrow="Planning">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Hire date</label>
                <input className={fieldBase} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} disabled={dis} />
              </div>
              <div>
                <label className={labelClass}>Pay cycle</label>
                <select className={fieldBase} value={payFrequency} onChange={(e) => setPayFrequency(e.target.value)} disabled={dis}>
                  {PAY_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Salary (reference)</label>
                <input
                  className={fieldBase}
                  type="number"
                  min={0}
                  step={1000}
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  disabled={dis}
                />
              </div>
            </div>
          </Section>

          <Section title="Documents & KYC" eyebrow="Compliance">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Store driver licenses, contracts, ID checks, and other proofs. PDF and images accepted (max {MAX_DOCUMENT_BYTES / (1024 * 1024)} MB
              each). Use <strong>Edit profile</strong> to add or remove — then <strong>Save changes</strong>.
            </p>
            <input
              ref={docFileRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickDocument}
            />
            {isEditing ? (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Document type</label>
                    <select className={fieldBase} value={newDocKind} onChange={(e) => setNewDocKind(e.target.value)} disabled={dis}>
                      {DOC_KIND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {newDocKind === 'other' ? (
                    <div>
                      <label className={labelClass}>Custom label</label>
                      <input
                        className={fieldBase}
                        value={newDocCustomLabel}
                        onChange={(e) => setNewDocCustomLabel(e.target.value)}
                        placeholder="e.g. Vehicle insurance"
                      />
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => docFileRef.current?.click()}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/15"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Choose file to attach
                </button>
              </div>
            ) : null}

            {documents.length === 0 ? (
              <p className="text-sm ac-text-muted py-2">No documents on file yet.</p>
            ) : (
              <ul className="space-y-3">
                {documents.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" aria-hidden />
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{d.label}</p>
                        <p className="text-xs text-slate-400">
                          <span className="text-slate-500">{kindLabel(d.kind)}</span> · {d.file_name} · {formatTs(d.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        Open
                      </a>
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => removeDocument(d.id)}
                          className="inline-flex items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Notes" eyebrow="Internal">
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                className={`${fieldBase} min-h-[100px] resize-y py-3`}
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={dis}
              />
            </div>
          </Section>

          <section className={`${adminCardClass} rounded-2xl border border-[var(--ac-border)]`}>
            <h2 className="text-base font-semibold ac-text-primary border-b border-[var(--ac-border)] pb-2 mb-4">Record</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="ac-text-muted text-xs uppercase tracking-wide">Created</dt>
                <dd className="mt-0.5 ac-text-primary">{formatTs(row.created_at)}</dd>
              </div>
              <div>
                <dt className="ac-text-muted text-xs uppercase tracking-wide">Updated</dt>
                <dd className="mt-0.5 ac-text-primary">{formatTs(row.updated_at)}</dd>
              </div>
            </dl>
          </section>

          {isEditing ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center border-t border-white/10 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="min-h-[48px] w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-50 sm:w-auto"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={saving}
                className="min-h-[48px] w-full rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 sm:w-auto"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="min-h-[48px] w-full rounded-xl border border-rose-500/40 bg-rose-500/10 px-6 py-3 text-sm font-medium text-rose-200 hover:bg-rose-500/20 sm:ml-auto sm:w-auto"
              >
                Remove from roster
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
