import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useGuild } from '@/context/GuildContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Landmark,
  LayoutDashboard,
  MessageSquareQuote,
  Wallet,
  HeartPulse,
  Megaphone,
  Vote,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  School,
  Clock,
  Sun,
  Moon,
  Users
} from 'lucide-react';

export default function GuildLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    portfolioTitle,
    activeTenure,
    isPresident,
    canManageFinances,
    canManageGrievances,
    canBroadcast,
    canViewWelfare,
    setExecutiveMode,
  } = useGuild();

  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSwitchToStudent = () => {
    setExecutiveMode(false);
    navigate('/dashboard/student');
  };

  const navItems = [
    {
      to: '/dashboard/guild',
      label: 'President Overview',
      icon: LayoutDashboard,
      exact: true,
      allowed: true,
    },
    {
      to: '/dashboard/guild/students',
      label: 'Student Body Roster',
      icon: Users,
      allowed: true,
    },
    {
      to: '/dashboard/guild/grievances',
      label: 'Grievance Desk',
      icon: MessageSquareQuote,
      allowed: true,
    },
    {
      to: '/dashboard/guild/finance',
      label: 'Guild Treasury',
      icon: Wallet,
      allowed: true,
    },
    {
      to: '/dashboard/guild/welfare',
      label: 'Health & Welfare',
      icon: HeartPulse,
      allowed: true,
    },
    {
      to: '/dashboard/guild/cabinet',
      label: 'Cabinet Ministers',
      icon: Landmark,
      allowed: true,
    },
    {
      to: '/dashboard/guild/broadcasts',
      label: 'Broadcasts & Senate',
      icon: Megaphone,
      allowed: true,
    },
    {
      to: '/dashboard/guild/elections',
      label: 'Electoral Commission',
      icon: Vote,
      allowed: true,
    },
  ];

  const termEndDate = activeTenure?.term_end ? new Date(activeTenure.term_end) : null;
  const daysRemaining = termEndDate
    ? Math.max(0, Math.ceil((termEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row antialiased"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
      }}
    >
      {/* Mobile Top Bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
            }}
          >
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight" style={{ color: t.textHi }}>
              Guild Executive
            </div>
            <div className="text-[10px] leading-tight" style={{ color: t.mint }}>
              {portfolioTitle || 'Council Officer'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg border"
          style={{
            borderColor: t.stroke,
            color: t.textHi,
          }}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 shrink-0 border-r md:sticky md:top-0 md:h-screen z-30 transition-all`}
        style={{
          backgroundColor: t.sidebarBg,
          borderColor: t.sidebarBorder,
        }}
      >
        {/* Brand / Cabinet Badge */}
        <div className="p-5 border-b" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                color: t.ctaText,
              }}
            >
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold tracking-tight truncate" style={{ color: t.textHi }}>
                Guild Cabinet
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: t.mint }}
                />
                <span className="text-xs font-semibold truncate" style={{ color: t.mint }}>
                  {portfolioTitle || 'Executive'}
                </span>
              </div>
            </div>
          </div>

          {/* Term Status Pill */}
          <div
            className="mt-3.5 p-2 rounded-lg border text-xs flex items-center justify-between"
            style={{
              backgroundColor: t.surfaceSubtle,
              borderColor: t.stroke,
            }}
          >
            <div className="flex items-center gap-1.5" style={{ color: t.textMid }}>
              <Clock className="w-3.5 h-3.5" style={{ color: t.mint }} />
              <span>Term: {activeTenure?.academic_year || 'Current'}</span>
            </div>
            {daysRemaining !== null && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  backgroundColor: t.mintDim,
                  color: t.mint,
                }}
              >
                {daysRemaining}d left
              </span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div
            className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: t.sidebarSectionLabel }}
          >
            Democratic Governance
          </div>

          {navItems
            .filter((item) => item.allowed)
            .map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive ? 'shadow-sm' : 'hover:opacity-100 opacity-75'
                  }`}
                  style={{
                    backgroundColor: isActive ? t.sidebarActiveBg : 'transparent',
                    color: isActive ? t.sidebarActiveText : t.textHi,
                  }}
                >
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{
                      color: isActive ? t.sidebarActiveText : t.textMid,
                    }}
                  />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t mt-auto space-y-2" style={{ borderColor: t.divider }}>
          <button
            type="button"
            onClick={() => {
              const next = isDark ? 'light' : 'dark';
              useUIStore.getState().setTheme(next);
              document.documentElement.classList.remove('light', 'dark');
              document.documentElement.classList.add(next);
              document.documentElement.setAttribute('data-theme', next);
              try { localStorage.setItem('pwezacore-theme', next); } catch {}
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.01] cursor-pointer"
            style={{
              backgroundColor: t.fieldBg,
              borderColor: t.stroke,
              color: t.textHi,
            }}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{isDark ? 'Switch to White Mode' : 'Switch to Dark Mode'}</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchToStudent}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.01] cursor-pointer"
            style={{
              backgroundColor: t.fieldBg,
              borderColor: t.stroke,
              color: t.textHi,
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: t.mint }} />
            <span>Switch to Student Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Executive Suite Top Bar */}
        <header
          className="sticky top-0 z-20 border-b px-4 sm:px-6 py-3 flex items-center justify-between backdrop-blur-md"
          style={{
            backgroundColor: `${t.panel}EE`,
            borderColor: t.stroke,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
              style={{
                backgroundColor: t.mintDim,
                color: t.mint,
                borderColor: t.mintRing,
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{portfolioTitle || 'Executive Officer'}</span>
            </span>

            <span className="text-xs hidden sm:inline" style={{ color: t.textMid }}>
              Academic Year: <strong>{activeTenure?.academic_year || '2026/2027'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSwitchToStudent}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border hover:opacity-90 transition-all"
              style={{
                backgroundColor: t.fieldBg,
                borderColor: t.strokeHi,
                color: t.textHi,
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Return to</span>
              <span>Student Portal</span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
