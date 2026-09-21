import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useGuild } from '@/context/GuildContext';
import { useAuthStore } from '@/store/authStore';

export default function GuildExecutiveRouteGuard() {
  const { isGuildExecutive, loading, isExpired } = useGuild();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--ac-screen-bg,#070B09)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Verifying Guild Executive credentials...</p>
        </div>
      </div>
    );
  }

  const authRole = useAuthStore((s) => s.role);
  const isAdminOrOwner = authRole === 'admin' || authRole === 'owner';

  // If not admin/owner AND (tenure expired or not a guild executive), strictly block and bounce to regular student view
  if (!isAdminOrOwner && (!isGuildExecutive || isExpired)) {
    return <Navigate to="/dashboard/student" replace />;
  }

  return <Outlet />;
}
