import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  UserCheck,
  CircleDollarSign,
  ClipboardList,
  Building2,
  TestTube,
  HeartPulse,
  Landmark,
  Settings,
  ArrowRight,
  X,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

/**
 * MASTER SWITCH FOR PILOT TESTING:
 * Set this to false when testing across schools is concluded to immediately
 * remove the floating QA navigator across all dashboards.
 */
export const QA_PORTAL_HUB_ACTIVE = true;

interface QuickPortal {
  name: string;
  role: string;
  path: string;
  icon: any;
  color: string;
}

const QUICK_PORTALS: QuickPortal[] = [
  { name: 'Admin Dashboard', role: 'School Administrator', path: '/dashboard/admin', icon: LayoutDashboard, color: '#3DE8A0' },
  { name: 'DOS / Registrar', role: 'Director of Studies', path: '/dashboard/dos', icon: Compass, color: '#78AAFF' },
  { name: 'Head Teacher', role: 'Principal', path: '/dashboard/head-teacher', icon: UserCheck, color: '#F5C044' },
  { name: 'Teacher Portal', role: 'Instructors & Tutors', path: '/dashboard/teacher', icon: BookOpen, color: '#10D9A8' },
  { name: 'Student Portal', role: 'Student Body', path: '/dashboard/student', icon: GraduationCap, color: '#A855F7' },
  { name: 'Parent Portal', role: 'Guardians & Families', path: '/dashboard/parent', icon: Users, color: '#EC4899' },
  { name: 'Accountant / Bursar', role: 'School Finance', path: '/dashboard/accountant', icon: CircleDollarSign, color: '#EAB308' },
  { name: 'Secretary / Front Desk', role: 'Admissions & Reception', path: '/dashboard/secretary', icon: ClipboardList, color: '#FB923C' },
  { name: 'Guild Executive', role: 'Student Council', path: '/dashboard/guild', icon: Landmark, color: '#14B8A6' },
  { name: 'Tertiary & Clinical', role: 'Health Training', path: '/dashboard/tertiary', icon: Building2, color: '#6366F1' },
  { name: 'School Nurse / Clinic', role: 'Sick Bay', path: '/dashboard/clinician', icon: HeartPulse, color: '#EF4444' },
  { name: 'Lab Technician', role: 'Laboratories', path: '/dashboard/lab-technician', icon: TestTube, color: '#06B6D4' },
  { name: 'Library Hub', role: 'Librarian', path: '/dashboard/librarian', icon: BookOpen, color: '#8B5CF6' },
  { name: 'Platform Owner', role: 'Super Admin', path: '/dashboard/owner', icon: Settings, color: '#64748B' },
];

export default function QAFloatingPortalLauncher() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Only render on dashboard routes
  if (!QA_PORTAL_HUB_ACTIVE || !location.pathname.startsWith('/dashboard')) {
    return null;
  }

  // Current active role name based on path
  const currentPortal = QUICK_PORTALS.find((p) => location.pathname === p.path || location.pathname.startsWith(p.path + '/'));

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/90 text-amber-400 border border-amber-500/30 shadow-2xl backdrop-blur text-xs font-semibold hover:scale-105 transition-transform"
        title="Restore QA Dashboard Switcher"
      >
        <Compass className="w-4 h-4 animate-spin-slow" />
        <span>QA Switcher</span>
      </button>
    );
  }

  return (
    <>
      {/* Floating Launcher Pill */}
      <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-1.5 p-1.5 rounded-full bg-slate-950/95 border border-amber-500/40 shadow-2xl backdrop-blur text-slate-100 text-xs select-none">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/portal-explorer')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-sm transition-all"
          title="Open Full Portals & Pages Audit Explorer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>All Dashboards Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Quick Jump between Dashboards"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span className="max-w-[120px] truncate font-medium">
            {currentPortal ? currentPortal.name : 'Switch Role'}
          </span>
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Minimize QA bar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Popout Dashboard Switcher Grid */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-[9999] w-80 sm:w-96 rounded-2xl bg-slate-950/95 border border-slate-800 p-4 shadow-2xl backdrop-blur text-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-xs tracking-wide uppercase text-slate-300">
                QA Multi-Portal Navigator
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/portal-explorer')}
              className="text-[11px] font-semibold text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Full Directory</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Instant jump to inspect features, missing pages, and layouts across all system portals:
          </p>

          <div className="grid grid-cols-2 gap-1.5 max-h-[360px] overflow-y-auto pr-1">
            {QUICK_PORTALS.map((portal) => {
              const Icon = portal.icon;
              const isActive = location.pathname === portal.path || location.pathname.startsWith(portal.path + '/');
              return (
                <button
                  key={portal.path}
                  type="button"
                  onClick={() => {
                    navigate(portal.path);
                    setIsOpen(false);
                  }}
                  className={`flex items-start gap-2 p-2 rounded-xl text-left transition-all border ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800/80 text-slate-200'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${portal.color}20`, color: portal.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-xs truncate">{portal.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{portal.role}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Testing & Audit Mode</span>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin')}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>Return to Admin Panel</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
