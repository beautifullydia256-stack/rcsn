import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import Header from './Header';
import Sidebar from './Sidebar';
import { cn } from '../../utils/cn';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { sidebarOpen } = useUIStore();
  const location = useLocation();
  
  // Don't show sidebar/header on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/';
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-0'
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

