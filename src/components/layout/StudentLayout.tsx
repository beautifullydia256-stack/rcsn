import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { GuildProvider, useGuild } from '@/context/GuildContext';
import { Landmark, Vote, MessageSquareQuote, ArrowRight, ShieldCheck } from 'lucide-react';

function StudentHeaderBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuildExecutive, portfolioTitle, setExecutiveMode } = useGuild();

  const handleSwitchToGuild = () => {
    setExecutiveMode(true);
    navigate('/dashboard/guild');
  };

  return (
    <div className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Quick student civic access */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/student')}
            className="flex items-center gap-2 font-semibold text-sm text-foreground hover:text-emerald-500 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Student Portal</span>
          </button>

          <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block" />

          <nav className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/student/voting')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                location.pathname.includes('/voting')
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Vote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Campus Voting</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/student/grievances')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                location.pathname.includes('/grievances')
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400" />
              <span>Grievances Desk</span>
            </button>
          </nav>
        </div>

        {/* Right: Conditional Single-Identity Multi-Role Switcher (Visible ONLY to verified active Guild Executives) */}
        {isGuildExecutive && (
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-medium text-foreground">{portfolioTitle}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                ACTIVE TENURE
              </span>
            </div>

            <button
              type="button"
              onClick={handleSwitchToGuild}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-sm shadow-emerald-950/20 hover:shadow-md hover:shadow-emerald-950/30 transition-all border border-emerald-400/30"
              title="Access Cabinet Controls & Ministerial Portfolios"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Switch to Guild Executive View</span>
              <ArrowRight className="w-3 h-3 text-emerald-200" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentLayout() {
  return (
    <GuildProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <StudentHeaderBar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </GuildProvider>
  );
}
