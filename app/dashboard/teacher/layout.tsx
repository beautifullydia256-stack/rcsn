'use client';

import { useState, useEffect, useCallback, Suspense, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import GlassBackground from './components/GlassBackground';
import { DashboardSkeleton } from './components/PageSkeleton';
import { supabase } from '@/src/lib/supabase';

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

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchData, setSearchData] = useState<{
    students: Array<{ student_id: string; name: string; current_class: string }>;
    assignments: Array<{ class_name: string; subject: string }>;
  }>({ students: [], assignments: [] });

  // Mark as hydrated after mount for smoother initial load
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Load search data once on mount - non-blocking
  useEffect(() => {
    const loadSearchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const metadata = (user as any).user_metadata || {};
        const schoolId = metadata.school_id;
        const teacherId = metadata.teacher_id;

        if (!schoolId || !teacherId) return;

        const { data: assignments } = await supabase
          .from('class_teacher_assignments')
          .select('class_name, subject')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId);

        if (assignments && assignments.length > 0) {
          const classNames = [...new Set(assignments.map(a => a.class_name))];
          
          const { data: students } = await supabase
            .from('students')
            .select('student_id, name, current_class')
            .eq('school_id', schoolId)
            .in('current_class', classNames);

          setSearchData({
            students: students || [],
            assignments: assignments || []
          });
        }
      } catch (error) {
        console.error('Error loading search data:', error);
      }
    };

    // Load search data after initial render to not block
    requestAnimationFrame(() => {
      loadSearchData();
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setShowSearchResults(query.trim().length > 0);
  }, []);

  const handleSidebarCollapse = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background - rendered once */}
      <GlassBackground />
      
      {/* Static Sidebar - stays fixed during navigation */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onCollapse={handleSidebarCollapse} 
      />
      
      {/* Main Content Area */}
      <div className={`flex flex-col min-h-screen transition-[margin] duration-200 ease-out ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Static Navbar - stays fixed during navigation */}
        <Navbar 
          onSearch={handleSearch}
          searchQuery={searchQuery}
          showSearchResults={showSearchResults}
          onCloseSearch={() => setShowSearchResults(false)}
          searchData={searchData}
        />
        
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
