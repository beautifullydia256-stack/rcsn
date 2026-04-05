import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { User, UserPlus } from 'lucide-react';

export default function ClassDetailPage() {
  const navigate = useNavigate();
  const { className } = useParams<{ className: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const decodedName = className ? decodeURIComponent(className) : '';

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<{ teacher_id: string; name: string } | null>(null);
  const [teachers, setTeachers] = useState<{ teacher_id: string; name: string }[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id || !decodedName) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id || cancelled) return;
      setSchoolId(u.school_id);

      const [ctRes, teachersRes] = await Promise.all([
        supabase
          .from('class_teachers')
          .select('teacher_id')
          .eq('school_id', u.school_id)
          .eq('class_name', decodedName)
          .maybeSingle(),
        supabase.from('teachers').select('teacher_id, name').eq('school_id', u.school_id).order('name'),
      ]);
      if (cancelled) return;

      const ct = !ctRes.error ? (ctRes.data as { teacher_id?: string } | null) : null;
      const teachersList = (teachersRes.data || []) as { teacher_id: string; name: string }[];
      setTeachers(teachersList);

      if (ct?.teacher_id) {
        const t = teachersList.find((x) => x.teacher_id === ct.teacher_id);
        setCurrentTeacher(t ? { teacher_id: t.teacher_id, name: t.name } : { teacher_id: ct.teacher_id, name: '—' });
      } else {
        setCurrentTeacher(null);
      }
      setSelectedTeacherId('');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, decodedName]);

  const assignClassTeacher = async () => {
    if (!schoolId || !selectedTeacherId || !decodedName) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('class_teachers').upsert(
        { school_id: schoolId, class_name: decodedName, teacher_id: selectedTeacherId },
        { onConflict: 'school_id,class_name' }
      );
      if (error) throw error;
      const t = teachers.find((x) => x.teacher_id === selectedTeacherId);
      setCurrentTeacher(t ? { teacher_id: t.teacher_id, name: t.name } : { teacher_id: selectedTeacherId, name: '—' });
      setSelectedTeacherId('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'classes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });
    } catch (e: any) {
      alert(e?.message || 'Failed to assign class teacher');
    } finally {
      setSaving(false);
    }
  };

  const removeClassTeacher = async () => {
    if (!schoolId || !decodedName) return;
    if (!confirm(`Remove class teacher from ${decodedName}?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('class_teachers')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_name', decodedName);
      if (error) throw error;
      setCurrentTeacher(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'classes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });
    } catch (e: any) {
      alert(e?.message || 'Failed to remove class teacher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageWrapper
      title={decodedName ? `Class: ${decodedName}` : 'Class'}
      subtitle="Manage class settings and assign class teacher"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/settings/classes')}
          className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Classes
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/settings')}
          className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Settings
        </button>
      </div>

      <div className={`${adminCardClass} space-y-6`}>
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold ac-text-primary">
            <User className="h-5 w-5 ac-text-secondary" />
            Class teacher
          </h3>
          <p className="mb-4 text-sm ac-text-secondary">
            The class teacher is used on the students list and on reports (e.g. Class Teacher&apos;s Comment). Assign from here or from the teacher&apos;s profile.
          </p>
          {loading ? (
            <div className="ac-text-muted">Loading…</div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              {currentTeacher ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--pw-border)] bg-[var(--pw-s2)] px-4 py-3">
                  <span className="font-medium ac-text-primary">{currentTeacher.name}</span>
                  <button
                    type="button"
                    onClick={removeClassTeacher}
                    disabled={saving}
                    className="rounded-lg border border-red-400/50 bg-red-500/20 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {saving ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ) : (
                <span className="ac-text-muted">No class teacher assigned</span>
              )}
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="ac-input min-h-[44px] min-w-0 shrink-0 focus:ring-2 focus:ring-[var(--pw-teal)]/40 sm:min-w-[200px]"
                >
                  <option value="">Select teacher…</option>
                  {teachers
                    .filter((t) => t.teacher_id !== currentTeacher?.teacher_id)
                    .map((t) => (
                      <option key={t.teacher_id} value={t.teacher_id}>
                        {t.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={assignClassTeacher}
                  disabled={saving || !selectedTeacherId}
                  className="flex items-center gap-2 rounded-xl border border-green-400/40 bg-green-600/30 px-4 py-2 text-sm font-medium text-white hover:bg-green-600/50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <UserPlus className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Assign'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminPageWrapper>
  );
}
