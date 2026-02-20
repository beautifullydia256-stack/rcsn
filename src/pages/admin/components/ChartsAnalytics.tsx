import { TrendingUp, Users, DollarSign } from 'lucide-react';

export default function ChartsAnalytics() {
  return (
    <div className="space-y-6 mb-6">
      <div className="ac-glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold ac-text-primary">Enrollment & Attendance Analytics</h3>
        </div>
        <div className="h-40 flex items-center justify-center rounded-xl ac-skeleton-block">
          <p className="text-sm ac-text-muted">Charts load from dashboard data</p>
        </div>
        <div className="text-xs ac-text-muted mt-2 text-center">Last 7 working days</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ac-glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold ac-text-primary">Enrollment by Term</h3>
          </div>
          <div className="h-32 flex items-center justify-center rounded-xl ac-skeleton-block">
            <p className="text-sm ac-text-muted">Term data</p>
          </div>
        </div>
        <div className="ac-glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold ac-text-primary">Fee Collections by Week</h3>
          </div>
          <div className="h-32 flex items-center justify-center rounded-xl ac-skeleton-block">
            <p className="text-sm ac-text-muted">Weekly fees</p>
          </div>
        </div>
      </div>
    </div>
  );
}
