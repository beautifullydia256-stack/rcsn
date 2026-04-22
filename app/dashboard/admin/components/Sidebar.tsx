'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserPlus,
  Briefcase,
  DollarSign,
  FileText,
  ClipboardList,
  BookOpen,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Building2,
  CreditCard,
  Smartphone,
  IdCard,
  ScrollText,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const STUDENT_DISCIPLINE_LINKS = [
  { label: 'All Students', discipline: 'all' },
  { label: 'Active Students', discipline: 'active' },
  { label: 'Warned Students', discipline: 'warned' },
  { label: 'Suspended Students', discipline: 'suspended' },
  { label: 'Deactivated Students', discipline: 'deactivated' },
  { label: 'Deleted Students', discipline: 'deleted' },
] as const;

const PARENT_FILTER_LINKS = [
  { label: 'All Parents', filter: 'all' },
  { label: 'Outstanding balances', filter: 'outstanding' },
  { label: 'Missing contact', filter: 'missing_contact' },
] as const;

export default function AdminSidebar({ isCollapsed: externalCollapsed, onCollapse }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(externalCollapsed || false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studentsMenuOpen, setStudentsMenuOpen] = useState(false);
  const [parentsMenuOpen, setParentsMenuOpen] = useState(false);

  const disciplineParam = (searchParams.get('discipline') || 'all').toLowerCase();
  const parentFilterParam = (searchParams.get('filter') || 'all').toLowerCase();

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapse?.(newState);
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/admin', exact: true },
    { icon: GraduationCap, label: 'Teachers', path: '/dashboard/admin/teachers' },
    { icon: Briefcase, label: 'Staff', path: '/dashboard/admin/accounts' },
    { icon: DollarSign, label: 'Finance', path: '/dashboard/admin/outstanding' },
    { icon: FileText, label: 'Reports', path: '/dashboard/admin/reports/generate' },
    { icon: ClipboardList, label: 'Attendance', path: '/dashboard/admin/attendance-records' },
    { icon: BookOpen, label: 'Exam Sets', path: '/dashboard/admin/exam-sets' },
    { icon: IdCard, label: 'Identity cards', path: '/dashboard/admin/identity' },
    { icon: ScrollText, label: 'Headed paper', path: '/dashboard/admin/headed-paper' },
    { icon: Building2, label: 'Classes', path: '/dashboard/admin/settings/classes' },
    { icon: CreditCard, label: 'Job Vacancies', path: '/dashboard/admin/jobs' },
    { icon: Settings, label: 'System Settings', path: '/dashboard/admin/settings' },
    { icon: Bell, label: 'Notifications', path: '/dashboard/admin/notifications' },
  ];

  const handleLogout = async () => {
    const { supabase } = await import('@/src/lib/supabase');
    await supabase.auth.signOut();
    router.push('/');
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.path;
    }
    return pathname?.startsWith(item.path);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const handleLinkClick = () => {
      if (isMobile) {
        setIsMobileOpen(false);
      }
    };

    return (
      <>
        {/* Logo & Title */}
        <div className={`flex items-center gap-3 px-4 border-b ${isMobile ? 'py-3' : 'py-6'}`} style={{ borderColor: 'rgba(255, 255, 255, 0.20)' }}>
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
              <Link
                key={item.path}
                href={item.path}
                prefetch={true}
                className="block"
                onClick={handleLinkClick}
              >
                <motion.div
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer"
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
                </motion.div>
              </Link>
            );
          })}

          {/* Students — expandable */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => !isCollapsed && setStudentsMenuOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left"
              style={{
                background: pathname?.startsWith('/dashboard/admin/students') ? 'rgba(77, 171, 255, 0.12)' : 'transparent',
                border: pathname?.startsWith('/dashboard/admin/students') ? '1px solid rgba(77, 171, 255, 0.25)' : '1px solid transparent',
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              <Users className="w-5 h-5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium flex-1">Students</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${studentsMenuOpen ? 'rotate-0' : '-rotate-90'}`}
                    style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                  />
                </>
              )}
            </button>
            {!isCollapsed && studentsMenuOpen && (
              <div className="ml-2 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                {STUDENT_DISCIPLINE_LINKS.map((sub) => {
                  const href = `/dashboard/admin/students?discipline=${sub.discipline}`;
                  const subActive =
                    pathname?.startsWith('/dashboard/admin/students') &&
                    disciplineParam === sub.discipline;
                  return (
                    <Link
                      key={sub.discipline}
                      href={href}
                      prefetch={true}
                      className="block"
                      onClick={handleLinkClick}
                    >
                      <div
                        className="px-2 py-1.5 rounded-lg text-sm transition-colors"
                        style={{
                          background: subActive ? 'rgba(77, 171, 255, 0.2)' : 'transparent',
                          color: subActive ? '#7cc4ff' : 'rgba(255, 255, 255, 0.75)',
                        }}
                      >
                        {sub.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Parents — expandable */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => !isCollapsed && setParentsMenuOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left"
              style={{
                background: pathname?.startsWith('/dashboard/admin/parents') ? 'rgba(77, 171, 255, 0.12)' : 'transparent',
                border: pathname?.startsWith('/dashboard/admin/parents') ? '1px solid rgba(77, 171, 255, 0.25)' : '1px solid transparent',
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              <UserPlus className="w-5 h-5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium flex-1">Parents</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${parentsMenuOpen ? 'rotate-0' : '-rotate-90'}`}
                    style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                  />
                </>
              )}
            </button>
            {!isCollapsed && parentsMenuOpen && (
              <div className="ml-2 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                {PARENT_FILTER_LINKS.map((sub) => {
                  const href = `/dashboard/admin/parents?filter=${sub.filter}`;
                  const subActive =
                    pathname?.startsWith('/dashboard/admin/parents') &&
                    parentFilterParam === sub.filter;
                  return (
                    <Link
                      key={sub.filter}
                      href={href}
                      prefetch={true}
                      className="block"
                      onClick={handleLinkClick}
                    >
                      <div
                        className="px-2 py-1.5 rounded-lg text-sm transition-colors"
                        style={{
                          background: subActive ? 'rgba(77, 171, 255, 0.2)' : 'transparent',
                          color: subActive ? '#7cc4ff' : 'rgba(255, 255, 255, 0.75)',
                        }}
                      >
                        {sub.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* GENERAL label */}
        {!isCollapsed && (
          <div className="px-4 pt-3 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>General</span>
          </div>
        )}

        {/* Bottom Section - Settings & Logout */}
        <div className="px-3 py-2 border-t space-y-1" style={{ borderColor: 'rgba(255, 255, 255, 0.20)' }}>
          <Link
            href="/dashboard/admin/settings"
            prefetch={true}
            className="block"
            onClick={handleLinkClick}
          >
            <motion.div
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
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
            </motion.div>
          </Link>
        
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

        {/* Download our Mobile App card */}
        {!isCollapsed && (
          <div className="mx-3 mb-4 p-4 rounded-xl border" style={{ background: 'rgba(22, 163, 74, 0.15)', borderColor: 'rgba(22, 163, 74, 0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-white">Download our Mobile App</span>
            </div>
            <p className="text-xs text-white/80 mb-3">Get easy in another way.</p>
            <a
              href="#"
              className="block w-full py-2 rounded-lg text-center text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: '#16a34a' }}
            >
              Download
            </a>
          </div>
        )}
      </>
    );
  };

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
              <div className="flex items-center justify-end px-4 py-2 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.20)' }}>
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
              <SidebarContent isMobile={true} />
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
        <SidebarContent isMobile={false} />
      </motion.aside>
    </>
  );
}

