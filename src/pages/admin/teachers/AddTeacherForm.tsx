import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { isValidRealEmail } from '@/lib/realEmail';

export type AddTeacherFormProps = {
  mode: 'page' | 'modal';
  onCompleted?: () => void;
  onCancel?: () => void;
};

export function AddTeacherForm({ mode, onCompleted, onCancel }: AddTeacherFormProps) {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [dob, setDob] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [nationality, setNationality] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
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
  const [success, setSuccess] = useState<string | null>(null);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  const validatePhone = (value: string) =>
    /^\+?[1-9]\d{6,14}$/.test(value.replace(/\s|-/g, ''));

  const fullName = useMemo(
    () => [firstName, middleName, lastName].filter(Boolean).join(' '),
    [firstName, middleName, lastName]
  );

  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, []);

  const resetForm = () => {
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setGender('');
    setDob('');
    setNationalId('');
    setNationality('');
    setMaritalStatus('');
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
    setSuccess(null);
  };

  const save = async () => {
    setError(null);
    setSuccess(null);
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

    setSaving(true);
    const emailToSave = email.trim();
    const { data, error: insertError } = await supabase
      .from('teachers')
      .insert({
        school_id: schoolId,
        name: fullName,
        email: emailToSave,
        phone: phone || null,
        address: address || null,
        gender: gender || null,
        dob: dob || null,
        national_id: nationalId || null,
        subjects: subjects.length ? subjects : null,
        classes: filteredClasses.length ? filteredClasses : null,
        salary: salary ? parseFloat(salary) : null,
        pay_frequency: payFrequency || null,
      })
      .select('teacher_id, employee_id')
      .single();

    setSaving(false);
    if (insertError) {
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
          await supabase.from('teacher_class_subjects').insert(payload);
        }
      }
    } catch (e: unknown) {
      console.warn('Failed to create teacher assignments:', e);
    }

    setSuccess(`Teacher added successfully! Employee ID: ${data?.employee_id || 'Generated'}.`);
    if (data?.teacher_id) {
      if (mode === 'modal') {
        resetForm();
        onCompleted?.();
      } else {
        setTimeout(() => navigate(`/dashboard/admin/teachers/${data.teacher_id}`), 600);
      }
    }
  };

  const goBack = () => {
    if (mode === 'modal') onCancel?.();
    else navigate('/dashboard/admin/teachers');
  };

  const formInner = (
    <>
      {mode === 'page' && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-[13px] px-3.5 py-1.5 border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
              onClick={goBack}
            >
              ← Back
            </button>
            <h1 className="text-[22px] font-medium text-[var(--color-text-primary)]">Add Teacher</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-[13px] px-3.5 py-1.5 border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
              onClick={resetForm}
            >
              Reset
            </button>
            <button
              type="button"
              className="text-[13px] px-3.5 py-1.5 border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
              onClick={goBack}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-[13px] px-4 py-1.5 rounded-[var(--border-radius-md)] bg-[#1a56db] hover:bg-[#1649c0] text-white font-medium disabled:opacity-50"
              disabled={saving}
              onClick={save}
            >
              {saving ? 'Saving...' : 'Save Teacher'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2">{error}</div>}
      {success && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-3 py-2">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">
        <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] p-5 flex flex-col items-center gap-3">
          <button
            type="button"
            className="w-[100px] h-[100px] rounded-full border-2 border-dashed border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] flex flex-col items-center justify-center hover:border-[#1a56db] transition-colors"
            onClick={() => setError('Photo upload is not enabled yet.')}
            aria-label="Upload teacher photo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-[var(--color-text-tertiary)]">
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-[11px] text-[var(--color-text-tertiary)] mt-1 text-center">Upload photo</span>
          </button>
          <div className="text-[14px] font-medium text-[var(--color-text-primary)]">{fullName || 'Full Name'}</div>
          <div className="text-[12px] text-[var(--color-text-secondary)]">Teacher</div>
          <span className="text-[11px] px-2.5 py-[3px] rounded-full bg-[var(--color-background-success)] text-[var(--color-text-success)] font-medium">
            Active
          </span>

          <div className="w-full border-t border-[var(--color-border-tertiary)] pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--color-text-secondary)]">Teacher ID</span>
              <span className="text-[12px] text-[var(--color-text-primary)] font-medium">Auto-generated</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--color-text-secondary)]">Date added</span>
              <span className="text-[12px] text-[var(--color-text-primary)] font-medium">{todayLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-[var(--color-text-secondary)]">Employment</span>
              <select
                className="text-[12px] px-2 py-1 border border-[var(--color-border-secondary)] rounded-md bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as any)}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border-tertiary)] flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#e6f1fb] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
              <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">Personal Information</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <input className="ac-input rounded-lg px-3 py-2 w-full" placeholder="e.g. Sarah" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Middle name</label>
                  <input className="ac-input rounded-lg px-3 py-2 w-full" placeholder="Optional" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <input className="ac-input rounded-lg px-3 py-2 w-full" placeholder="e.g. Namyalo" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Gender</label>
                  <select className="ac-input rounded-lg px-3 py-2 w-full" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Date of birth</label>
                  <input type="date" className="ac-input rounded-lg px-3 py-2 w-full" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Nationality</label>
                  <input className="ac-input rounded-lg px-3 py-2 w-full" placeholder="e.g. Ugandan" value={nationality} onChange={(e) => setNationality(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">National ID / Passport No.</label>
                  <input className="ac-input rounded-lg px-3 py-2 w-full" placeholder="e.g. CM90012345VB" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Marital status</label>
                  <select className="ac-input rounded-lg px-3 py-2 w-full" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Religion</label>
                  <select className="ac-input rounded-lg px-3 py-2 w-full" value={religion} onChange={(e) => setReligion(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Christian">Christian</option>
                    <option value="Muslim">Muslim</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border-tertiary)] flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#eaf3de] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b6d11" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.86 9.11 19.79 19.79 0 01.78 1.18 2 2 0 012.78 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 8.6A16 16 0 0015.4 16.91l.96-.96a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </div>
              <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">Contact Information</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="ac-input rounded-lg px-3 py-2 w-full"
                    placeholder="Real email address (login & invitations)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Phone number</label>
                  <input type="tel" className="ac-input rounded-lg px-3 py-2 w-full" placeholder="+256 700 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Alternative phone</label>
                  <input type="tel" className="ac-input rounded-lg px-3 py-2 w-full" placeholder="+256 700 000 000" value={altPhone} onChange={(e) => setAltPhone(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">WhatsApp number</label>
                  <input type="tel" className="ac-input rounded-lg px-3 py-2 w-full" placeholder="Same as phone or different" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Residential address</label>
                  <input className="ac-input rounded-lg px-3 py-2 w-full" placeholder="Street, estate or village" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">District / City</label>
                  <input className="ac-input rounded-lg px-3 py-2 w-full" placeholder="e.g. Kampala" value={district} onChange={(e) => setDistrict(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Country</label>
                  <input className="ac-input rounded-lg px-3 py-2 w-full" placeholder="e.g. Uganda" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
              </div>

              <div className="h-px bg-[var(--color-border-tertiary)] my-4" />
              <div className="text-[13px] font-medium text-[var(--color-text-primary)] mb-2">Emergency Contact</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Contact name</label>
                  <input className="ac-input rounded-lg px-3 py-2 w-full" placeholder="Full name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Relationship</label>
                  <select className="ac-input rounded-lg px-3 py-2 w-full" value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[var(--color-text-secondary)] font-medium">Phone</label>
                  <input type="tel" className="ac-input rounded-lg px-3 py-2 w-full" placeholder="+256 700 000 000" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border-tertiary)] flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#faeeda] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#854f0b" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                </svg>
              </div>
              <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">Professional Information</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[13px] font-medium text-[var(--color-text-primary)] mb-2">Classes Assigned</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {classOptions.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-[13px] ac-text-primary cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-blue-500 w-[14px] h-[14px]"
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
                  <div className="text-[13px] font-medium text-[var(--color-text-primary)] mb-2">Subjects to Teach</div>
                  {classesAssigned.length === 0 ? (
                    <div className="ac-text-secondary text-sm">Select at least one class to see available subjects.</div>
                  ) : dynamicSubjectOptions.length === 0 ? (
                    <div className="ac-text-secondary text-sm">No subjects configured for selected classes yet.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {dynamicSubjectOptions.map((o) => {
                        const selected = subjects.includes(o.value);
                        return (
                          <button
                            key={o.value}
                            type="button"
                            className={`text-[12px] px-2.5 py-1 border rounded-full ${
                              selected
                                ? 'bg-[#e6f1fb] border-[#185fa5] text-[#185fa5]'
                                : 'bg-[var(--color-background-secondary)] border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]/80'
                            }`}
                            onClick={() =>
                              setSubjects((prev) => (prev.includes(o.value) ? prev.filter((x) => x !== o.value) : [...prev, o.value]))
                            }
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <span className="text-[11px] ac-text-secondary mt-2 block">Click to select subjects</span>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-4 sm:items-end">
                <div className="flex-1 max-w-xs">
                  <div className="ac-text-secondary text-sm mb-1">Salary amount (UGX)</div>
                  <input
                    type="number"
                    className="ac-input rounded-lg px-3 py-2 w-full"
                    placeholder="e.g., 800000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>
                <div className="w-full max-w-xs">
                  <div className="ac-text-secondary text-sm mb-1">How often paid</div>
                  <select
                    className="ac-input rounded-lg px-3 py-2 w-full"
                    value={payFrequency}
                    onChange={(e) =>
                      setPayFrequency(
                        e.target.value as '' | 'monthly' | 'biweekly' | 'weekly' | 'termly' | 'annual' | 'custom'
                      )
                    }
                  >
                    <option value="monthly">Monthly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="weekly">Weekly</option>
                    <option value="termly">Per term</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom / other</option>
                  </select>
                </div>
              </div>
              <p className="ac-text-secondary text-xs mt-2">Employee ID and date of hire will be set automatically.</p>
            </div>
          </div>

          <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--border-radius-lg)] overflow-hidden">
            <div className="px-5 py-4 border-t border-[var(--color-border-tertiary)] bg-[var(--color-background-secondary)] flex items-center gap-2">
              <span className="text-[12px] text-[var(--color-text-tertiary)]">
                Fields marked <span className="text-red-500">*</span> are required
              </span>
              <div className="flex-1" />
              <button
                type="button"
                className="text-[13px] px-3.5 py-1.5 border border-red-300 rounded-[var(--border-radius-md)] bg-red-50 text-red-600 hover:bg-red-100"
                onClick={goBack}
              >
                Discard
              </button>
              <button
                type="button"
                className="text-[13px] px-3.5 py-1.5 border border-[var(--color-border-secondary)] rounded-[var(--border-radius-md)] bg-[var(--color-background-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]"
                onClick={resetForm}
              >
                Reset form
              </button>
              <button
                type="button"
                className="text-[13px] px-4 py-1.5 rounded-[var(--border-radius-md)] bg-[#1a56db] hover:bg-[#1649c0] text-white font-medium disabled:opacity-50"
                disabled={saving}
                onClick={save}
              >
                Save Teacher →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (mode === 'page') {
    return <AdminPageWrapper title="Add Teacher">{formInner}</AdminPageWrapper>;
  }
  return formInner;
}
