import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { StudentsFetchResult } from '@/pages/admin/students/DesignStudentsPage';
import type { TeacherDirectoryRow, TeachersStats } from '@/pages/admin/teachers/DesignTeachersPage';
import type { ParentDirectoryRow, ParentsStats } from '@/pages/admin/parents/DesignParentsPage';
import type { FinanceDashboardData } from '@/pages/admin/finance/DesignFinanceDashboard';
import type { FetchOutstandingResult } from '@/pages/admin/finance/DesignOutstandingPage';

const PREFETCH_DELAY_MS = 800;

type PageKey = 'students' | 'teachers' | 'parents' | 'finance' | 'outstanding';

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

function subscribeSchool(schoolId: string, onChange: () => void) {
  const filter = `school_id=eq.${schoolId}`;
  const tables = ['students', 'teachers', 'parents', 'student_payments', 'school_expenses'] as const;
  const channels: RealtimeChannel[] = [];

  for (const table of tables) {
    const ch = supabase
      .channel(`pweza-speed-${table}-${schoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        () => {
          onChange();
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

    const channels = subscribeSchool(schoolId, () => {
      void get().prefetchAll();
    });
    set({ realtimeChannels: channels });
  },

  stopRealtime: () => {
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
    if (!userId) return;
    try {
      const [studentsContext, teachersDirectory, parentsDirectory, financeDashboard, outstanding] =
        await loadAllData(userId);
      set({
        studentsContext,
        teachersDirectory,
        parentsDirectory,
        financeDashboard,
        outstanding,
        prefetchDone: true,
      });
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
      } else if (page === 'teachers') {
        const { fetchTeachersDirectory } = await import('@/pages/admin/teachers/DesignTeachersPage');
        const teachersDirectory = await fetchTeachersDirectory(userId);
        set({ teachersDirectory });
      } else if (page === 'parents') {
        const { fetchParentsDirectory } = await import('@/pages/admin/parents/DesignParentsPage');
        const parentsDirectory = await fetchParentsDirectory(userId);
        set({ parentsDirectory });
      } else if (page === 'finance') {
        const { fetchFinanceDashboard } = await import('@/pages/admin/finance/DesignFinanceDashboard');
        const financeDashboard = await fetchFinanceDashboard(userId);
        set({ financeDashboard });
      } else if (page === 'outstanding') {
        const { fetchOutstandingData } = await import('@/pages/admin/finance/DesignOutstandingPage');
        const outstanding = await fetchOutstandingData(userId);
        set({ outstanding });
      }
    } catch (e) {
      console.error('[pwezaStore] refreshPage', page, e);
    }
  },
}));
