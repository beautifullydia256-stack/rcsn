'use client';

import { useState, useCallback } from 'react';
import AdminSidebar from './components/Sidebar';
import AdminNavbar from './components/Navbar';
import GlassBackground from './components/GlassBackground';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarCollapse = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background */}
      <GlassBackground />
      
      {/* Static Sidebar - stays fixed during navigation */}
      <AdminSidebar 
        isCollapsed={sidebarCollapsed} 
        onCollapse={handleSidebarCollapse} 
      />
      
      {/* Main Content Area */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Static Navbar - stays fixed during navigation */}
        <AdminNavbar />
        
        {/* Only this content area changes when navigating */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

