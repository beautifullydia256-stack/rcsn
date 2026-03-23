/** Stable TanStack Query keys for admin area — use with useQuery + pwezaStore setQueryData sync. */

export const adminQueryKeys = {
  teachersDesign: (userId: string) => ['admin', 'teachers-design', userId] as const,
  studentsDesign: (userId: string) => ['admin', 'students-design', userId] as const,
  parentsDesign: (userId: string) => ['admin', 'parents-design', userId] as const,
  financeDashboard: (userId: string) => ['admin', 'finance-dashboard', userId] as const,
  financeOutstanding: (userId: string) => ['admin', 'finance-outstanding', userId] as const,
  adminDashboardKpis: (schoolId: string) => ['admin', 'design-dashboard-kpis', schoolId] as const,
};
