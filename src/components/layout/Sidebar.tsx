import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Settings,
  BarChart3,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

const navItems = [
  { path: '/dashboard/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/dashboard/admin/students', icon: Users, label: 'Students' },
  { path: '/dashboard/admin/teachers', icon: Users, label: 'Teachers' },
  { path: '/dashboard/admin/exam-sets', icon: BookOpen, label: 'Exams' },
  { path: '/dashboard/admin/reports', icon: FileText, label: 'Reports' },
  { path: '/dashboard/admin/settings', icon: Settings, label: 'Settings' },
  { path: '/dashboard/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar() {
  const { sidebarOpen } = useUIStore();
  const location = useLocation();
  const { role } = useAuthStore();

  // Filter nav items based on role (simplified for now)
  const filteredItems = navItems;

  return (
    <motion.aside
      initial={false}
      animate={{
        width: sidebarOpen ? 256 : 0,
        opacity: sidebarOpen ? 1 : 0,
      }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className={cn(
        'fixed left-0 top-0 h-full z-40 bg-white/75 dark:bg-[#070B09] backdrop-blur-2xl backdrop-saturate-[180%] rounded-r-2xl',
        'border-r border-white/40 dark:border-white/10 shadow-[10px_0_35px_-5px_rgba(0,0,0,0.38),inset_-1px_0_1.5px_rgba(255,255,255,0.2)] overflow-hidden',
        !sidebarOpen && 'pointer-events-none'
      )}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Logo */}
        <div className="mb-8 px-4">
          <h1 className="text-2xl font-bold text-foreground">RCSN</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                  'glass-subtle glass-hover',
                  isActive && 'glass-active'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </motion.aside>
  );
}




