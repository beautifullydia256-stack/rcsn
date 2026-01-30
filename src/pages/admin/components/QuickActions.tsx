import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
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
    { icon: UserPlus, label: 'Add Student', color: '#4dabff', path: '/dashboard/admin/students' },
    { icon: GraduationCap, label: 'Add Teacher', color: '#10b981', path: '/dashboard/admin/teachers' },
    { icon: Users, label: 'Add Parent', color: '#ff6bcb', path: '/dashboard/admin/parents' },
    { icon: Briefcase, label: 'Add Accounts Manager', color: '#ae79ff', path: '/dashboard/admin/accounts' },
    { icon: FileText, label: 'Generate Reports', color: '#f59e0b', path: '/dashboard/admin/reports/snapshots' },
    { icon: Receipt, label: 'Generate Receipts', color: '#00d4ff', path: '/dashboard/admin/outstanding' },
    { icon: BriefcaseIcon, label: 'Post Job Vacancy', color: '#ef4444', path: '/dashboard/admin/jobs' },
    { icon: BookOpen, label: 'Add Librarian', color: '#8b5cf6', path: '/dashboard/admin/accounts' },
    { icon: UserCog, label: 'Appoint Head Teacher', color: '#ec4899', path: '/dashboard/admin/accounts' },
    { icon: FileCheck, label: 'Headed Paper', color: '#14b8a6', path: '/dashboard/admin/reports/snapshots' },
    { icon: MapPin, label: 'Location Settings', color: '#06b6d4', path: '/dashboard/admin/settings/location' },
    { icon: Settings, label: 'System Settings', color: '#6366f1', path: '/dashboard/admin/settings' },
  ];

  return (
    <GlassCard className="p-6 mb-6" hover>
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(action.path)}
              type="button"
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: `${action.color}20`,
                border: `1px solid ${action.color}40`,
                color: '#ffffff',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${action.color}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${action.color}20`;
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: action.color }} />
              <span>{action.label}</span>
            </motion.button>
          );
        })}
      </div>
    </GlassCard>
  );
}
