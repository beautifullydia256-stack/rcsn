import { Link } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { CalendarDays, DollarSign, Kanban, ClipboardList, Award } from 'lucide-react';

const cardBase =
  'ac-glass-card p-5 flex flex-col gap-2 transition hover:border-blue-500/30 hover:bg-white/5 border border-white/10';

export default function WorkforceHomePage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const canPay = usePermission(PERMISSION_KEYS.hrPayroll);

  return (
    <AdminPageWrapper
      eyebrow="School workforce"
      title="Workforce & HR"
      subtitle="Leave, hiring pipeline, onboarding, performance, and payroll in one place. Access follows Access and permissions (hr.manage, hr.payroll)."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canHr && (
          <>
            <Link to="/dashboard/admin/workforce/leave" className={cardBase}>
              <div className="flex items-center gap-2 text-emerald-400">
                <CalendarDays className="h-5 w-5" />
                <span className="text-sm font-semibold text-slate-100">Leave</span>
              </div>
              <p className="text-xs text-slate-400">Types, balances, requests, and approvals.</p>
            </Link>
            <Link to="/dashboard/admin/workforce/recruitment" className={cardBase}>
              <div className="flex items-center gap-2 text-sky-400">
                <Kanban className="h-5 w-5" />
                <span className="text-sm font-semibold text-slate-100">Recruitment</span>
              </div>
              <p className="text-xs text-slate-400">Applications per job and pipeline status.</p>
            </Link>
            <Link to="/dashboard/admin/workforce/onboarding" className={cardBase}>
              <div className="flex items-center gap-2 text-violet-400">
                <ClipboardList className="h-5 w-5" />
                <span className="text-sm font-semibold text-slate-100">Onboarding</span>
              </div>
              <p className="text-xs text-slate-400">Templates and active onboarding runs.</p>
            </Link>
            <Link to="/dashboard/admin/workforce/performance" className={cardBase}>
              <div className="flex items-center gap-2 text-amber-400">
                <Award className="h-5 w-5" />
                <span className="text-sm font-semibold text-slate-100">Performance</span>
              </div>
              <p className="text-xs text-slate-400">Review cycles, goals, and staff reviews.</p>
            </Link>
          </>
        )}
        {canPay && (
          <Link to="/dashboard/admin/workforce/payroll" className={cardBase}>
            <div className="flex items-center gap-2 text-emerald-300">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-semibold text-slate-100">Payroll</span>
            </div>
            <p className="text-xs text-slate-400">Pay periods, payslips, and net pay.</p>
          </Link>
        )}
        {!canHr && !canPay && (
          <div className={`${adminCardClass} col-span-full text-sm text-amber-200/90`}>
            You do not have workforce permissions. An administrator can grant <strong>Workforce and HR</strong> or{' '}
            <strong>Payroll</strong> under Access and permissions.
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
