import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useGuild } from '@/context/GuildContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  MessageSquareQuote,
  Wallet,
  Calendar,
  Vote,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Send,
  Building,
  HeartPulse,
  Activity,
  Plus,
  RefreshCw,
  ExternalLink,
  Users,
  Megaphone
} from 'lucide-react';
import type { StudentGrievance, GuildTransaction, Election, GuildWelfareReport, GuildAnnouncement } from '@/types/guild';
import { NativeModal } from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';

const SCOPE_OPTIONS = [
  { value: 'ALL', label: 'Entire Student Body' },
  { value: 'FACULTY', label: 'Specific Faculty' },
  { value: 'CLASS', label: 'Class Stream' },
  { value: 'HOSTEL', label: 'Residential Halls' },
];

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: 'Normal Notice' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'URGENT', label: 'Urgent Senate Dispatch' },
];


export default function GuildPresidentDashboard() {
  const navigate = useNavigate();
  const { schoolId, activeTenure, portfolioTitle, isPresident, canManageGrievances, canManageFinances } = useGuild();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [loading, setLoading] = useState(true);
  const [grievances, setGrievances] = useState<StudentGrievance[]>([]);
  const [transactions, setTransactions] = useState<GuildTransaction[]>([]);
  const [welfareReports, setWelfareReports] = useState<GuildWelfareReport[]>([]);
  const [announcements, setAnnouncements] = useState<GuildAnnouncement[]>([]);
  const [currentElection, setCurrentElection] = useState<Election | null>(null);
  const [turnoutCount, setTurnoutCount] = useState<number>(0);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);

  // Quick announcement modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastScope, setBroadcastScope] = useState<'ALL' | 'FACULTY' | 'CLASS' | 'HOSTEL'>('ALL');
  const [broadcastPriority, setBroadcastPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [
        grievancesRes,
        txRes,
        welfareRes,
        annRes,
        elecRes,
        studentsCountRes,
      ] = await Promise.all([
        supabase
          .from('student_grievances')
          .select(`*, student:students(name, current_class)`)
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('guild_transactions')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false }),
        supabase
          .from('guild_welfare_reports')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('guild_announcements')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('elections')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
      ]);

      setGrievances((grievancesRes.data as StudentGrievance[]) || []);
      setTransactions((txRes.data as GuildTransaction[]) || []);
      setWelfareReports((welfareRes.data as GuildWelfareReport[]) || []);
      setAnnouncements((annRes.data as GuildAnnouncement[]) || []);
      setCurrentElection(elecRes.data as Election | null);
      setTotalStudentsCount(studentsCountRes.count || 0);

      // If active election, count voter turnout
      if (elecRes.data?.id) {
        const { count: votesCount } = await supabase
          .from('election_voter_logs')
          .select('id', { count: 'exact', head: true })
          .eq('election_id', elecRes.data.id);
        setTurnoutCount(votesCount || 0);
      }
    } catch (err) {
      console.error('[GuildPresidentDashboard] Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  // Grievance metrics
  const grievanceMetrics = useMemo(() => {
    const total = grievances.length;
    const inProgress = grievances.filter((g) => g.status === 'IN_REVIEW' || g.status === 'ESCALATED_TO_ADMIN').length;
    const today = new Date().toISOString().slice(0, 10);
    const resolvedToday = grievances.filter(
      (g) => g.status === 'RESOLVED' && g.resolved_at && g.resolved_at.startsWith(today)
    ).length;
    return { total, inProgress, resolvedToday };
  }, [grievances]);

  // Financial metrics
  const financeMetrics = useMemo(() => {
    let inflow = 0;
    let disbursed = 0;
    let pendingRequisitions = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'INFLOW_ALLOCATION') {
        inflow += amt;
      } else if (tx.type === 'EXPENDITURE') {
        if (tx.status === 'APPROVED') {
          disbursed += amt;
        } else if (tx.status === 'PENDING') {
          pendingRequisitions += amt;
        }
      }
    });

    const balance = Math.max(0, inflow - disbursed);
    return { balance, disbursed, pendingRequisitions, inflow };
  }, [transactions]);

  // Turnout percentage
  const turnoutPercent = useMemo(() => {
    if (!totalStudentsCount || totalStudentsCount === 0) return 0;
    return Math.min(100, Math.round((turnoutCount / totalStudentsCount) * 100));
  }, [turnoutCount, totalStudentsCount]);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenure?.id || !schoolId || !broadcastTitle.trim() || !broadcastContent.trim()) return;

    setSubmittingBroadcast(true);
    try {
      const { error } = await supabase.from('guild_announcements').insert({
        school_id: schoolId,
        tenure_id: activeTenure.id,
        title: broadcastTitle.trim(),
        content: broadcastContent.trim(),
        target_scope: broadcastScope,
        priority: broadcastPriority,
      });

      if (error) throw error;

      setBroadcastTitle('');
      setBroadcastContent('');
      setShowBroadcastModal(false);
      fetchData();
    } catch (err: any) {
      alert(`Error broadcasting dispatch: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  const fmtCurrency = (n: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(n);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Executive Identity Header */}
      <div
        className="rounded-2xl p-6 border relative overflow-hidden"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
          boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 25px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase"
                style={{
                  backgroundColor: t.mintDim,
                  color: t.mint,
                  border: `1px solid ${t.mintRing}`,
                }}
              >
                Executive Command Center
              </span>
              <span className="text-xs" style={{ color: t.textMid }}>
                Term {activeTenure?.academic_year || '2026/2027'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight" style={{ color: t.textHi }}>
              {portfolioTitle || 'Guild President Overview'}
            </h1>
            <p className="text-sm mt-1 max-w-2xl" style={{ color: t.textMid }}>
              Welcome, Cabinet Officer. Manage student welfare petitions, monitor guild treasury allocations, and broadcast council resolutions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchData}
              className="p-2 rounded-lg border hover:opacity-80 transition-opacity"
              style={{
                borderColor: t.stroke,
                color: t.textHi,
                backgroundColor: t.fieldBg,
              }}
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowBroadcastModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-md hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                color: t.ctaText,
              }}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Dispatch</span>
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full pointer-events-none blur-3xl opacity-30"
          style={{ background: t.mint }}
        />
      </div>

      {/* Top 4 Metric KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Student Grievances */}
        <div
          className="rounded-xl p-5 border relative overflow-hidden transition-all hover:translate-y-[-2px]"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMid }}>
              Student Grievances
            </span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: t.goldDim, color: t.gold }}>
              <MessageSquareQuote className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold" style={{ color: t.textHi }}>
              {grievanceMetrics.total} Total
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: t.textMid }}>
              <span className="font-semibold" style={{ color: t.gold }}>
                {grievanceMetrics.inProgress} In-Progress
              </span>
              <span>·</span>
              <span className="font-semibold" style={{ color: t.mint }}>
                {grievanceMetrics.resolvedToday} Resolved Today
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex justify-between items-center text-[11px]" style={{ borderColor: t.divider }}>
            <span style={{ color: t.textLow }}>Pipeline status</span>
            <button
              onClick={() => navigate('/dashboard/guild/grievances')}
              className="font-semibold hover:underline flex items-center gap-1"
              style={{ color: t.mint }}
            >
              <span>Manage Desk</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 2: Guild Treasury Status */}
        <div
          className="rounded-xl p-5 border relative overflow-hidden transition-all hover:translate-y-[-2px]"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMid }}>
              Guild Treasury
            </span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: t.mintDim, color: t.mint }}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold truncate" style={{ color: t.mint }}>
              {fmtCurrency(financeMetrics.balance)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: t.textMid }}>
              <span style={{ color: t.textMid }}>
                Disbursed: {fmtCurrency(financeMetrics.disbursed)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex justify-between items-center text-[11px]" style={{ borderColor: t.divider }}>
            <span style={{ color: t.warn }}>
              {fmtCurrency(financeMetrics.pendingRequisitions)} pending
            </span>
            <button
              onClick={() => navigate('/dashboard/guild/finance')}
              className="font-semibold hover:underline flex items-center gap-1"
              style={{ color: t.mint }}
            >
              <span>View Ledger</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 3: Live Projects & Welfare Alerts */}
        <div
          className="rounded-xl p-5 border relative overflow-hidden transition-all hover:translate-y-[-2px]"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMid }}>
              Welfare Monitor
            </span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: t.blueDim, color: t.blue }}>
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold" style={{ color: t.textHi }}>
              {welfareReports.filter((r) => r.status === 'OPEN').length} Active Issues
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: t.textMid }}>
              <span>Sickbay · Cafeteria · Hostels</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex justify-between items-center text-[11px]" style={{ borderColor: t.divider }}>
            <span style={{ color: t.textLow }}>Facility inspection logs</span>
            <button
              onClick={() => navigate('/dashboard/guild/welfare')}
              className="font-semibold hover:underline flex items-center gap-1"
              style={{ color: t.mint }}
            >
              <span>Inspect</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 4: Election Status & Turnout */}
        <div
          className="rounded-xl p-5 border relative overflow-hidden transition-all hover:translate-y-[-2px]"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMid }}>
              Election Status
            </span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: t.mintDim, color: t.mint }}>
              <Vote className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold flex items-center gap-2" style={{ color: t.textHi }}>
              <span>{currentElection?.status || 'INACTIVE'}</span>
              {currentElection?.status === 'ACTIVE' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: t.textMid }}>
              <span>
                {currentElection?.status === 'ACTIVE'
                  ? `Live Turnout: ${turnoutPercent}% (${turnoutCount} votes)`
                  : currentElection?.status === 'SCHEDULED'
                  ? 'Upcoming voting window'
                  : 'Term certified'}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex justify-between items-center text-[11px]" style={{ borderColor: t.divider }}>
            <span style={{ color: t.textLow }}>Electoral commission</span>
            <button
              onClick={() => navigate('/dashboard/guild/elections')}
              className="font-semibold hover:underline flex items-center gap-1"
              style={{ color: t.mint }}
            >
              <span>Elections Console</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Grievance Desk Pipeline + Campus Welfare Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Grievance Resolution Desk Pipeline */}
        <div
          className="lg:col-span-2 rounded-2xl p-6 border"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: t.divider }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: t.textHi }}>
                Grievance Resolution Desk
              </h2>
              <p className="text-xs" style={{ color: t.textMid }}>
                Student petitions categorized across Academics, Accommodation, Sanitation, and Security.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/guild/grievances')}
              className="text-xs font-semibold hover:underline flex items-center gap-1"
              style={{ color: t.mint }}
            >
              <span>View all ({grievances.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y mt-2" style={{ borderColor: t.divider }}>
            {grievances.length === 0 ? (
              <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
                No student grievances submitted yet.
              </div>
            ) : (
              grievances.slice(0, 5).map((g) => {
                const statusColor =
                  g.status === 'RESOLVED'
                    ? t.mint
                    : g.status === 'ESCALATED_TO_ADMIN'
                    ? t.red
                    : g.status === 'IN_REVIEW'
                    ? t.gold
                    : t.blue;

                return (
                  <div key={g.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold border"
                          style={{
                            backgroundColor: t.surfaceSubtle,
                            borderColor: t.stroke,
                            color: t.textHi,
                          }}
                        >
                          {g.category}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `${statusColor}22`,
                            color: statusColor,
                          }}
                        >
                          {g.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px]" style={{ color: t.textLow }}>
                          {new Date(g.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold mt-1 text-truncate" style={{ color: t.textHi }}>
                        {g.subject}
                      </h4>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: t.textMid }}>
                        {g.description}
                      </p>

                      <div className="text-[11px] mt-1.5" style={{ color: t.textLow }}>
                        Submitted by: {g.is_anonymous ? 'Anonymous Student' : g.student?.name || 'Student'}
                        {g.student?.current_class ? ` (${g.student.current_class})` : ''}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/dashboard/guild/grievances')}
                      className="px-2.5 py-1 rounded text-xs font-semibold border hover:opacity-80 shrink-0"
                      style={{
                        backgroundColor: t.fieldBg,
                        borderColor: t.stroke,
                        color: t.textHi,
                      }}
                    >
                      Mediate
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Campus Welfare & Announcements */}
        <div className="space-y-6">
          {/* Campus Welfare Monitor */}
          <div
            className="rounded-2xl p-5 border"
            style={{
              backgroundColor: t.panel,
              borderColor: t.stroke,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4" style={{ color: t.mint }} />
                <h3 className="text-sm font-bold" style={{ color: t.textHi }}>
                  Campus Welfare Monitor
                </h3>
              </div>
              <button
                onClick={() => navigate('/dashboard/guild/welfare')}
                className="text-xs hover:underline"
                style={{ color: t.mint }}
              >
                Inspect
              </button>
            </div>

            <div className="space-y-3 mt-3">
              {welfareReports.length === 0 ? (
                <div className="py-6 text-center text-xs" style={{ color: t.textLow }}>
                  No active welfare incident reports.
                </div>
              ) : (
                welfareReports.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg border text-xs"
                    style={{
                      backgroundColor: t.surfaceSubtle,
                      borderColor: t.stroke,
                    }}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span style={{ color: t.textHi }}>{r.facility_type}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor: r.severity === 'CRITICAL' || r.severity === 'HIGH' ? t.deepDim : t.mintDim,
                          color: r.severity === 'CRITICAL' || r.severity === 'HIGH' ? t.red : t.mint,
                        }}
                      >
                        {r.severity}
                      </span>
                    </div>
                    <div className="font-medium mt-1" style={{ color: t.textMid }}>
                      {r.title}
                    </div>
                    <div className="text-[11px] mt-1 line-clamp-1" style={{ color: t.textLow }}>
                      {r.description}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Broadcasts */}
          <div
            className="rounded-2xl p-5 border"
            style={{
              backgroundColor: t.panel,
              borderColor: t.stroke,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4" style={{ color: t.gold }} />
                <h3 className="text-sm font-bold" style={{ color: t.textHi }}>
                  Recent Broadcasts
                </h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="text-xs hover:underline"
                style={{ color: t.mint }}
              >
                + New
              </button>
            </div>

            <div className="space-y-3 mt-3">
              {announcements.length === 0 ? (
                <div className="py-6 text-center text-xs" style={{ color: t.textLow }}>
                  No guild broadcasts published yet.
                </div>
              ) : (
                announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg border text-xs"
                    style={{
                      backgroundColor: t.surfaceSubtle,
                      borderColor: t.stroke,
                    }}
                  >
                    <div className="flex items-center justify-between font-bold" style={{ color: t.textHi }}>
                      <span className="truncate">{a.title}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] uppercase"
                        style={{
                          backgroundColor: t.goldDim,
                          color: t.gold,
                        }}
                      >
                        {a.priority}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px]" style={{ color: t.textMid }}>
                      {a.content}
                    </p>
                    <div className="mt-1.5 text-[10px]" style={{ color: t.textLow }}>
                      Scope: {a.target_scope} · {new Date(a.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Dispatch Modal */}
      <NativeModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        title="Issue Official Guild Dispatch"
        subtitle="Broadcast targeted alerts to the entire student body, specific faculties, or residential halls."
        icon={Megaphone}
        size="lg"
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <div className="relative z-[45] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Dispatch Subject / Title
            </label>
            <input
              type="text"
              required
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="e.g. Guild Bursary Applications & Sanitary Drive"
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-[35] focus-within:z-[50]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Target Audience Scope
              </label>
              <LiquidGlassSelect
                value={broadcastScope}
                onChange={(val) => setBroadcastScope(val as any)}
                options={SCOPE_OPTIONS}
                placeholder="Select Scope"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Priority Level
              </label>
              <LiquidGlassSelect
                value={broadcastPriority}
                onChange={(val) => setBroadcastPriority(val as any)}
                options={PRIORITY_OPTIONS}
                placeholder="Select Priority"
              />
            </div>
          </div>

          <div className="relative z-[30] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Announcement Body & Resolutions
            </label>
            <textarea
              required
              rows={4}
              value={broadcastContent}
              onChange={(e) => setBroadcastContent(e.target.value)}
              placeholder="State the resolution details, event timing, or guild action items..."
              className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowBroadcastModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingBroadcast}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 disabled:opacity-50 transition-all"
            >
              {submittingBroadcast ? 'Publishing...' : 'Publish Dispatch'}
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
