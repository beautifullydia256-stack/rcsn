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
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                ? 'border border-green-500 bg-green-600 text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
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
        <div className="mb-2 font-medium text-gray-900">Classes</div>
        {classOptions.length === 0 ? (
          <p className="text-sm text-gray-500">
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
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`${adminCardClass} mt-6`}>
        <div className="mb-2 font-medium text-gray-900">Quick Management</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/exam-sets')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Exam Sets
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/attendance')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Attendance Records
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/outstanding')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Finance Records
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/reports')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Report Records
          </button>
        </div>
      </div>

    </AdminPageWrapper>
  );
}
