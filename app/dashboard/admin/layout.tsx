'use client';

import { useState, useCallback, Suspense, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import AdminSidebar from './components/Sidebar';
import AdminNavbar from './components/Navbar';
import GlassBackground from './components/GlassBackground';
import { DashboardSkeleton } from './components/PageSkeleton';

// Optimized loading fallback
function LoadingFallback() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      <DashboardSkeleton />
    </motion.div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarCollapse = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  const isDashboard = pathname === '/dashboard/admin';

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background - skip on dashboard for white/light theme */}
      {!isDashboard && <GlassBackground />}

      {/* Static Sidebar - stays fixed during navigation */}
      <AdminSidebar
        isCollapsed={sidebarCollapsed}
        onCollapse={handleSidebarCollapse}
      />

      {/* Main Content Area - white/light background on dashboard */}
      <div
        className={`flex flex-col min-h-screen transition-[margin] duration-200 ease-out ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'} ${isDashboard ? 'bg-[#05080f] text-white' : ''}`}
      >
        {/* Static Navbar - stays fixed during navigation */}
        <AdminNavbar />

        {/* Content area with smooth transitions */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 relative">
          {/* Loading overlay during transitions - light theme on dashboard */}
          <AnimatePresence mode="wait">
            {isPending && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className={`absolute inset-0 z-10 flex items-center justify-center ${isDashboard ? 'bg-[#05080f]/70 backdrop-blur-[2px]' : 'bg-black/20 backdrop-blur-[1px]'}`}
              >
                <div
                  className={`w-8 h-8 border-2 rounded-full animate-spin ${isDashboard ? 'border-gray-200 border-t-green-600' : 'border-white/30 border-t-white'}`}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Page content with animations */}
          <Suspense fallback={<LoadingFallback />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ 
                  duration: 0.15,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

