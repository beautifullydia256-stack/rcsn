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
    <AdminPageWrapper
      eyebrow="School setup"
      title="System Settings"
      subtitle="Configure school settings"
    >
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {TABS.map(({ k, label }) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-lg px-4 py-2.5 text-left text-sm transition-colors min-h-[44px] sm:min-h-0 ${
              tab === k
                ? 'border border-emerald-500/80 bg-emerald-600 text-white shadow-lg shadow-emerald-900/25 ring-1 ring-emerald-400/30 dark:bg-emerald-500/95 dark:shadow-emerald-950/40'
                : 'ac-glass-btn-secondary ac-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`${adminCardClass} overflow-x-auto p-4 sm:p-6`}>
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

      <div className={`${adminCardClass} mt-6 overflow-x-auto`}>
        <h3
          className="ac-text-primary mb-3 text-lg font-normal tracking-tight sm:text-xl"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          Classes
        </h3>
        {classOptions.length === 0 ? (
          <p className="text-sm ac-text-muted">
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
                className="ac-glass-btn-secondary min-h-[44px] rounded-lg px-3 py-2 text-sm ac-text-primary sm:min-h-0"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`${adminCardClass} mt-6`}>
        <h3
          className="ac-text-primary mb-3 text-lg font-normal tracking-tight sm:text-xl"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          Quick Management
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/exam-sets')}
            className="ac-glass-btn-secondary min-h-[44px] rounded-lg px-3 py-2 text-sm ac-text-primary sm:min-h-0"
          >
            Exam Sets
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/attendance')}
            className="ac-glass-btn-secondary min-h-[44px] rounded-lg px-3 py-2 text-sm ac-text-primary sm:min-h-0"
          >
            Attendance Records
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/outstanding')}
            className="ac-glass-btn-secondary min-h-[44px] rounded-lg px-3 py-2 text-sm ac-text-primary sm:min-h-0"
          >
            Finance Records
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/reports')}
            className="ac-glass-btn-secondary min-h-[44px] rounded-lg px-3 py-2 text-sm ac-text-primary sm:min-h-0"
          >
            Report Records
          </button>
        </div>
      </div>

    </AdminPageWrapper>
  );
}
