/** Stable TanStack Query keys for admin area — use with useQuery + pwezaStore setQueryData sync. */

export const adminQueryKeys = {
  teachersDesign: (userId: string) => ['admin', 'teachers-design', userId] as const,
  /** `discipline` must match `?discipline=` on the students list (default `all`). */
  studentsDesign: (userId: string, discipline: string = 'all') =>
    ['admin', 'students-design', userId, discipline] as const,
  parentsDesign: (userId: string) => ['admin', 'parents-design', userId] as const,
  financeDashboard: (userId: string) => ['admin', 'finance-dashboard', userId] as const,
  financeOutstanding: (userId: string, termId: string = 'all') => ['admin', 'finance-outstanding', userId, termId] as const,
  adminDashboardKpis: (schoolId: string) => ['admin', 'design-dashboard-kpis', schoolId] as const,
};
