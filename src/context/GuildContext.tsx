import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { GuildTenure, GuildPortfolio, GuildPortfolioPermissions } from '@/types/guild';

interface GuildContextValue {
  loading: boolean;
  activeTenure: GuildTenure | null;
  activePortfolio: GuildPortfolio | null;
  studentId: string | null;
  schoolId: string | null;
  isGuildExecutive: boolean;
  isExpired: boolean;
  portfolioTitle: string | null;
  permissions: GuildPortfolioPermissions;
  canManageFinances: boolean;
  canManageGrievances: boolean;
  canBroadcast: boolean;
  canViewWelfare: boolean;
  canApproveRequisitions: boolean;
  isPresident: boolean;
  refreshGuildStatus: () => Promise<void>;
  isExecutiveMode: boolean;
  setExecutiveMode: (mode: boolean) => void;
}

const GuildContext = createContext<GuildContextValue | undefined>(undefined);

export const GuildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const authRole = useAuthStore((s) => s.role);
  const storeSchoolId = useAuthStore((s) => s.schoolId);

  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(storeSchoolId);
  const [activeTenure, setActiveTenure] = useState<GuildTenure | null>(null);
  const [isExecutiveMode, setExecutiveMode] = useState<boolean>(() => {
    return localStorage.getItem('pwezacore_guild_mode') === 'true';
  });

  const handleSetExecutiveMode = useCallback((mode: boolean) => {
    setExecutiveMode(mode);
    localStorage.setItem('pwezacore_guild_mode', mode ? 'true' : 'false');
  }, []);

  const refreshGuildStatus = useCallback(async () => {
    if (!user) {
      setActiveTenure(null);
      setStudentId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Resolve student identity
      let currentStudentId: string | null = null;
      let currentSchoolId: string | null = storeSchoolId;

      // Check users table first
      const { data: userRow } = await supabase
        .from('users')
        .select('student_id, school_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userRow?.student_id) {
        currentStudentId = userRow.student_id;
      }
      if (userRow?.school_id) {
        currentSchoolId = userRow.school_id;
      }

      // If student_id is not directly on user, check students table by email and school_id
      if (!currentStudentId && user.email && currentSchoolId) {
        const { data: studentRow } = await supabase
          .from('students')
          .select('student_id')
          .eq('school_id', currentSchoolId)
          .ilike('email', user.email.trim())
          .maybeSingle();

        if (studentRow?.student_id) {
          currentStudentId = studentRow.student_id;
        }
      }

      setStudentId(currentStudentId);
      setSchoolId(currentSchoolId);

      if (!currentStudentId || !currentSchoolId) {
        setActiveTenure(null);
        setLoading(false);
        return;
      }

      // 2. Fetch active guild tenure for this student
      const { data: tenures, error: tenureErr } = await supabase
        .from('guild_tenures')
        .select(`
          *,
          portfolio:guild_portfolios(*)
        `)
        .eq('student_id', currentStudentId)
        .eq('school_id', currentSchoolId)
        .order('created_at', { ascending: false });

      if (tenureErr || !tenures || tenures.length === 0) {
        setActiveTenure(null);
        setLoading(false);
        return;
      }

      // Find an ACTIVE tenure
      const now = new Date();
      const activeRecord = tenures.find((t: any) => t.status === 'ACTIVE');

      if (!activeRecord) {
        setActiveTenure(null);
        setLoading(false);
        return;
      }

      // On-demand Expiry Check: Check if term_end has passed
      const termEnd = new Date(activeRecord.term_end);
      if (now > termEnd) {
        // Automatically expire in database
        await supabase
          .from('guild_tenures')
          .update({ status: 'EXPIRED' })
          .eq('id', activeRecord.id);

        setActiveTenure({
          ...activeRecord,
          status: 'EXPIRED',
          portfolio: activeRecord.portfolio,
        });
        setLoading(false);
        return;
      }

      setActiveTenure({
        ...activeRecord,
        portfolio: activeRecord.portfolio,
      });
    } catch (err) {
      console.error('[GuildContext] Error verifying guild tenure:', err);
      setActiveTenure(null);
    } finally {
      setLoading(false);
    }
  }, [user, storeSchoolId]);

  useEffect(() => {
    refreshGuildStatus();
  }, [refreshGuildStatus]);

  const activePortfolio = activeTenure?.portfolio || null;
  const isExpired = activeTenure?.status === 'EXPIRED' || (activeTenure ? new Date() > new Date(activeTenure.term_end) : false);
  const isGuildExecutive = !isExpired && activeTenure?.status === 'ACTIVE' && !!activePortfolio;
  const portfolioTitle = activePortfolio?.title || null;
  const permissions: GuildPortfolioPermissions = activePortfolio?.permissions || {};

  const isPresident = useMemo(() => {
    if (!portfolioTitle) return false;
    return portfolioTitle.toLowerCase().includes('president');
  }, [portfolioTitle]);

  const canManageFinances = useMemo(() => {
    if (!isGuildExecutive) return false;
    return Boolean(permissions.manage_finances || isPresident);
  }, [isGuildExecutive, permissions, isPresident]);

  const canManageGrievances = useMemo(() => {
    if (!isGuildExecutive) return false;
    return Boolean(permissions.manage_grievances || isPresident);
  }, [isGuildExecutive, permissions, isPresident]);

  const canBroadcast = useMemo(() => {
    if (!isGuildExecutive) return false;
    return Boolean(permissions.broadcast || isPresident);
  }, [isGuildExecutive, permissions, isPresident]);

  const canViewWelfare = useMemo(() => {
    if (!isGuildExecutive) return false;
    return Boolean(permissions.view_welfare || isPresident);
  }, [isGuildExecutive, permissions, isPresident]);

  const canApproveRequisitions = useMemo(() => {
    if (!isGuildExecutive) return false;
    return Boolean(permissions.approve_requisitions || isPresident);
  }, [isGuildExecutive, permissions, isPresident]);

  const value = useMemo(
    () => ({
      loading,
      activeTenure,
      activePortfolio,
      studentId,
      schoolId,
      isGuildExecutive,
      isExpired,
      portfolioTitle,
      permissions,
      canManageFinances,
      canManageGrievances,
      canBroadcast,
      canViewWelfare,
      canApproveRequisitions,
      isPresident,
      refreshGuildStatus,
      isExecutiveMode,
      setExecutiveMode: handleSetExecutiveMode,
    }),
    [
      loading,
      activeTenure,
      activePortfolio,
      studentId,
      schoolId,
      isGuildExecutive,
      isExpired,
      portfolioTitle,
      permissions,
      canManageFinances,
      canManageGrievances,
      canBroadcast,
      canViewWelfare,
      canApproveRequisitions,
      isPresident,
      refreshGuildStatus,
      isExecutiveMode,
      handleSetExecutiveMode,
    ]
  );

  return <GuildContext.Provider value={value}>{children}</GuildContext.Provider>;
};

export function useGuild() {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuild must be used within a GuildProvider');
  }
  return context;
}
