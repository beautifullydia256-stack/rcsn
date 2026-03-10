import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

export default function AddTeacherPage() {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [dob, setDob] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classesAssigned, setClassesAssigned] = useState<string[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, string[]>>({});
  const [salary, setSalary] = useState('');
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
    if (phone && !validatePhone(phone)) {
      setError('Enter a valid phone with country code');
      return;
    }
    const allowed = new Set(classOptions);
    const filteredClasses = classesAssigned.filter((c) => allowed.has(c));

    setSaving(true);
    const { data, error: insertError } = await supabase
      .from('teachers')
      .insert({
        school_id: schoolId,
        name: fullName,
        email: null,
        phone: phone || null,
        address: address || null,
        gender: gender || null,
        dob: dob || null,
        national_id: nationalId || null,
        subjects: subjects.length ? subjects : null,
        classes: filteredClasses.length ? filteredClasses : null,
        salary: salary ? parseFloat(salary) : null,
      })
      .select('teacher_id, employee_id')
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    try {
      if (data?.teacher_id && schoolId) {
        const { data: generatedEmail } = await supabase.rpc('generate_unique_school_email', {
          p_first_name: firstName,
          p_last_name: lastName,
          p_school_id: schoolId,
        });
        if (generatedEmail) {
          await supabase.from('teachers').update({ email: generatedEmail }).eq('teacher_id', data.teacher_id);
        }
      }
    } catch (emailError) {
      console.warn('Could not generate teacher email:', emailError);
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

    setSuccess(`Teacher added successfully! Employee ID: ${data?.employee_id || 'Generated'}. You can add more in the teacher profile.`);
    if (data?.teacher_id) {
      setTimeout(() => navigate(`/dashboard/admin/teachers/${data.teacher_id}`), 600);
    }
  };

  return (
    <AdminPageWrapper title="Add Teacher">
      <div className="flex items-center justify-end gap-2 mb-4">
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/admin/teachers')}
        >
          Back to Teacher List
        </button>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/admin')}
        >
          Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2">{error}</div>
      )}
      {success && (
        <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-3 py-2">{success}</div>
      )}

      <div className={`${adminCardClass} space-y-6`}>
        <div>
          <h3 className="ac-text-primary font-medium mb-3">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              className="ac-input rounded-lg px-3 py-2 w-full"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="ac-input rounded-lg px-3 py-2 w-full"
              placeholder="Middle name (optional)"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
            <input
              className="ac-input rounded-lg px-3 py-2 w-full"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <select
              className="ac-input rounded-lg px-3 py-2 w-full"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other' | '')}
            >
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="date"
              className="ac-input rounded-lg px-3 py-2 w-full"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            <input
              className="ac-input rounded-lg px-3 py-2 w-full"
              placeholder="National ID / Passport No."
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
            />
          </div>
        </div>

        <div>
          <h3 className="ac-text-primary font-medium mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="ac-input rounded-lg px-3 py-2 w-full"
              placeholder="Phone (+256...) - Optional"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="ac-input rounded-lg px-3 py-2 w-full sm:col-span-2"
              placeholder="Residential Address - Optional"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <p className="text-xs ac-text-secondary sm:col-span-2">Email will be auto-generated as firstname+lastname@schoolcode.sch</p>
          </div>
        </div>

        <div>
          <h3 className="ac-text-primary font-medium mb-3">Professional Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="ac-text-secondary text-sm mb-1">Classes Assigned</div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--ac-border)] p-2">
                <div className="grid grid-cols-2 gap-2">
                  {classOptions.map((c) => (
                    <label key={c} className="flex items-center gap-2 ac-text-primary text-sm">
                      <input
                        type="checkbox"
                        className="accent-blue-500"
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
            </div>
            <div>
              <div className="ac-text-secondary text-sm mb-1">Subjects to Teach</div>
              {classesAssigned.length === 0 ? (
                <div className="ac-text-secondary text-sm">Select at least one class to see available subjects.</div>
              ) : dynamicSubjectOptions.length === 0 ? (
                <div className="ac-text-secondary text-sm">No subjects configured for selected classes yet.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dynamicSubjectOptions.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={`px-3 py-1 rounded-lg border text-sm ${
                        subjects.includes(o.value)
                          ? 'bg-blue-600/80 border-blue-400 text-white'
                          : 'bg-white/10 border-[var(--ac-border)] ac-text-primary hover:bg-white/15'
                      }`}
                      onClick={() =>
                        setSubjects((prev) => (prev.includes(o.value) ? prev.filter((x) => x !== o.value) : [...prev, o.value]))
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="ac-text-secondary text-sm mb-1">Monthly Salary (UGX)</div>
            <input
              type="number"
              className="ac-input rounded-lg px-3 py-2 w-full max-w-xs"
              placeholder="e.g., 800000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>
          <p className="ac-text-secondary text-xs mt-2">Employee ID and date of hire will be set automatically.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-green-600 hover:bg-green-500 px-4 py-2 text-white font-medium disabled:opacity-50"
            disabled={saving}
            onClick={save}
          >
            {saving ? 'Saving...' : 'Save Teacher'}
          </button>
          <button
            type="button"
            className="ac-glass-btn-secondary rounded-lg px-4 py-2"
            onClick={() => navigate('/dashboard/admin/teachers')}
          >
            Cancel
          </button>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
