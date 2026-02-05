import { TrendingUp, Users, DollarSign } from 'lucide-react';

export default function ChartsAnalytics() {
  return (
    <div className="space-y-6 mb-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Enrollment & Attendance Analytics</h3>
        </div>
        <div className="h-40 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-sm text-gray-500">Charts load from dashboard data</p>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-center">Last 7 working days</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Enrollment by Term</h3>
          </div>
          <div className="h-32 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-sm text-gray-500">Term data</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Fee Collections by Week</h3>
          </div>
          <div className="h-32 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-sm text-gray-500">Weekly fees</p>
          </div>
        </div>
      </div>
    </div>
  );
}
