import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  User,
  UserCheck,
  UserX,
  Users,
  Layers,
  ArrowLeft,
  School,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, SORA, INTER } from '../../../styles/posThemeTokens';

export default function ClassDetailPage() {
  const navigate = useNavigate();
  const { className } = useParams<{ className: string }>();
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const decodedName = className ? decodeURIComponent(className) : '';

  const [currentTeacher, setCurrentTeacher] = useState<{ teacher_id: string; name: string } | null>(null);
  const [teachers, setTeachers] = useState<{ teacher_id: string; name: string }[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Fetch class students and streams for extra insight
  const { data: classMeta, isLoading: metaLoading } = useQuery({
    queryKey: ['admin', 'class-detail-meta', schoolId, decodedName],
    queryFn: async () => {
      if (!schoolId || !decodedName) return { students: [], streams: [] };
      const [studentsRes, streamsRes] = await Promise.all([
        supabase
          .from('students')
          .select('student_id, name, admission_number')
          .eq('school_id', schoolId)
          .eq('current_class', decodedName)
          .order('name'),
        supabase
          .from('class_streams')
          .select('stream_name')
          .eq('school_id', schoolId)
          .eq('class_name', decodedName),
      ]);
      return {
        students: studentsRes.data || [],
        streams: (streamsRes.data || []).map((s) => s.stream_name).filter(Boolean),
      };
    },
    enabled: Boolean(schoolId && decodedName),
  });

  useEffect(() => {
    if (!schoolId || !decodedName) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [ctRes, teachersRes] = await Promise.all([
        supabase
          .from('class_teachers')
          .select('teacher_id')
          .eq('school_id', schoolId)
          .eq('class_name', decodedName)
          .maybeSingle(),
        supabase.from('teachers').select('teacher_id, name').eq('school_id', schoolId).order('name'),
      ]);
      if (cancelled) return;

      const ct = !ctRes.error ? (ctRes.data as { teacher_id?: string } | null) : null;
      const teachersList = (teachersRes.data || []) as { teacher_id: string; name: string }[];
      setTeachers(teachersList);

      if (ct?.teacher_id) {
        const found = teachersList.find((x) => x.teacher_id === ct.teacher_id);
        setCurrentTeacher(found ? { teacher_id: found.teacher_id, name: found.name } : { teacher_id: ct.teacher_id, name: '—' });
      } else {
        setCurrentTeacher(null);
      }
      setSelectedTeacherId('');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [schoolId, decodedName]);

  const assignClassTeacher = async () => {
    if (!schoolId || !selectedTeacherId || !decodedName) return;
    setSaving(true);
    setFeedback(null);
    try {
      const { error } = await supabase.from('class_teachers').upsert(
        { school_id: schoolId, class_name: decodedName, teacher_id: selectedTeacherId },
        { onConflict: 'school_id,class_name' }
      );
      if (error) throw error;
      const found = teachers.find((x) => x.teacher_id === selectedTeacherId);
      setCurrentTeacher(found ? { teacher_id: found.teacher_id, name: found.name } : { teacher_id: selectedTeacherId, name: '—' });
      setSelectedTeacherId('');
      setFeedback({ type: 'ok', text: 'Class teacher successfully designated.' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'classes-redesign'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'classes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    } catch (e: any) {
      setFeedback({ type: 'err', text: e?.message || 'Failed to assign class teacher' });
    } finally {
      setSaving(false);
    }
  };

  const removeClassTeacher = async () => {
    if (!schoolId || !decodedName) return;
    if (!confirm(`Remove class teacher assignment from ${decodedName}?`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      const { error } = await supabase
        .from('class_teachers')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_name', decodedName);
      if (error) throw error;
      setCurrentTeacher(null);
      setFeedback({ type: 'ok', text: 'Class teacher assignment removed.' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'classes-redesign'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'classes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    } catch (e: any) {
      setFeedback({ type: 'err', text: e?.message || 'Failed to remove class teacher' });
    } finally {
      setSaving(false);
    }
  };

  const students = classMeta?.students || [];
  const streams = classMeta?.streams || [];

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 transition-colors"
      style={{ background: t.screenBg, color: t.textHi, fontFamily: INTER }}
    >
      {/* BREADCRUMB & BACK ACTION */}
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: t.textMid }}>
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/settings/classes')}
          className="flex items-center gap-1.5 hover:underline"
          style={{ color: t.mint }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Class Management</span>
        </button>
        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
        <span style={{ color: t.textHi }}>{decodedName}</span>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: t.mint }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: t.mint }}>
              Grade Cohort Configuration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: t.textHi, fontFamily: SORA }}>
            {decodedName}
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMid }}>
            Manage head tutor designation, monitor student enrollment capacity, and oversee active cohort streams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/students/stream-allocation')}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all border shadow-sm hover:scale-[1.01]"
            style={{ background: t.panel, borderColor: t.stroke, color: t.textHi }}
          >
            <Layers className="h-4 w-4" style={{ color: t.blue }} />
            <span>Manage Streams</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {feedback && (
        <div
          className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border"
          style={{
            background: feedback.type === 'ok' ? t.mintDim : t.redDim,
            borderColor: feedback.type === 'ok' ? t.mintRing : t.red,
            color: feedback.type === 'ok' ? t.mint : t.red,
          }}
        >
          {feedback.type === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TOP SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl p-5 border shadow-sm" style={{ background: t.panel, borderColor: t.stroke }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              Enrolled Students
            </span>
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: t.blueDim, color: t.blue }}>
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.textHi, fontFamily: SORA }}>
            {metaLoading ? '…' : students.length}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            Learners enrolled in this class
          </p>
        </div>

        <div className="rounded-2xl p-5 border shadow-sm" style={{ background: t.panel, borderColor: t.stroke }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              Class Teacher
            </span>
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: currentTeacher ? t.mintDim : t.redDim, color: currentTeacher ? t.mint : t.red }}>
              {currentTeacher ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
            </div>
          </div>
          <div className="text-lg font-bold mt-2 truncate" style={{ color: currentTeacher ? t.mint : t.red, fontFamily: SORA }}>
            {loading ? '…' : currentTeacher ? currentTeacher.name : 'Not Assigned'}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            {currentTeacher ? 'Primary report signature author' : 'Action required'}
          </p>
        </div>

        <div className="rounded-2xl p-5 border shadow-sm" style={{ background: t.panel, borderColor: t.stroke }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              Active Streams
            </span>
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: t.goldDim, color: t.gold }}>
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.gold, fontFamily: SORA }}>
            {metaLoading ? '…' : streams.length}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            {streams.length > 0 ? streams.join(', ') : 'Single unified cohort'}
          </p>
        </div>
      </div>

      {/* CLASS TEACHER DESIGNATION WORKSPACE */}
      <div className="rounded-2xl p-5 sm:p-6 border shadow-sm space-y-4" style={{ background: t.panel, borderColor: t.stroke }}>
        <div>
          <h3 className="text-base font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
            Designate Class Teacher
          </h3>
          <p className="text-xs mt-0.5" style={{ color: t.textMid }}>
            The designated class teacher automatically authors student terminal progress comments and oversees daily attendance records for {decodedName}.
          </p>
        </div>

        {loading ? (
          <div className="py-6 text-xs text-center animate-pulse" style={{ color: t.textMid }}>
            Loading staff roster…
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Current Teacher Badge */}
            {currentTeacher && (
              <div
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border"
                style={{ background: t.fieldBg, borderColor: t.stroke }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs"
                    style={{ background: t.mintDim, color: t.mint }}
                  >
                    {currentTeacher.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color: t.textHi }}>
                      {currentTeacher.name}
                    </div>
                    <div className="text-[10px]" style={{ color: t.mint }}>
                      Active Designated Class Teacher
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={removeClassTeacher}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border disabled:opacity-40"
                  style={{ background: t.redDim, borderColor: t.red, color: t.red }}
                >
                  {saving ? 'Removing…' : 'Remove Assignment'}
                </button>
              </div>
            )}

            {/* Change / Assign Select */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-xl">
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textLow }}>
                  {currentTeacher ? 'Reassign to another teacher' : 'Select teacher to assign'}
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none transition-all"
                  style={{
                    background: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                >
                  <option value="">— Choose a teacher from staff roster —</option>
                  {teachers.map((teach) => (
                    <option key={teach.teacher_id} value={teach.teacher_id}>
                      {teach.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={assignClassTeacher}
                disabled={saving || !selectedTeacherId}
                className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                  color: t.ctaText,
                }}
              >
                {saving ? 'Saving…' : currentTeacher ? 'Reassign Teacher' : 'Assign Teacher'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ENROLLED LEARNERS ROSTER PREVIEW */}
      <div className="rounded-2xl p-5 sm:p-6 border shadow-sm space-y-4" style={{ background: t.panel, borderColor: t.stroke }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              Learners Enrolled ({students.length})
            </h3>
            <p className="text-xs mt-0.5" style={{ color: t.textMid }}>
              Registered students actively assigned to this class cohort.
            </p>
          </div>

          <Link
            to="/dashboard/admin/students"
            className="flex items-center gap-1.5 text-xs font-bold hover:underline"
            style={{ color: t.mint }}
          >
            <span>View All in Directory</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {metaLoading ? (
          <div className="py-8 text-center text-xs animate-pulse" style={{ color: t.textMid }}>
            Loading student roster…
          </div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center text-xs" style={{ color: t.textLow }}>
            No students are currently enrolled in {decodedName}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 max-h-96 overflow-y-auto pr-1">
            {students.map((st) => (
              <div
                key={st.student_id}
                className="flex items-center justify-between p-3 rounded-xl border text-xs"
                style={{ background: t.fieldBg, borderColor: t.stroke }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                    style={{ background: t.mintDim, color: t.mint }}
                  >
                    {st.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ color: t.textHi }}>
                      {st.name}
                    </div>
                    <div className="text-[10px]" style={{ color: t.textLow }}>
                      {st.admission_number || 'No LIN / Reg'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
