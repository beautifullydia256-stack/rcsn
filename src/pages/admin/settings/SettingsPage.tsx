import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  adminSettingsSchoolRowQueryKey,
  ADMIN_SETTINGS_SCHOOL_ROW_STALE_MS,
  fetchAdminSettingsSchoolRow,
} from '@/lib/adminSettingsSchoolContext';
import { useAuthStore } from '@/store/authStore';
import { adminCardClass } from '@/components/layout/AdminPageWrapper';
import SettingsSubjectsPerClass from './tabs/SettingsSubjectsPerClass';
import SettingsTeacherSubjectClass from './tabs/SettingsTeacherSubjectClass';
import SettingsFinancial from './tabs/SettingsFinancial';
import SettingsSchoolRequirements from './tabs/SettingsSchoolRequirements';
import SettingsTimetable from './tabs/SettingsTimetable';
import SettingsTerms from './tabs/SettingsTerms';
import SettingsExamSets from './tabs/SettingsExamSets';
import SettingsBranding from './tabs/SettingsBranding';
import SettingsBiometric from './tabs/SettingsBiometric';
import SettingsEvents from './tabs/SettingsEvents';
import SettingsClassStreams from './tabs/SettingsClassStreams';
import SettingsMasterList from './components/SettingsMasterList';
import SettingsDetailLayout from './components/SettingsDetailLayout';
import {
  isSettingsTabKey,
  SETTINGS_LAST_SECTION_KEY,
  SETTINGS_SECTIONS,
  getSettingsSections,
  type SettingsTabKey,
} from './settingsNavConfig';
import { useSchoolType } from '@/hooks/useSchoolType';

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

function classOptionsFromSchoolType(type: string | null | undefined): string[] {
  if (type === 'Nursery/Primary') {
    const opts: string[] = ['Baby Class', 'Middle Class', 'Top Class'];
    for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    return opts;
  }
  if (type === 'Secondary') {
    const opts: string[] = [];
    for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
    return opts;
  }
  return [];
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { section } = useParams<{ section?: string }>();
  const isMd = useIsMd();

  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const setSchoolIdStore = useAuthStore((s) => s.setSchoolId);

  const effectiveSchoolId =
    schoolIdFromStore ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  /** If the session store has not rehydrated yet (rare), resolve once — same source as ProtectedRoute. */
  useEffect(() => {
    if (effectiveSchoolId) return;
    let cancelled = false;
    void (async () => {
      try {
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (cancelled || !u) return;
        const { data } = await supabase.from('users').select('school_id').eq('user_id', u.id).maybeSingle();
        const sid = data?.school_id;
        if (sid) setSchoolIdStore(sid);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveSchoolId, setSchoolIdStore]);

  const { data: schRow } = useQuery({
    queryKey: adminSettingsSchoolRowQueryKey(effectiveSchoolId ?? ''),
    queryFn: () => fetchAdminSettingsSchoolRow(effectiveSchoolId!),
    enabled: !!effectiveSchoolId,
    staleTime: ADMIN_SETTINGS_SCHOOL_ROW_STALE_MS,
  });

  const schoolId = effectiveSchoolId;

  const schoolProfile = useMemo(() => {
    if (!schRow) return null;
    return {
      name: schRow.name?.trim() || 'Your school',
      logoUrl: schRow.logo_url || null,
      subtitle: schRow.subtitle?.trim() || null,
    };
  }, [schRow]);

  const schoolType =
    schRow?.type === 'Nursery/Primary' || schRow?.type === 'Secondary'
      ? schRow.type
      : null;

  const classOptions = useMemo(() => classOptionsFromSchoolType(schoolType), [schoolType]);

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

  const { isTertiary } = useSchoolType();
  const sections = getSettingsSections(isTertiary);
  const sectionMeta = activeTab ? sections.find((s) => s.id === activeTab) : undefined;

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
                  <SettingsTeacherSubjectClass embedded classOptions={classOptions} schoolId={schoolId} />
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
                {activeTab === 'biometric' && <SettingsBiometric embedded schoolId={schoolId} />}
                {activeTab === 'events' && <SettingsEvents embedded schoolId={schoolId} />}
                {activeTab === 'streams' && (
                  <SettingsClassStreams embedded schoolId={schoolId} classOptions={classOptions} />
                )}
              </div>
            </SettingsDetailLayout>
          </section>
        )}
      </div>
    </div>
  );
}
