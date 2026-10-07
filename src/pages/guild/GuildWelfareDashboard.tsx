import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useGuild } from '@/context/GuildContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  HeartPulse,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Building,
  Utensils,
  Droplets,
  Activity,
  Check
} from 'lucide-react';
import type { GuildWelfareReport, WelfareSeverity, WelfareStatus } from '@/types/guild';
import { NativeModal } from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';

const FACILITY_OPTIONS = [
  { value: 'Sickbay/Clinic', label: 'Sickbay / Health Clinic' },
  { value: 'Cafeteria/Food', label: 'Cafeteria / Food Hygiene' },
  { value: 'Hostel/Accommodation', label: 'Hostel / Residential Hall' },
  { value: 'Sanitation/Water', label: 'Sanitation / Water Tanks' },
  { value: 'Security', label: 'Security / Perimeter Lighting' },
];

const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'Low (Minor Notice)' },
  { value: 'MEDIUM', label: 'Medium (Noticeable Defect)' },
  { value: 'HIGH', label: 'High (Urgent Attention)' },
  { value: 'CRITICAL', label: 'Critical (Immediate Health/Safety Risk)' },
];


export default function GuildWelfareDashboard() {
  const { schoolId, activeTenure, portfolioTitle, isPresident, canViewWelfare } = useGuild();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [reports, setReports] = useState<GuildWelfareReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  // New report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [facilityType, setFacilityType] = useState('Sickbay/Clinic');
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<WelfareSeverity>('MEDIUM');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Take action modal
  const [activeReport, setActiveReport] = useState<GuildWelfareReport | null>(null);
  const [actionText, setActionText] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchReports = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guild_welfare_reports')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data as GuildWelfareReport[]) || []);
    } catch (err) {
      console.error('[GuildWelfareDashboard] Error fetching welfare reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [schoolId]);

  const stats = useMemo(() => {
    const total = reports.length;
    const critical = reports.filter((r) => r.severity === 'CRITICAL' && r.status !== 'RESOLVED').length;
    const open = reports.filter((r) => r.status === 'OPEN' || r.status === 'INVESTIGATING').length;
    const resolved = reports.filter((r) => r.status === 'RESOLVED').length;
    return { total, critical, open, resolved };
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filterType === 'ALL') return true;
      if (filterType === 'CRITICAL') return r.severity === 'CRITICAL';
      if (filterType === 'OPEN') return r.status === 'OPEN' || r.status === 'INVESTIGATING';
      if (filterType === 'RESOLVED') return r.status === 'RESOLVED';
      if (r.facility_type === filterType) return true;
      return true;
    });
  }, [reports, filterType]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('guild_welfare_reports').insert({
        school_id: schoolId,
        tenure_id: activeTenure?.id || null,
        facility_type: facilityType,
        title: title.trim(),
        severity,
        status: 'OPEN',
        description: description.trim(),
      });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setShowReportModal(false);
      fetchReports();
    } catch (err: any) {
      alert(`Failed to log welfare incident: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: WelfareStatus) => {
    if (!activeReport) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('guild_welfare_reports')
        .update({
          status: newStatus,
          action_taken: actionText.trim() || activeReport.action_taken,
        })
        .eq('id', activeReport.id);

      if (error) throw error;

      setActiveReport(null);
      setActionText('');
      fetchReports();
    } catch (err: any) {
      alert(`Update failed: ${err.message || 'Unknown error'}`);
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
              Ministry of Health & Welfare
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight" style={{ color: t.textHi }}>
            Campus Health & Welfare Monitoring
          </h1>
          <p className="text-xs mt-1" style={{ color: t.textMid }}>
            Monitor clinic/sickbay trends, cafeteria hygiene, sanitation infrastructure, and emergency escalation pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReports}
            className="p-2 rounded-lg border hover:opacity-80"
            style={{
              borderColor: t.stroke,
              color: t.textHi,
              backgroundColor: t.fieldBg,
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-all"
            style={{
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Log Inspection / Incident</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
            Active Open Incidents
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: t.textHi }}>
            {stats.open}
          </div>
          <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
            Currently under monitoring
          </div>
        </div>

        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
            Critical Escalations
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: stats.critical > 0 ? t.red : t.mint }}>
            {stats.critical}
          </div>
          <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
            Requires institutional intervention
          </div>
        </div>

        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
            Resolved Issues
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: t.mint }}>
            {stats.resolved}
          </div>
          <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
            Inspected and verified closed
          </div>
        </div>

        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
            Total Recorded Logs
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: t.blue }}>
            {stats.total}
          </div>
          <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
            Comprehensive term audit
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        {['ALL', 'Sickbay/Clinic', 'Cafeteria/Food', 'Hostel/Accommodation', 'Sanitation/Water', 'Security', 'CRITICAL'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterType(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filterType === f
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Incident Log Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReports.length === 0 ? (
          <div
            className="col-span-2 p-12 text-center rounded-2xl border text-xs"
            style={{
              backgroundColor: t.panel,
              borderColor: t.stroke,
              color: t.textLow,
            }}
          >
            No welfare incident reports found for this filter.
          </div>
        ) : (
          filteredReports.map((r) => {
            const isCritical = r.severity === 'CRITICAL' || r.severity === 'HIGH';
            const isResolved = r.status === 'RESOLVED';

            return (
              <div
                key={r.id}
                className="rounded-xl p-5 border space-y-3"
                style={{
                  backgroundColor: t.panel,
                  borderColor: t.stroke,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold border"
                      style={{
                        backgroundColor: t.surfaceSubtle,
                        borderColor: t.stroke,
                        color: t.textHi,
                      }}
                    >
                      {r.facility_type}
                    </span>

                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: isCritical ? t.deepDim : t.mintDim,
                        color: isCritical ? t.red : t.mint,
                      }}
                    >
                      {r.severity}
                    </span>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                    style={{
                      backgroundColor: isResolved ? t.mintDim : t.goldDim,
                      color: isResolved ? t.mint : t.gold,
                    }}
                  >
                    {r.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold" style={{ color: t.textHi }}>
                    {r.title}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: t.textMid }}>
                    {r.description}
                  </p>
                </div>

                {r.action_taken && (
                  <div
                    className="p-3 rounded-lg border text-xs"
                    style={{
                      backgroundColor: t.surfaceSubtle,
                      borderColor: t.stroke,
                    }}
                  >
                    <span className="font-bold block text-[10px] uppercase" style={{ color: t.mint }}>
                      Action Taken / Mitigation:
                    </span>
                    <span style={{ color: t.textMid }}>{r.action_taken}</span>
                  </div>
                )}

                <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: t.divider }}>
                  <span className="text-[11px]" style={{ color: t.textLow }}>
                    Reported: {new Date(r.created_at).toLocaleDateString()}
                  </span>

                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReport(r);
                        setActionText(r.action_taken || '');
                      }}
                      className="px-3 py-1 rounded text-xs font-semibold border hover:opacity-80"
                      style={{
                        backgroundColor: t.fieldBg,
                        borderColor: t.strokeHi,
                        color: t.textHi,
                      }}
                    >
                      Take Action
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Incident Modal */}
      <NativeModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Log Campus Welfare Incident"
        subtitle="Record facility inspections, hygiene violations, or urgent clinic supply shortages."
        icon={HeartPulse}
        size="lg"
      >
        <form onSubmit={handleCreateReport} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 relative z-[45] focus-within:z-[50]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Facility Type
              </label>
              <LiquidGlassSelect
                value={facilityType}
                onChange={(val) => setFacilityType(val)}
                options={FACILITY_OPTIONS}
                placeholder="Select Facility"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Severity Level
              </label>
              <LiquidGlassSelect
                value={severity}
                onChange={(val) => setSeverity(val as WelfareSeverity)}
                options={SEVERITY_OPTIONS}
                placeholder="Select Severity"
              />
            </div>
          </div>

          <div className="relative z-[35] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Incident Title / Headline
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken Water Pump in Hall 3 Annex"
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
            />
          </div>

          <div className="relative z-[30] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Inspection Findings & Impact
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail condition found, student population affected, and recommended intervention..."
              className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Logging...' : 'Save Incident Log'}
            </button>
          </div>
        </form>
      </NativeModal>

      {/* Action / Mitigation Modal */}
      <NativeModal
        isOpen={Boolean(activeReport)}
        onClose={() => setActiveReport(null)}
        title={activeReport?.title || 'Mitigation & Action Pipeline'}
        subtitle="Log dispatched maintenance team, emergency water delivery, or sanitization schedule."
        icon={ShieldAlert}
        size="md"
      >
        {activeReport && (
          <div className="space-y-4">
            <div className="relative z-[35] focus-within:z-[50]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Action Taken Notes
              </label>
              <textarea
                rows={4}
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="Log dispatched maintenance team, emergency water delivery, or sanitization schedule..."
                className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('ESCALATED')}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/50 border border-rose-700/50 hover:bg-rose-900/60 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all shadow-md"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Escalate to Estates Admin</span>
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
