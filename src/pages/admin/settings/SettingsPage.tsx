import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

type TabKey = 'subjects' | 'assignments' | 'finance' | 'requirements' | 'timetable' | 'terms' | 'exams' | 'branding';

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
  const { user } = useAuthStore();
  const [tab, setTab] = useState<TabKey>('subjects');
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const { data } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!data?.school_id) return;
      const { data: sch } = await supabase.from('schools').select('type').eq('school_id', data.school_id).single();
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
  }, [user]);

  return (
    <AdminPageWrapper title="System Settings" subtitle="Configure school settings">
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(({ k, label }) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === k
                ? 'bg-white/20 text-white border border-white/20'
                : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`${adminCardClass}`}>
        {tab === 'subjects' && <p className="text-white/85">Configure subjects per class here.</p>}
        {tab === 'assignments' && <p className="text-white/85">Assign teachers to subjects and classes.</p>}
        {tab === 'finance' && <p className="text-white/85">Financial settings and fee structure.</p>}
        {tab === 'requirements' && <p className="text-white/85">School requirements and policies.</p>}
        {tab === 'timetable' && <p className="text-white/85">Timetable designer.</p>}
        {tab === 'terms' && <p className="text-white/85">Term settings and dates.</p>}
        {tab === 'exams' && <p className="text-white/85">Exam sets configuration.</p>}
        {tab === 'branding' && <p className="text-white/85">School branding and logo.</p>}
      </div>

      <div className={`${adminCardClass} mt-6`}>
        <div className="mb-2 font-medium text-white">Classes</div>
        {classOptions.length === 0 ? (
          <p className="text-white/70 text-sm">Classes will appear here after your school type is set.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {classOptions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => navigate(`/dashboard/admin/settings/classes/${encodeURIComponent(c)}`)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
