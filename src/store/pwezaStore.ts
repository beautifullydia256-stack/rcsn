import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import type { StudentsFetchResult } from '@/pages/admin/students/DesignStudentsPage';
import type { TeacherDirectoryRow, TeachersStats } from '@/pages/admin/teachers/DesignTeachersPage';
import type { ParentDirectoryRow, ParentsStats } from '@/pages/admin/parents/DesignParentsPage';
import type { FinanceDashboardData } from '@/pages/admin/finance/DesignFinanceDashboard';
import type { FetchOutstandingResult } from '@/pages/admin/finance/DesignOutstandingPage';

const PREFETCH_DELAY_MS = 800;
/** Batch rapid realtime events; refresh only affected list slices (not full prefetch). */
const REALTIME_DEBOUNCE_MS = 900;

type PageKey = 'students' | 'teachers' | 'parents' | 'finance' | 'outstanding';

let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const realtimePendingTables = new Set<string>();

function clearRealtimeDebounce() {
  if (realtimeDebounceTimer) {
    clearTimeout(realtimeDebounceTimer);
    realtimeDebounceTimer = null;
  }
  realtimePendingTables.clear();
}

/** Map Supabase table names to which admin list slices should reload. */
function pagesForTables(tables: string[]): PageKey[] {
  const keys = new Set<PageKey>();
  for (const t of tables) {
    switch (t) {
      case 'students':
        keys.add('students');
        break;
      case 'teachers':
      case 'class_teachers':
      case 'teacher_class_subjects':
        keys.add('teachers');
        break;
      case 'parents':
        keys.add('parents');
        break;
      case 'student_payments':
        keys.add('finance');
        keys.add('outstanding');
        break;
      case 'school_expenses':
        keys.add('finance');
        break;
      default:
        break;
    }
  }
  return [...keys];
}

interface PwezaState {
  schoolId: string | null;
  userId: string | null;
  prefetchDone: boolean;
  studentsContext: StudentsFetchResult | null;
  teachersDirectory: { rows: TeacherDirectoryRow[]; stats: TeachersStats } | null;
  parentsDirectory: { rows: ParentDirectoryRow[]; stats: ParentsStats } | null;
  financeDashboard: FinanceDashboardData | null;
  outstanding: FetchOutstandingResult | null;
  realtimeChannels: RealtimeChannel[];
  prefetchTimer: ReturnType<typeof setTimeout> | null;

  init: (schoolId: string, userId: string) => void;
  stopRealtime: () => void;
  prefetchAll: () => Promise<void>;
  refreshPage: (page: PageKey) => Promise<void>;
  /** Refresh only list slices affected by these DB tables (used after debounced realtime). */
  refreshAfterRealtime: (tables: string[]) => Promise<void>;
  reset: () => void;
}

async function loadAllData(userId: string) {
  const [
    { fetchStudentsContext },
    { fetchTeachersDirectory },
    { fetchParentsDirectory },
    { fetchFinanceDashboard },
    { fetchOutstandingData },
  ] = await Promise.all([
    import('@/pages/admin/students/DesignStudentsPage'),
    import('@/pages/admin/teachers/DesignTeachersPage'),
    import('@/pages/admin/parents/DesignParentsPage'),
    import('@/pages/admin/finance/DesignFinanceDashboard'),
    import('@/pages/admin/finance/DesignOutstandingPage'),
  ]);

  return Promise.all([
    fetchStudentsContext(userId),
    fetchTeachersDirectory(userId),
    fetchParentsDirectory(userId),
    fetchFinanceDashboard(userId),
    fetchOutstandingData(userId),
  ]);
}

function subscribeSchool(schoolId: string, onTableEvent: (table: string) => void) {
  const filter = `school_id=eq.${schoolId}`;
  const tables = [
    'students',
    'teachers',
    'parents',
    'student_payments',
    'school_expenses',
    'class_teachers',
    'teacher_class_subjects',
  ] as const;
  const channels: RealtimeChannel[] = [];

  for (const table of tables) {
    const ch = supabase
      .channel(`pweza-speed-${table}-${schoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        () => {
          onTableEvent(table);
        }
      )
      .subscribe();
    channels.push(ch);
  }

  return channels;
}

export const usePwezaStore = create<PwezaState>((set, get) => ({
  schoolId: null,
  userId: null,
  prefetchDone: false,
  studentsContext: null,
  teachersDirectory: null,
  parentsDirectory: null,
  financeDashboard: null,
  outstanding: null,
  realtimeChannels: [],
  prefetchTimer: null,

  reset: () => {
    clearRealtimeDebounce();
    const t = get().prefetchTimer;
    if (t) clearTimeout(t);
    get().stopRealtime();
    set({
      schoolId: null,
      userId: null,
      prefetchDone: false,
      studentsContext: null,
      teachersDirectory: null,
      parentsDirectory: null,
      financeDashboard: null,
      outstanding: null,
      prefetchTimer: null,
    });
  },

  init: (schoolId: string, userId: string) => {
    clearRealtimeDebounce();
    const prev = get().prefetchTimer;
    if (prev) clearTimeout(prev);
    get().stopRealtime();

    set({
      schoolId,
      userId,
      prefetchDone: false,
      studentsContext: null,
      teachersDirectory: null,
      parentsDirectory: null,
      financeDashboard: null,
      outstanding: null,
    });

    const timer = setTimeout(() => {
      void get().prefetchAll();
    }, PREFETCH_DELAY_MS);
    set({ prefetchTimer: timer });

    const channels = subscribeSchool(schoolId, (table) => {
      realtimePendingTables.add(table);
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      realtimeDebounceTimer = setTimeout(() => {
        const batch = [...realtimePendingTables];
        realtimePendingTables.clear();
        realtimeDebounceTimer = null;
        void get().refreshAfterRealtime(batch);
      }, REALTIME_DEBOUNCE_MS);
    });
    set({ realtimeChannels: channels });
  },

  stopRealtime: () => {
    clearRealtimeDebounce();
    const channels = get().realtimeChannels;
    for (const ch of channels) {
      void supabase.removeChannel(ch);
    }
    const t = get().prefetchTimer;
    if (t) clearTimeout(t);
    set({ realtimeChannels: [], prefetchTimer: null });
  },

  prefetchAll: async () => {
    const userId = get().userId;
    const schoolId = get().schoolId;
    if (!userId) return;
    // Already warmed after login — avoid re-fetching all slices on every sidebar hover (causes full-page "reload" on list UIs).
    if (get().prefetchDone) return;
    try {
      const [[studentsContext, teachersDirectory, parentsDirectory, financeDashboard, outstanding], adminKpis] =
        await Promise.all([
          loadAllData(userId),
          schoolId
            ? import('@/pages/admin/api/fetchAdminDesignDashboardKpis').then(({ fetchAdminDesignDashboardKpis }) =>
                fetchAdminDesignDashboardKpis(schoolId)
              )
            : Promise.resolve(null),
        ]);
      set({
        studentsContext,
        teachersDirectory,
        parentsDirectory,
        financeDashboard,
        outstanding,
        prefetchDone: true,
      });
      queryClient.setQueryData(adminQueryKeys.studentsDesign(userId), studentsContext);
      queryClient.setQueryData(adminQueryKeys.teachersDesign(userId), teachersDirectory);
      queryClient.setQueryData(adminQueryKeys.parentsDesign(userId), parentsDirectory);
      queryClient.setQueryData(adminQueryKeys.financeDashboard(userId), financeDashboard);
      queryClient.setQueryData(adminQueryKeys.financeOutstanding(userId), outstanding);
      if (schoolId && adminKpis) {
        queryClient.setQueryData(adminQueryKeys.adminDashboardKpis(schoolId), adminKpis);
      }
    } catch (e) {
      console.error('[pwezaStore] prefetchAll failed', e);
    }
  },

  refreshPage: async (page: PageKey) => {
    const userId = get().userId;
    if (!userId) return;
    try {
      if (page === 'students') {
        const { fetchStudentsContext } = await import('@/pages/admin/students/DesignStudentsPage');
        const studentsContext = await fetchStudentsContext(userId);
        set({ studentsContext });
        queryClient.setQueryData(adminQueryKeys.studentsDesign(userId), studentsContext);
      } else if (page === 'teachers') {
        const { fetchTeachersDirectory } = await import('@/pages/admin/teachers/DesignTeachersPage');
        const teachersDirectory = await fetchTeachersDirectory(userId);
        set({ teachersDirectory });
        queryClient.setQueryData(adminQueryKeys.teachersDesign(userId), teachersDirectory);
      } else if (page === 'parents') {
        const { fetchParentsDirectory } = await import('@/pages/admin/parents/DesignParentsPage');
        const parentsDirectory = await fetchParentsDirectory(userId);
        set({ parentsDirectory });
        queryClient.setQueryData(adminQueryKeys.parentsDesign(userId), parentsDirectory);
      } else if (page === 'finance') {
        const { fetchFinanceDashboard } = await import('@/pages/admin/finance/DesignFinanceDashboard');
        const financeDashboard = await fetchFinanceDashboard(userId);
        set({ financeDashboard });
        queryClient.setQueryData(adminQueryKeys.financeDashboard(userId), financeDashboard);
      } else if (page === 'outstanding') {
        const { fetchOutstandingData } = await import('@/pages/admin/finance/DesignOutstandingPage');
        const outstanding = await fetchOutstandingData(userId);
        set({ outstanding });
        queryClient.setQueryData(adminQueryKeys.financeOutstanding(userId), outstanding);
      }
    } catch (e) {
      console.error('[pwezaStore] refreshPage', page, e);
    }
  },

  refreshAfterRealtime: async (tables: string[]) => {
    const userId = get().userId;
    if (!userId || tables.length === 0) return;
    const pages = pagesForTables(tables);
    if (pages.length === 0) return;
    await Promise.all(pages.map((p) => get().refreshPage(p)));
    const schoolId = get().schoolId;
    if (schoolId) {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.adminDashboardKpis(schoolId) });
    }
  },
}));
