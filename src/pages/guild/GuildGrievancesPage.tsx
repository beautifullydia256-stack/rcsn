import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useGuild } from '@/context/GuildContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  MessageSquareQuote,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Send,
  UserCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  Eye,
  Check,
  Building
} from 'lucide-react';
import type { StudentGrievance, GrievanceStatus, GrievanceCategory, GuildPortfolio } from '@/types/guild';
import { NativeModal } from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';


export default function GuildGrievancesPage() {
  const { schoolId, activeTenure, portfolioTitle, isPresident, canManageGrievances } = useGuild();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [loading, setLoading] = useState(true);
  const [grievances, setGrievances] = useState<StudentGrievance[]>([]);
  const [portfolios, setPortfolios] = useState<GuildPortfolio[]>([]);

  // Filter state
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected grievance for mediation/resolution modal
  const [activeGrievance, setActiveGrievance] = useState<StudentGrievance | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assignPortfolioId, setAssignPortfolioId] = useState('');
  const [updating, setUpdating] = useState(false);

  const portfolioOptions = useMemo(() => [
    { value: '', label: 'Unassigned (Cabinet General)' },
    ...portfolios.map((p) => ({ value: p.id, label: p.title }))
  ], [portfolios]);

  const fetchGrievances = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [grievancesRes, portfoliosRes] = await Promise.all([
        supabase
          .from('student_grievances')
          .select(`
            *,
            student:students(name, current_class, admission_number),
            assigned_portfolio:guild_portfolios(title)
          `)
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false }),
        supabase
          .from('guild_portfolios')
          .select('*')
          .eq('school_id', schoolId)
          .order('title'),
      ]);

      setGrievances((grievancesRes.data as StudentGrievance[]) || []);
      setPortfolios((portfoliosRes.data as GuildPortfolio[]) || []);
    } catch (err) {
      console.error('[GuildGrievancesPage] Error fetching grievances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, [schoolId]);

  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      if (selectedStatus !== 'ALL' && g.status !== selectedStatus) return false;
      if (selectedCategory !== 'ALL' && g.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = g.subject.toLowerCase().includes(q);
        const matchDesc = g.description.toLowerCase().includes(q);
        const matchStudent = g.student?.name?.toLowerCase().includes(q);
        if (!matchSub && !matchDesc && !matchStudent) return false;
      }
      return true;
    });
  }, [grievances, selectedStatus, selectedCategory, searchQuery]);

  const handleUpdateStatus = async (newStatus: GrievanceStatus) => {
    if (!activeGrievance || !activeTenure) return;
    setUpdating(true);
    try {
      const updates: any = {
        status: newStatus,
        resolution_notes: resolutionNotes.trim() || activeGrievance.resolution_notes,
      };

      if (assignPortfolioId) {
        updates.assigned_portfolio_id = assignPortfolioId;
      }

      if (newStatus === 'RESOLVED') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = activeTenure.id;
      } else if (newStatus === 'ESCALATED_TO_ADMIN') {
        updates.escalated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('student_grievances')
        .update(updates)
        .eq('id', activeGrievance.id);

      if (error) throw error;

      setActiveGrievance(null);
      setResolutionNotes('');
      fetchGrievances();
    } catch (err: any) {
      alert(`Failed to update grievance: ${err.message || 'Unknown error'}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
              Mediation & Advocacy
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight" style={{ color: t.textHi }}>
            Student Grievance Resolution Desk
          </h1>
          <p className="text-xs mt-1" style={{ color: t.textMid }}>
            Review, investigate, mediate internally or escalate student welfare petitions directly to University Administration.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchGrievances}
          className="p-2 rounded-lg border hover:opacity-80 transition-opacity"
          style={{
            borderColor: t.stroke,
            color: t.textHi,
            backgroundColor: t.fieldBg,
          }}
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center gap-3"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
        }}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5" style={{ color: t.textLow }} />
          <input
            type="text"
            placeholder="Search by student, subject, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border outline-none"
            style={{
              backgroundColor: t.fieldBg,
              borderColor: t.stroke,
              color: t.textHi,
            }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs border outline-none font-medium"
            style={{
              backgroundColor: t.fieldBg,
              borderColor: t.stroke,
              color: t.textHi,
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted (New)</option>
            <option value="IN_REVIEW">In Review (Active)</option>
            <option value="ESCALATED_TO_ADMIN">Escalated to Admin</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs border outline-none font-medium"
            style={{
              backgroundColor: t.fieldBg,
              borderColor: t.stroke,
              color: t.textHi,
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="Academics">Academics</option>
            <option value="Hostel">Accommodation / Hostel</option>
            <option value="Sanitation">Sanitation & Water</option>
            <option value="Security">Security</option>
            <option value="Dispute">Dispute</option>
            <option value="Welfare">Welfare & Food</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Grievances List */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
        }}
      >
        <div className="divide-y" style={{ borderColor: t.divider }}>
          {filteredGrievances.length === 0 ? (
            <div className="py-16 text-center text-xs" style={{ color: t.textLow }}>
              No grievances match the specified filters.
            </div>
          ) : (
            filteredGrievances.map((g) => {
              const statusColor =
                g.status === 'RESOLVED'
                  ? t.mint
                  : g.status === 'ESCALATED_TO_ADMIN'
                  ? t.red
                  : g.status === 'IN_REVIEW'
                  ? t.gold
                  : t.blue;

              return (
                <div key={g.id} className="p-5 hover:opacity-95 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${statusColor}22`,
                          color: statusColor,
                        }}
                      >
                        {g.status.replace(/_/g, ' ')}
                      </span>
                      {g.assigned_portfolio?.title && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: t.blueDim,
                            color: t.blue,
                          }}
                        >
                          Assigned: {g.assigned_portfolio.title}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px]" style={{ color: t.textLow }}>
                      {new Date(g.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold mt-2" style={{ color: t.textHi }}>
                    {g.subject}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed whitespace-pre-wrap" style={{ color: t.textMid }}>
                    {g.description}
                  </p>

                  {g.resolution_notes && (
                    <div
                      className="mt-3 p-3 rounded-lg border text-xs"
                      style={{
                        backgroundColor: t.surfaceSubtle,
                        borderColor: t.stroke,
                      }}
                    >
                      <strong className="block text-[11px] font-bold uppercase" style={{ color: t.mint }}>
                        Resolution / Mediation Notes:
                      </strong>
                      <span style={{ color: t.textMid }}>{g.resolution_notes}</span>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderColor: t.divider }}>
                    <div className="text-[11px]" style={{ color: t.textLow }}>
                      Filed by: <strong>{g.is_anonymous ? 'Anonymous Student' : g.student?.name || 'Student'}</strong>
                      {g.student?.current_class ? ` · ${g.student.current_class}` : ''}
                      {g.student?.admission_number ? ` (${g.student.admission_number})` : ''}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveGrievance(g);
                          setResolutionNotes(g.resolution_notes || '');
                          setAssignPortfolioId(g.assigned_portfolio_id || '');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:opacity-90 transition-all flex items-center gap-1.5"
                        style={{
                          backgroundColor: t.fieldBg,
                          borderColor: t.strokeHi,
                          color: t.textHi,
                        }}
                      >
                        <UserCheck className="w-3.5 h-3.5" style={{ color: t.mint }} />
                        <span>Take Action / Mediate</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mediation Action Modal */}
      <NativeModal
        isOpen={Boolean(activeGrievance)}
        onClose={() => setActiveGrievance(null)}
        title={activeGrievance?.subject || 'Grievance Mediation'}
        subtitle={activeGrievance ? `Filed by ${activeGrievance.student?.name || 'Trainee'} (${activeGrievance.student?.admission_number || 'N/A'})` : 'Internal dispute resolution'}
        icon={MessageSquareQuote}
        size="lg"
      >
        {activeGrievance && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Grievance Statement
              </span>
              <p className="text-xs text-white/90 leading-relaxed">
                {activeGrievance.description}
              </p>
            </div>

            <div className="relative z-[45] focus-within:z-[50]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Assign Ministerial Portfolio
              </label>
              <LiquidGlassSelect
                value={assignPortfolioId}
                onChange={(val) => setAssignPortfolioId(val)}
                options={portfolioOptions}
                placeholder="Assign Portfolio"
              />
            </div>

            <div className="relative z-[35] focus-within:z-[50]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Mediation & Resolution Notes
              </label>
              <textarea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Log internal mediation steps, meeting outcome with administration, or resolution instructions..."
                className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
              <button
                type="button"
                onClick={() => setActiveGrievance(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('ESCALATED_TO_ADMIN')}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/50 border border-rose-700/50 hover:bg-rose-900/60 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all shadow-md"
                  title="Escalate directly to School Admin & Dean of Students"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Escalate to Admin</span>
                </button>

                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </NativeModal>
    </div>
  );
}
