'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  BookOpen,
  Calendar,
  Sparkles,
  FileText,
  Book,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export default function Sidebar({ isCollapsed: externalCollapsed, onCollapse }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(externalCollapsed || false);
  const pathname = usePathname();
  const router = useRouter();

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapse?.(newState);
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/teacher', exact: true },
    { icon: Users, label: 'My Classes', path: '/dashboard/teacher/classes' },
    { icon: UserCheck, label: 'My Students', path: '/dashboard/teacher/students' },
    { icon: ClipboardList, label: 'Attendance', path: '/dashboard/teacher/attendance' },
    { icon: BookOpen, label: 'Exams & Results', path: '/dashboard/teacher/exam-results' },
    { icon: Calendar, label: 'Timetable', path: '/dashboard/teacher/timetable' },
    { icon: Sparkles, label: 'AI Lesson Planner', path: '/dashboard/teacher/ai-planner' },
    { icon: FileText, label: 'Assignments', path: '/dashboard/teacher/assignments' },
    { icon: Book, label: 'Resources', path: '/dashboard/teacher/resources' },
    { icon: MessageSquare, label: 'Messages', path: '/dashboard/teacher/messages' },
    { icon: Bell, label: 'Notifications', path: '/dashboard/teacher/notifications' },
  ];

  const handleLogout = async () => {
    const { supabase } = await import('@/src/lib/supabase');
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMobileOpen(false);
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.path;
    }
    return pathname?.startsWith(item.path);
  };

  const SidebarContent = () => (
    <>
      {/* Logo & Title */}
      <div className="flex items-center gap-3 px-4 py-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.20)' }}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">PwezaCore</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mx-auto">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg transition-colors"
          style={{
            color: 'rgba(255, 255, 255, 0.85)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{
                background: active ? 'rgba(77, 171, 255, 0.15)' : 'transparent',
                border: active ? '1px solid rgba(77, 171, 255, 0.3)' : '1px solid transparent',
                color: active ? '#4dabff' : 'rgba(255, 255, 255, 0.85)',
                boxShadow: active ? '0 2px 10px rgba(0, 0, 0, 0.15)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon 
                className="w-5 h-5 flex-shrink-0" 
                style={{ color: active ? '#4dabff' : 'rgba(255, 255, 255, 0.7)' }}
              />
              {!isCollapsed && (
                <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
              )}
              {active && !isCollapsed && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4dabff' }} />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: 'rgba(255, 255, 255, 0.20)' }}>
        <motion.button
          onClick={() => handleNavigation('/dashboard/teacher/settings')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium flex-1 text-left">Settings</span>}
        </motion.button>
        
        <motion.button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          style={{ color: 'rgba(239, 68, 68, 0.9)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium flex-1 text-left">Logout</span>}
        </motion.button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          color: 'rgba(255, 255, 255, 0.85)'
        }}
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 shadow-2xl z-50 flex flex-col"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(25px)',
                WebkitBackdropFilter: 'blur(25px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.20)'
              }}
            >
              <div className="flex items-center justify-between px-4 py-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.20)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg text-white">PwezaCore</span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? '80px' : '288px' }}
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.20)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}

