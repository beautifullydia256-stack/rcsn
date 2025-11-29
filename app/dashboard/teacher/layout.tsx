'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import GlassBackground from './components/GlassBackground';
import { supabase } from '@/src/lib/supabase';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchData, setSearchData] = useState<{
    students: Array<{ student_id: string; name: string; current_class: string }>;
    assignments: Array<{ class_name: string; subject: string }>;
  }>({ students: [], assignments: [] });

  // Load search data once on mount
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

    loadSearchData();
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setShowSearchResults(query.trim().length > 0);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background */}
      <GlassBackground />
      
      {/* Static Sidebar - stays fixed during navigation */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onCollapse={setSidebarCollapsed} 
      />
      
      {/* Main Content Area */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Static Navbar - stays fixed during navigation */}
        <Navbar 
          onSearch={handleSearch}
          searchQuery={searchQuery}
          showSearchResults={showSearchResults}
          onCloseSearch={() => setShowSearchResults(false)}
          searchData={searchData}
        />
        
        {/* Only this content area changes when navigating */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
