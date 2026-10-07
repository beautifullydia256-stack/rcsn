import { useEffect, useMemo, useState, type ChangeEvent, type ComponentType, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { enqueue, offlineDb } from '@/lib/offlineDb';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { isValidRealEmail } from '@/lib/realEmail';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  ShieldAlert,
  UserCircle2,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useSchoolType } from '@/hooks/useSchoolType';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

export type AddTeacherFormProps = {
  mode: 'page' | 'modal';
  onCompleted?: () => void;
  onCancel?: () => void;
  isTertiary?: boolean;
};

const SECTION_Z_INDEX: Record<string, string> = {
  personal: 'z-[35]',
  contact: 'z-[30]',
  emergency: 'z-[25]',
  professional: 'z-[20]',
};

/** Collapsible liquid glass section with cascading stacking context */
function GlassSection({
  id,
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: (key: string) => void;
  children: ReactNode;
}) {
  const zClass = SECTION_Z_INDEX[id] || 'z-10';
  return (
    <div
      className={`relative ${zClass} focus-within:z-[50] rounded-2xl border border-white/20 bg-white/5 shadow-sm backdrop-blur-md overflow-visible transition-all`}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5 sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-white tracking-wide">{title}</span>
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-white/60" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-white/60" />
        )}
      </button>
      {isOpen && (
        <div className="space-y-4 border-t border-white/10 px-4 py-4 sm:px-5">{children}</div>
      )}
    </div>
  );
}

export function AddTeacherForm({ mode, onCompleted, onCancel, isTertiary: propIsTertiary }: AddTeacherFormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { isTertiary: schoolIsTertiary } = useSchoolType();
  const isTertiary = propIsTertiary ?? schoolIsTertiary;
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [dob, setDob] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [nationality, setNationality] = useState('');
  const [religion, setReligion] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [country, setCountry] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classesAssigned, setClassesAssigned] = useState<string[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, string[]>>({});
  const [salary, setSalary] = useState('');
  const [payFrequency, setPayFrequency] = useState<
    '' | 'monthly' | 'biweekly' | 'weekly' | 'termly' | 'annual' | 'custom'
  >('monthly');
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Part-time' | 'Contract'>('Full-time');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);

  const [openSections, setOpenSections] = useState<string[]>(['personal']);

  // "Link existing user" search
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<{ user_id: string; name: string; email: string; role: string; phone?: string }[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [linkedFromUser, setLinkedFromUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    if (!schoolId || userSearchQuery.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const q = userSearchQuery.trim();
        const { data } = await supabase
          .from('users')
          .select('user_id, name, email, role, phone')
          .eq('school_id', schoolId)
          .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
          .neq('role', 'teacher')
          .limit(6);
        setUserSearchResults(data || []);
      } catch {
        setUserSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearchQuery, schoolId]);

  const fillFromExistingUser = (u: { user_id: string; name: string; email: string; role: string; phone?: string }) => {
    const parts = (u.name || '').trim().split(/\s+/);
    setFirstName(parts[0] || '');
    setMiddleName(parts.length > 2 ? parts.slice(1, -1).join(' ') : '');
    setLastName(parts.length > 1 ? parts[parts.length - 1] : '');
    setEmail(u.email || '');
    if (u.phone) setPhone(u.phone);
    setLinkedFromUser({ name: u.name, role: u.role });
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const fieldBase =
    'w-full min-h-[46px] rounded-xl border border-white/20 px-3.5 py-2.5 text-sm shadow-inner ' +
    'bg-black/25 text-white placeholder-white/40 backdrop-blur-sm ' +
    'focus:border-emerald-400 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all';

  const inputClass = fieldBase;
  const dateFieldClass = `${fieldBase} [color-scheme:dark]`;
  const labelClass = 'mb-1.5 block text-[11px] font-bold text-white/70 uppercase tracking-wider';
  const hintClass = 'mt-1 text-xs text-white/50';

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      const { data } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!data?.school_id) return navigate('/login');
      setSchoolId(data.school_id);
      const { data: sch } = await supabase.from('schools').select('type').eq('school_id', data.school_id).single();
      setSchoolType((sch?.type as 'Nursery/Primary' | 'Secondary') || null);
    };
    run();
  }, [navigate]);

  const classOptions = useMemo(() => {
    const opts: string[] = [];
    if (schoolType === 'Nursery/Primary') {
      opts.push('Baby Class', 'Middle Class', 'Top Class');
      for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    } else if (schoolType === 'Secondary') {
      for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
    }
    return opts;
  }, [schoolType]);

  useEffect(() => {
    const load = async () => {
      if (!schoolId || classesAssigned.length === 0) return;
      const { data } = await supabase
        .from('class_subjects')
        .select('class_name, subject')
        .eq('school_id', schoolId)
        .in('class_name', classesAssigned);
      const map: Record<string, string[]> = {};
      (data || []).forEach((r: { class_name: string; subject: string }) => {
        if (!map[r.class_name]) map[r.class_name] = [];
        map[r.class_name].push(r.subject);
      });
      setSubjectsByClass(map);
    };
    load();
  }, [schoolId, classesAssigned]);

  const classSuffix = (c: string) => {
    if (c === 'Baby Class') return 'B';
    if (c === 'Middle Class') return 'M';
    if (c === 'Top Class') return 'T';
    const p = c.match(/^Primary\s+(\d)$/);
    if (p) return p[1];
    const s = c.match(/^Senior\s+(\d)$/);
    if (s) return s[1];
    return '';
  };

  const dynamicSubjectOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    classesAssigned.forEach((c) => {
      const subs = subjectsByClass[c] || [];
      const suf = classSuffix(c);
      subs.forEach((sub) => {
        const label = suf ? `${sub} ${suf}` : sub;
        opts.push({ label, value: label });
      });
    });
    const seen = new Set<string>();
    return opts.filter((o) => (seen.has(o.value) ? false : (seen.add(o.value), true)));
  }, [classesAssigned, subjectsByClass]);

  const validatePhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  };

  const fullName = useMemo(
    () => [firstName, middleName, lastName].filter(Boolean).join(' '),
    [firstName, middleName, lastName]
  );

  const toggleSection = (key: string) => {
    setOpenSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const resetForm = () => {
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setGender('');
    setDob('');
    setNationalId('');
    setNationality('');
    setReligion('');
    setEmail('');
    setPhone('');
    setAltPhone('');
    setWhatsapp('');
    setAddress('');
    setDistrict('');
    setCountry('');
    setEmergencyName('');
    setEmergencyRelationship('');
    setEmergencyPhone('');
    setSubjects([]);
    setClassesAssigned([]);
    setSubjectsByClass({});
    setSalary('');
    setPayFrequency('monthly');
    setEmploymentType('Full-time');
    setError(null);
    setOpenSections(['personal']);
  };

  const goBack = () => {
    if (mode === 'modal') onCancel?.();
    else navigate('/dashboard/admin/teachers');
  };

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!schoolId) {
      setError('Missing school context');
      return;
    }
    if (!firstName || !lastName) {
      setError('Please enter first and last name');
      return;
    }
    if (!email.trim() || !isValidRealEmail(email.trim())) {
      setError('Enter a valid real email address for the teacher (no placeholder or auto-generated addresses).');
      return;
    }
    if (phone && !validatePhone(phone)) {
      setError('Enter a valid phone with country code');
      return;
    }
    const allowed = new Set(classOptions);
    const filteredClasses = classesAssigned.filter((c) => allowed.has(c));

    const emailToSave = email.trim();
    const addressParts: string[] = [];
    if (address.trim()) addressParts.push(address.trim());
    if (country.trim()) addressParts.push(`Country: ${country.trim()}`);
    if (altPhone.trim()) addressParts.push(`Alt phone: ${altPhone.trim()}`);
    if (whatsapp.trim()) addressParts.push(`WhatsApp: ${whatsapp.trim()}`);
    const combinedAddress = addressParts.length ? addressParts.join('\n') : null;
    const emergencyLine =
      emergencyName.trim() || emergencyPhone.trim()
        ? [emergencyName.trim(), emergencyRelationship.trim() && `(${emergencyRelationship.trim()})`, emergencyPhone.trim()]
            .filter(Boolean)
            .join(' ')
        : null;

    // Offline: save to IndexedDB and queue for sync
    if (!navigator.onLine) {
      if (!schoolId) { setError('School not loaded.'); return; }
      try {
        setSaving(true);
        const tempId = crypto.randomUUID();
        await offlineDb.teachers.put({
          teacher_id: tempId,
          school_id: schoolId,
          name: fullName,
          email: emailToSave || null,
          phone: phone || null,
          department: null,
          employee_id: null,
        });
        await enqueue({
          action: {
            type: 'new_teacher',
            table: 'teachers',
            rows: [{
              school_id: schoolId,
              name: fullName,
              email: emailToSave,
              phone: phone || null,
              address: combinedAddress,
              gender: gender || null,
              employment_type: employmentType,
              emergency_contact: emergencyLine,
              subjects: subjects.length ? subjects : null,
              classes: filteredClasses.length ? filteredClasses : null,
              salary: salary ? parseFloat(salary) : null,
              pay_frequency: payFrequency || null,
              _temp_id: tempId,
            }],
          },
          schoolId,
          createdAt: Date.now(),
        });
        toast.success(isTertiary ? 'Tutor saved offline — will sync when connected.' : 'Teacher saved offline — will sync when connected.');
        if (mode === 'modal') { resetForm(); onCompleted?.(); }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save offline.');
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    const { data, error: insertError } = await supabase
      .from('teachers')
      .insert({
        school_id: schoolId,
        name: fullName,
        email: emailToSave,
        phone: phone || null,
        address: combinedAddress,
        gender: gender || null,
        dob: dob || null,
        national_id: nationalId || null,
        nationality: nationality || null,
        religion: religion || null,
        district: district || null,
        employment_type: employmentType,
        emergency_contact: emergencyLine,
        subjects: subjects.length ? subjects : null,
        classes: filteredClasses.length ? filteredClasses : null,
        salary: salary ? parseFloat(salary) : null,
        pay_frequency: payFrequency || null,
      })
      .select('teacher_id, employee_id')
      .single();

    setSaving(false);
    if (insertError) {
      // Unique constraint on employee_id fires when two schools share the same abbreviation prefix
      // and the DB trigger generates a conflicting ID. Retry once — the trigger uses a fresh sequence.
      if (insertError.code === '23505' && insertError.message.includes('employee_id')) {
        const { data: retryData, error: retryError } = await supabase
          .from('teachers')
          .insert({
            school_id: schoolId,
            name: fullName,
            email: emailToSave,
            phone: phone || null,
            address: combinedAddress,
            gender: gender || null,
            dob: dob || null,
            national_id: nationalId || null,
            nationality: nationality || null,
            religion: religion || null,
            district: district || null,
            employment_type: employmentType,
            emergency_contact: emergencyLine,
            subjects: subjects.length ? subjects : null,
            classes: filteredClasses.length ? filteredClasses : null,
            salary: salary ? parseFloat(salary) : null,
            pay_frequency: payFrequency || null,
          })
          .select('teacher_id, employee_id')
          .single();

        if (retryError) {
          setError('Could not assign a unique Employee ID. Please try again or contact support.');
          return;
        }
        // Fall through with retryData
        toast.success(isTertiary ? `Tutor added. Employee ID: ${retryData?.employee_id || '—'}.` : `Teacher added. Employee ID: ${retryData?.employee_id || '—'}.`);
        if (retryData?.teacher_id) {
          if (mode === 'modal') { resetForm(); onCompleted?.(); }
          else setTimeout(() => navigate(`/dashboard/admin/teachers/${retryData.teacher_id}`), 400);
        }
        return;
      }
      setError(insertError.message);
      return;
    }

    try {
      if (data?.teacher_id && filteredClasses.length > 0) {
        const payload: { school_id: string; teacher_id: string; class_name: string; subject: string }[] = [];
        for (const cls of filteredClasses) {
          const suf = classSuffix(cls);
          const matchSuffix = suf ? ` ${suf}` : '';
          const baseSubjectsForClass = dynamicSubjectOptions
            .filter((o) => o.value.endsWith(matchSuffix))
            .filter((o) => subjects.includes(o.value))
            .map((o) => o.label.replace(matchSuffix, ''));
          for (const sub of baseSubjectsForClass) {
            payload.push({ school_id: schoolId, teacher_id: data.teacher_id, class_name: cls, subject: sub });
          }
        }
        if (payload.length > 0) {
          await supabase.from('teacher_class_subjects').upsert(payload, { onConflict: 'school_id,teacher_id,class_name,subject', ignoreDuplicates: true });
        }
      }
    } catch (err: unknown) {
      console.warn('Failed to create teacher assignments:', err);
    }

    toast.success(isTertiary ? `Tutor added. Employee ID: ${data?.employee_id || '—'}.` : `Teacher added. Employee ID: ${data?.employee_id || '—'}.`);
    if (data?.teacher_id) {
      if (mode === 'modal') {
        resetForm();
        onCompleted?.();
      } else {
        setTimeout(() => navigate(`/dashboard/admin/teachers/${data.teacher_id}`), 400);
      }
    }
  };

  const formInner = (
    <>
      <div className={`mx-auto w-full max-w-3xl space-y-5 ${mode === 'page' ? 'pb-28 sm:pb-8' : 'pb-4'}`}>
        {mode === 'page' && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="ac-glass-btn-secondary inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ac-text-primary"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {isTertiary ? 'Back to Tutors' : 'Back to Teachers'}
            </button>
          </div>
        )}

        <form onSubmit={save} className="add-teacher-form space-y-5">
          <style>{`
            .dark .add-teacher-form input[type='date']::-webkit-calendar-picker-indicator {
              filter: invert(1);
              opacity: 0.8;
            }
          `}</style>

          {/* Link existing user */}
          <div className="rounded-2xl border border-white/20 bg-white/5 p-4 relative z-40 backdrop-blur-md">
            <p className="text-sm font-semibold text-white mb-2">
              Is this person already in the system?
            </p>
            <p className="text-xs text-white/60 mb-3">
              Search by name or email to find an existing account and auto-fill their details.
            </p>
            {linkedFromUser ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-2.5">
                <Check className="h-4 w-4 text-emerald-300 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-emerald-300">Details filled from: </span>
                  <span className="text-sm text-emerald-200">{linkedFromUser.name}</span>
                  <span className="ml-2 text-xs text-emerald-400/70 capitalize">({linkedFromUser.role})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkedFromUser(null)}
                  className="text-emerald-300/70 hover:text-white text-sm font-bold"
                  aria-label="Clear link"
                >×</button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <input
                    className={inputClass + ' pr-10'}
                    placeholder="Search name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                  {userSearchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  )}
                </div>
                {userSearchResults.length > 0 && (
                  <div className="mt-1 rounded-2xl border border-white/20 bg-slate-950/90 shadow-2xl backdrop-blur-xl overflow-hidden relative z-50">
                    {userSearchResults.map((u) => (
                      <button
                        key={u.user_id}
                        type="button"
                        onClick={() => fillFromExistingUser(u)}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-500/15 transition-colors border-b border-white/10 last:border-b-0"
                      >
                        <div className="text-sm font-medium text-white">{u.name}</div>
                        <div className="text-xs text-white/60 mt-0.5">{u.email} · <span className="capitalize text-emerald-300">{u.role}</span></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 whitespace-pre-wrap"
            >
              {error}
            </div>
          )}

          <GlassSection
            id="personal"
            title="Personal information"
            icon={UserCircle2}
            isOpen={openSections.includes('personal')}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>
                  First name <span className="text-amber-400">*</span>
                </label>
                <input
                  className={inputClass}
                  placeholder="e.g. Sarah"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className={labelClass}>Middle name</label>
                <input
                  className={inputClass}
                  placeholder="Optional"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  autoComplete="additional-name"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Last name <span className="text-amber-400">*</span>
                </label>
                <input
                  className={inputClass}
                  placeholder="e.g. Namyalo"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative z-30">
                <label className={labelClass}>Gender</label>
                <LiquidGlassSelect
                  value={gender}
                  onChange={(val) => setGender(val as 'Male' | 'Female' | 'Other' | '')}
                  options={[
                    { value: '', label: 'Select gender' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Male', label: 'Male' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  placeholder="Select gender"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="add-teacher-dob">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-emerald-400" aria-hidden />
                    Date of birth
                  </span>
                </label>
                <input
                  id="add-teacher-dob"
                  type="date"
                  className={`${dateFieldClass} mt-1`}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  aria-label="Date of birth"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nationality</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Ugandan"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                />
              </div>
              <div className="relative z-20">
                <label className={labelClass}>Religion</label>
                <LiquidGlassSelect
                  value={religion}
                  onChange={(val) => setReligion(val)}
                  options={[
                    { value: '', label: 'Select religion' },
                    { value: 'Christian', label: 'Christian' },
                    { value: 'Muslim', label: 'Muslim' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  placeholder="Select religion"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>National ID / Passport</label>
              <input
                className={inputClass}
                placeholder="e.g. CM90012345VB"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
            </div>
          </GlassSection>

          <GlassSection
            id="contact"
            title="Contact & location"
            icon={MapPin}
            isOpen={openSections.includes('contact')}
            onToggle={toggleSection}
          >
            <p className={hintClass}>
              Work email is used for login and invitations. Phone is optional.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Email <span className="text-amber-400">*</span>
                </label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="Real email (login & invitations)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="0700 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className={labelClass}>Alternative phone</label>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="Optional"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>WhatsApp</label>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="Optional"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Residential address</label>
              <input
                className={inputClass}
                placeholder="Street, estate or village"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>District / city</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Kampala"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Uganda"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </GlassSection>

          <GlassSection
            id="emergency"
            title="Emergency contact"
            icon={ShieldAlert}
            isOpen={openSections.includes('emergency')}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>Contact name</label>
                <input
                  className={inputClass}
                  placeholder="Full name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>
              <div className="relative z-30">
                <label className={labelClass}>Relationship</label>
                <LiquidGlassSelect
                  value={emergencyRelationship}
                  onChange={(val) => setEmergencyRelationship(val)}
                  options={[
                    { value: '', label: 'Select relationship' },
                    { value: 'Spouse', label: 'Spouse' },
                    { value: 'Parent', label: 'Parent' },
                    { value: 'Sibling', label: 'Sibling' },
                    { value: 'Friend', label: 'Friend' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  placeholder="Select relationship"
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="+256 700 000 000"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </div>
            </div>
          </GlassSection>

          <GlassSection
            id="professional"
            title="Professional & assignments"
            icon={Briefcase}
            isOpen={openSections.includes('professional')}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative z-30">
                <label className={labelClass}>Employment type</label>
                <LiquidGlassSelect
                  value={employmentType}
                  onChange={(val) => setEmploymentType(val as 'Full-time' | 'Part-time' | 'Contract')}
                  options={[
                    { value: 'Full-time', label: 'Full-time' },
                    { value: 'Part-time', label: 'Part-time' },
                    { value: 'Contract', label: 'Contract' },
                  ]}
                  placeholder="Employment type"
                />
              </div>
              <div className="rounded-xl border border-white/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-white/80">
                <span className="font-semibold text-emerald-300">Employee ID</span> is generated automatically when you save.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <label className={`${labelClass} mb-2`}>{isTertiary ? 'Courses / Cohorts assigned' : 'Classes assigned'}</label>
                <div className="flex flex-wrap gap-2">
                  {classOptions.map((c) => (
                    <label
                      key={c}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white backdrop-blur-sm transition-all hover:bg-white/15"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-black/30 text-emerald-500 focus:ring-emerald-400 accent-emerald-500"
                        checked={classesAssigned.includes(c)}
                        onChange={(e) =>
                          setClassesAssigned((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))
                        }
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={`${labelClass} mb-2`}>{isTertiary ? 'Course units / Subjects to teach' : 'Subjects to teach'}</label>
                {classesAssigned.length === 0 ? (
                  <p className="text-xs text-white/60">{isTertiary ? 'Select at least one course to see units from your curriculum.' : 'Select at least one class to see subjects from your curriculum.'}</p>
                ) : dynamicSubjectOptions.length === 0 ? (
                  <p className="text-xs text-white/60">{isTertiary ? 'No units configured for those courses in curriculum settings yet.' : 'No subjects configured for those classes in Financial / class settings yet.'}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dynamicSubjectOptions.map((o) => {
                      const selected = subjects.includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                            selected
                              ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-sm'
                              : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                          }`}
                          onClick={() =>
                            setSubjects((prev) =>
                              prev.includes(o.value) ? prev.filter((x) => x !== o.value) : [...prev, o.value]
                            )
                          }
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className={`${hintClass} mt-2`}>Tap to toggle. Assignments create class–subject links for this teacher.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Salary (UGX)</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  placeholder="e.g. 800000"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                />
              </div>
              <div className="relative z-20">
                <label className={labelClass}>Pay frequency</label>
                <LiquidGlassSelect
                  value={payFrequency}
                  onChange={(val) =>
                    setPayFrequency(
                      val as '' | 'monthly' | 'biweekly' | 'weekly' | 'termly' | 'annual' | 'custom'
                    )
                  }
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'biweekly', label: 'Bi-weekly' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'termly', label: 'Per term' },
                    { value: 'annual', label: 'Annual' },
                    { value: 'custom', label: 'Custom / other' },
                  ]}
                  placeholder="Pay frequency"
                />
              </div>
            </div>
          </GlassSection>

          <div
            className={
              mode === 'modal'
                ? 'mt-6 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-md'
                : 'fixed bottom-0 left-0 right-0 z-30 border-t border-white/20 dark:border-white/15 bg-white/70 dark:bg-slate-950/60 px-4 py-3 backdrop-blur-2xl backdrop-saturate-[180%] shadow-[0_-8px_32px_rgba(0,0,0,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.4)] sm:static sm:z-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none sm:shadow-none'
            }
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={goBack}
                className="order-2 sm:order-1 px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/90 text-sm font-medium backdrop-blur-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="order-3 sm:order-2 px-5 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium backdrop-blur-sm transition-all"
              >
                Reset form
              </button>
              <button
                type="submit"
                disabled={saving}
                className="order-1 sm:order-3 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 sm:min-w-[180px]"
              >
                {saving ? 'Saving...' : (isTertiary ? 'Save tutor' : 'Save teacher')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );

  if (mode === 'page') {
    return <AdminPageWrapper title={isTertiary ? 'Add tutor' : 'Add teacher'}>{formInner}</AdminPageWrapper>;
  }
  return formInner;
}
