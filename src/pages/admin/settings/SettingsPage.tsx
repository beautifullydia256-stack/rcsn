import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import LocationSettingsWidget from '@/components/LocationSettingsWidget';
import SettingsSubjectsPerClass from './tabs/SettingsSubjectsPerClass';
import SettingsTeacherSubjectClass from './tabs/SettingsTeacherSubjectClass';
import SettingsFinancial from './tabs/SettingsFinancial';
import SettingsSchoolRequirements from './tabs/SettingsSchoolRequirements';
import SettingsTimetable from './tabs/SettingsTimetable';
import SettingsTerms from './tabs/SettingsTerms';
import SettingsExamSets from './tabs/SettingsExamSets';
import SettingsBranding from './tabs/SettingsBranding';

type TabKey =
  | 'subjects'
  | 'assignments'
  | 'finance'
  | 'requirements'
  | 'timetable'
  | 'terms'
  | 'exams'
  | 'branding';

const TABS: { k: TabKey; label: string }[] = [
  { k: 'subjects', label: 'Subjects per Class' },
  { k: 'assignments', label: 'Teacher ↔ Subject ↔ Class' },
  { k: 'finance', label: 'Financial Settings' },
  { k: 'requirements', label: 'School Requirements' },
  { k: 'timetable', label: 'Timetable Designer' },
  { k: 'terms', label: 'Term Settings' },
  { k: 'exams', label: 'Exam Sets' },
  { k: 'branding', label: 'School Branding' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('subjects');
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();
      if (!data?.school_id) return;
      setSchoolId(data.school_id);
      const { data: sch } = await supabase
        .from('schools')
        .select('type')
        .eq('school_id', data.school_id)
        .single();
      if (sch?.type) {
        setSchoolType(sch.type as 'Nursery/Primary' | 'Secondary');
        const opts: string[] = [];
        if (sch.type === 'Nursery/Primary') {
          opts.push('Baby Class', 'Middle Class', 'Top Class');
          for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
        } else if (sch.type === 'Secondary') {
          for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
        }
        setClassOptions(opts);
      }
    };
    run();
  }, []);

  return (
    <AdminPageWrapper title="System Settings" subtitle="Configure school settings">
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ k, label }) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              tab === k
                ? 'border border-white/20 bg-white/20 text-white'
                : 'border border-white/10 bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`${adminCardClass} p-4`}>
        {tab === 'subjects' && (
          <SettingsSubjectsPerClass classOptions={classOptions} schoolId={schoolId} />
        )}
        {tab === 'assignments' && <SettingsTeacherSubjectClass classOptions={classOptions} />}
        {tab === 'finance' && (
          <SettingsFinancial schoolId={schoolId} classes={classOptions} />
        )}
        {tab === 'requirements' && (
          <SettingsSchoolRequirements
            schoolId={schoolId}
            classOptionsFallback={classOptions}
          />
        )}
        {tab === 'timetable' && (
          <SettingsTimetable classOptions={classOptions} schoolId={schoolId} />
        )}
        {tab === 'terms' && <SettingsTerms schoolId={schoolId} />}
        {tab === 'exams' && (
          <SettingsExamSets
            classOptions={classOptions}
            schoolId={schoolId}
            schoolType={schoolType}
          />
        )}
        {tab === 'branding' && <SettingsBranding schoolId={schoolId} />}
      </div>

      <LocationSettingsWidget />

      <div className={`${adminCardClass} mt-6`}>
        <div className="mb-2 font-medium text-white">Classes</div>
        {classOptions.length === 0 ? (
          <p className="text-sm text-white/70">
            Classes will appear here after your school type is set.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {classOptions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  navigate(`/dashboard/admin/settings/classes/${encodeURIComponent(c)}`)
                }
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`${adminCardClass} mt-6`}>
        <div className="mb-2 font-medium text-white">Quick Management</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/exam-sets')}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
          >
            Exam Sets
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/attendance')}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
          >
            Attendance Records
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/outstanding')}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
          >
            Finance Records
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/reports')}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
          >
            Report Records
          </button>
        </div>
      </div>

      <div className={`${adminCardClass} mt-6`}>
        <div className="mb-2 font-medium text-white">Term 3 Rollover</div>
        <div className="mb-3 text-sm text-white/80">
          Promote classes, graduate candidates (
          {schoolType === 'Nursery/Primary' ? 'P7' : 'S4/S6'}) to Old Students, and remove their
          logins.
        </div>
        <button
          type="button"
          disabled={!schoolId}
          onClick={async () => {
            if (!schoolId) return;
            try {
              const resp = await fetch('/api/admin/term-rollover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ school_id: schoolId }),
              });
              const j = await resp.json();
              if (!resp.ok) {
                alert(j.error || 'Failed to check rollover status');
              } else {
                if (j.rollover_completed) {
                  alert(
                    `✅ ${j.message}\n\n📊 Results:\n• Students Graduated: ${j.students_graduated}\n• Students Promoted: ${j.students_promoted}\n• Academic Year: ${j.academic_year}${j.manually_triggered ? '\n• Manually Triggered: Yes' : '\n• Automatically Completed'}`
                  );
                } else {
                  alert(`ℹ️ ${j.message}`);
                }
              }
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Request failed');
            }
          }}
          className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Check Rollover Status
        </button>
      </div>
    </AdminPageWrapper>
  );
}
