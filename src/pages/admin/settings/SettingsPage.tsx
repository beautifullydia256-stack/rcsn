import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { adminCardClass } from '@/components/layout/AdminPageWrapper';
import SettingsSubjectsPerClass from './tabs/SettingsSubjectsPerClass';
import SettingsTeacherSubjectClass from './tabs/SettingsTeacherSubjectClass';
import SettingsFinancial from './tabs/SettingsFinancial';
import SettingsSchoolRequirements from './tabs/SettingsSchoolRequirements';
import SettingsTimetable from './tabs/SettingsTimetable';
import SettingsTerms from './tabs/SettingsTerms';
import SettingsExamSets from './tabs/SettingsExamSets';
import SettingsBranding from './tabs/SettingsBranding';
import SettingsMasterList from './components/SettingsMasterList';
import SettingsDetailLayout from './components/SettingsDetailLayout';
import {
  isSettingsTabKey,
  SETTINGS_LAST_SECTION_KEY,
  SETTINGS_SECTIONS,
  type SettingsTabKey,
} from './settingsNavConfig';

const MD_QUERY = '(min-width: 768px)';

function useIsMd() {
  const [isMd, setIsMd] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MD_QUERY).matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const update = () => setIsMd(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMd;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { section } = useParams<{ section?: string }>();
  const isMd = useIsMd();

  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<{
    name: string;
    logoUrl: string | null;
    subtitle: string | null;
  } | null>(null);

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
        .select('type, name, logo_url, subtitle')
        .eq('school_id', data.school_id)
        .single();
      if (sch) {
        const row = sch as {
          type?: string;
          name?: string;
          logo_url?: string | null;
          subtitle?: string | null;
        };
        setSchoolProfile({
          name: row.name?.trim() || 'Your school',
          logoUrl: row.logo_url || null,
          subtitle: row.subtitle?.trim() || null,
        });
      }
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

  useEffect(() => {
    if (section && !isSettingsTabKey(section)) {
      navigate('/dashboard/admin/settings/subjects', { replace: true });
    }
  }, [section, navigate]);

  useEffect(() => {
    if (section && isSettingsTabKey(section)) {
      try {
        sessionStorage.setItem(SETTINGS_LAST_SECTION_KEY, section);
      } catch {
        /* ignore */
      }
    }
  }, [section]);

  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const redirectIfDesktopHub = () => {
      if (!mq.matches) return;
      const path = location.pathname.replace(/\/$/, '');
      if (path.endsWith('/dashboard/admin/settings')) {
        let target: SettingsTabKey = 'subjects';
        try {
          const last = sessionStorage.getItem(SETTINGS_LAST_SECTION_KEY);
          if (last && isSettingsTabKey(last)) target = last;
        } catch {
          /* ignore */
        }
        navigate(`/dashboard/admin/settings/${target}`, { replace: true });
      }
    };
    redirectIfDesktopHub();
    mq.addEventListener('change', redirectIfDesktopHub);
    return () => mq.removeEventListener('change', redirectIfDesktopHub);
  }, [navigate, location.pathname]);

  const activeTab: SettingsTabKey | null =
    section && isSettingsTabKey(section) ? section : isMd ? 'subjects' : null;

  const isMobileDetail = !isMd && !!section && isSettingsTabKey(section);
  const showMaster = isMd || !section;
  const showDetail = activeTab !== null;

  const sectionMeta = activeTab ? SETTINGS_SECTIONS.find((s) => s.id === activeTab) : undefined;

  const goSection = (id: SettingsTabKey) => {
    try {
      sessionStorage.setItem(SETTINGS_LAST_SECTION_KEY, id);
    } catch {
      /* ignore */
    }
    navigate(`/dashboard/admin/settings/${id}`);
  };

  const goExtras = (to: string) => navigate(to);

  const onBackMobile = () => navigate('/dashboard/admin/settings');

  return (
    <div className="admin-terminal-page md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden">
      <div className="flex w-full max-w-full flex-col gap-0 max-md:min-h-0 md:h-full md:min-h-0 md:flex-1 md:flex-row md:gap-8 md:items-stretch md:overflow-hidden">
        <aside
          className={`md:w-[min(100%,340px)] md:shrink-0 md:min-h-0 md:overflow-y-auto md:overscroll-y-contain ${
            showMaster ? '' : 'hidden'
          }`}
          aria-hidden={!showMaster}
        >
          <h2 className="mb-4 px-0.5 text-[28px] font-bold tracking-tight text-slate-900 dark:text-[#e8eeff] md:text-[22px]">
            Settings
          </h2>
          <SettingsMasterList
            activeSection={activeTab}
            onSelectSection={goSection}
            onNavigate={goExtras}
            schoolProfile={schoolProfile}
            onSchoolProfileClick={() => goSection('branding')}
          />
        </aside>

        {showDetail && activeTab && sectionMeta && (
          <section
            className={`flex min-w-0 flex-col max-md:flex-none max-md:min-h-0 md:min-h-0 md:flex-1 md:overflow-hidden md:overscroll-y-contain ${
              !isMd && !section ? 'hidden' : ''
            }`}
            aria-label={sectionMeta.title}
          >
            <SettingsDetailLayout
              title={sectionMeta.title}
              subtitle={sectionMeta.description}
              showMobileChrome={isMobileDetail}
              onBack={onBackMobile}
            >
              <div className={`${adminCardClass} overflow-x-auto p-4 sm:p-6`}>
                {activeTab === 'subjects' && (
                  <>
                    <SettingsSubjectsPerClass
                      embedded
                      classOptions={classOptions}
                      schoolId={schoolId}
                    />
                  </>
                )}
                {activeTab === 'assignments' && (
                  <SettingsTeacherSubjectClass embedded classOptions={classOptions} />
                )}
                {activeTab === 'finance' && (
                  <SettingsFinancial embedded schoolId={schoolId} classes={classOptions} />
                )}
                {activeTab === 'requirements' && (
                  <SettingsSchoolRequirements
                    embedded
                    schoolId={schoolId}
                    classOptionsFallback={classOptions}
                  />
                )}
                {activeTab === 'timetable' && (
                  <SettingsTimetable embedded classOptions={classOptions} schoolId={schoolId} />
                )}
                {activeTab === 'terms' && <SettingsTerms embedded schoolId={schoolId} />}
                {activeTab === 'exams' && (
                  <SettingsExamSets
                    embedded
                    classOptions={classOptions}
                    schoolId={schoolId}
                    schoolType={schoolType}
                  />
                )}
                {activeTab === 'branding' && <SettingsBranding embedded schoolId={schoolId} />}
              </div>
            </SettingsDetailLayout>
          </section>
        )}
      </div>
    </div>
  );
}
