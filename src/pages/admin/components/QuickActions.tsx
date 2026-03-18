import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  GraduationCap,
  Users,
  Briefcase,
  FileText,
  Receipt,
  Briefcase as BriefcaseIcon,
  BookOpen,
  UserCog,
  FileCheck,
  MapPin,
  Settings,
} from 'lucide-react';

export default function AdminQuickActions() {
  const navigate = useNavigate();

  const actions = [
    { icon: UserPlus, label: 'Add Student', color: '#16a34a', path: '/dashboard/admin/students/add' },
    { icon: GraduationCap, label: 'Add Teacher', color: '#16a34a', path: '/dashboard/admin/teachers' },
    { icon: Users, label: 'Add Parent', color: '#16a34a', path: '/dashboard/admin/parents' },
    { icon: Briefcase, label: 'Add Accounts Manager', color: '#6b7280', path: '/dashboard/admin/accounts' },
    { icon: FileText, label: 'Generate Reports', color: '#6b7280', path: '/dashboard/admin/reports' },
    { icon: Receipt, label: 'Generate Receipts', color: '#6b7280', path: '/dashboard/admin/outstanding' },
    { icon: BriefcaseIcon, label: 'Post Job Vacancy', color: '#6b7280', path: '/dashboard/admin/jobs' },
    { icon: BookOpen, label: 'Add Librarian', color: '#6b7280', path: '/dashboard/admin/accounts' },
    { icon: UserCog, label: 'Appoint Head Teacher', color: '#6b7280', path: '/dashboard/admin/accounts' },
    { icon: FileCheck, label: 'Headed Paper', color: '#6b7280', path: '/dashboard/admin/reports' },
    { icon: MapPin, label: 'Location Settings', color: '#6b7280', path: '/dashboard/admin/settings/location' },
    { icon: Settings, label: 'System Settings', color: '#6b7280', path: '/dashboard/admin/settings' },
  ];

  return (
    <div className="bg-[#101828] rounded-xl border border-white/10 p-6 mb-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
        <span className="text-xs text-white/50">Frequently used shortcuts</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.color === '#16a34a';
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.path)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                isPrimary
                  ? 'bg-[#10d9a8]/15 border-[#10d9a8]/30 text-[#10d9a8] hover:bg-[#10d9a8]/25'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: action.color }} />
              <span className="truncate">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
