'use client';

import { useState, useCallback, Suspense, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import AccountantSidebar from './components/Sidebar';
import AccountantNavbar from './components/Navbar';
import GlassBackground from './components/GlassBackground';
import { DashboardSkeleton } from '../admin/components/PageSkeleton';

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

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarCollapse = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background - rendered once */}
      <GlassBackground />
      
      {/* Static Sidebar - stays fixed during navigation */}
      <AccountantSidebar 
        isCollapsed={sidebarCollapsed} 
        onCollapse={handleSidebarCollapse} 
      />
      
      {/* Main Content Area */}
      <div className={`flex flex-col min-h-screen transition-[margin] duration-200 ease-out ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Static Navbar - stays fixed during navigation */}
        <AccountantNavbar />
        
        {/* Content area with smooth transitions */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 relative">
          {/* Loading overlay during transitions */}
          <AnimatePresence mode="wait">
            {isPending && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-10 flex items-center justify-center"
              >
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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


