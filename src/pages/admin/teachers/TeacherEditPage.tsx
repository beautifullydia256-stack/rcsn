import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import ChangeTeacherPhoneModal from '@/components/admin/ChangeTeacherPhoneModal';

export default function TeacherEditPage() {
  const navigate = useNavigate();
  const { teacher_id: teacherIdParam } = useParams<{ teacher_id: string }>();
  const teacherId = Array.isArray(teacherIdParam) ? teacherIdParam[0] : teacherIdParam || '';

  const [teacher, setTeacher] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [address, setAddress] = useState('');
  const [salary, setSalary] = useState('');
  const [changePhoneOpen, setChangePhoneOpen] = useState(false);

  useEffect(() => {
    const loadTeacher = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      const { data: teacherData, error: err } = await supabase.from('teachers').select('*').eq('teacher_id', teacherId).single();
      if (err || !teacherData) {
        setError(err?.message || 'Teacher not found');
        setLoading(false);
        return;
      }
      setTeacher(teacherData as Record<string, unknown>);
      setName(String(teacherData.name || ''));
      setEmail(String(teacherData.email || ''));
      setPhone(String(teacherData.phone || ''));
      setQualification(String(teacherData.qualification || ''));
      setExperience(String(teacherData.experience || ''));
      setAddress(String(teacherData.address || ''));
      setSalary(teacherData.salary ? String(teacherData.salary) : '');
      setLoading(false);
    };
    if (teacherId) loadTeacher();
  }, [teacherId, navigate]);

  const handleSave = async () => {
    if (!teacher) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: updateError } = await supabase
        .from('teachers')
        .update({
          name: name.trim(),
          email: email.trim() || null,
          qualification: qualification.trim() || null,
          experience: experience.trim() || null,
          address: address.trim() || null,
          salary: salary ? parseFloat(salary) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('teacher_id', teacherId);
      if (updateError) throw new Error(updateError.message);
      setSuccess('Teacher updated successfully!');
      setTimeout(() => navigate(`/dashboard/admin/teachers/${teacherId}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update teacher');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminPageWrapper title="Edit Teacher">
        <div className="ac-text-secondary">Loading teacher data...</div>
      </AdminPageWrapper>
    );
  }
  if (error && !teacher) {
    return (
      <AdminPageWrapper title="Edit Teacher">
        <div className="ac-text-secondary mb-4">{error}</div>
        <button type="button" className="ac-glass-btn-secondary rounded-lg px-4 py-2" onClick={() => navigate('/dashboard/admin/teachers')}>
          Back to Teachers
        </button>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper title="Edit Teacher">
      <div className="flex items-center justify-end gap-2 mb-4">
        <button type="button" className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm" onClick={() => navigate(`/dashboard/admin/teachers/${teacherId}`)}>Cancel</button>
        <button type="button" className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white text-sm disabled:opacity-50" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      {success && <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-3 py-2">{success}</div>}
      {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2">{error}</div>}
      <div className={`${adminCardClass} space-y-6`}>
        <div>
          <h3 className="ac-text-primary font-medium mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block ac-text-secondary text-sm mb-1">Full Name *</label>
              <input className="ac-input w-full rounded-lg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="block ac-text-secondary text-sm mb-1">Email</label>
              <input type="email" className="ac-input w-full rounded-lg px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@school.com" />
            </div>
            <div>
              <label className="block ac-text-secondary text-sm mb-1">Phone</label>
              <div className="flex items-center gap-2">
                <input type="tel" className="ac-input w-full rounded-lg px-3 py-2" value={phone} readOnly disabled placeholder="No phone on file" />
                <button
                  type="button"
                  className="ac-glass-btn-secondary rounded-lg px-3 py-2 text-sm whitespace-nowrap"
                  onClick={() => setChangePhoneOpen(true)}
                >
                  Change
                </button>
              </div>
              <p className="ac-text-secondary text-xs mt-1">Changing the phone requires SMS verification.</p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="ac-text-primary font-medium mb-3">Professional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block ac-text-secondary text-sm mb-1">Qualification</label>
              <input className="ac-input w-full rounded-lg px-3 py-2" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. Bachelor of Education" />
            </div>
            <div>
              <label className="block ac-text-secondary text-sm mb-1">Experience</label>
              <input className="ac-input w-full rounded-lg px-3 py-2" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 5 years" />
            </div>
            <div className="md:col-span-2">
              <label className="block ac-text-secondary text-sm mb-1">Address</label>
              <textarea className="ac-input w-full rounded-lg px-3 py-2 resize-none" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Residential address" />
            </div>
            <div>
              <label className="block ac-text-secondary text-sm mb-1">Monthly Salary (UGX)</label>
              <input type="number" className="ac-input w-full rounded-lg px-3 py-2" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 800000" />
            </div>
          </div>
        </div>
      </div>
      <ChangeTeacherPhoneModal
        open={changePhoneOpen}
        onClose={() => setChangePhoneOpen(false)}
        teacherId={teacherId}
        currentPhone={phone || null}
        onChanged={(newPhone) => setPhone(newPhone)}
      />
    </AdminPageWrapper>
  );
}
