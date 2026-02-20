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
    <div className="ac-glass-card p-6 mb-6">
      <h2 className="text-lg font-semibold ac-text-primary mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isGreen = action.color === '#16a34a';
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.path)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ac-glass-btn-secondary ${
                isGreen ? '!bg-emerald-500/15 !border-emerald-400/30 ac-text-primary hover:!bg-emerald-500/25' : ''
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: action.color }} />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
