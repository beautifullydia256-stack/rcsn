export const workforceQueryKeys = {
  leave: (userId: string) => ['admin', 'workforce', 'leave', userId] as const,
  recruitment: (userId: string) => ['admin', 'workforce', 'recruitment', userId] as const,
  onboarding: (userId: string) => ['admin', 'workforce', 'onboarding', userId] as const,
  performance: (userId: string) => ['admin', 'workforce', 'performance', userId] as const,
  performanceGoals: (schoolId: string, cycleId: string) =>
    ['admin', 'workforce', 'performance', 'goals', schoolId, cycleId] as const,
  payroll: (userId: string) => ['admin', 'workforce', 'payroll', userId] as const,
  payrollPayslips: (periodId: string) => ['admin', 'workforce', 'payroll', 'payslips', periodId] as const,
};
