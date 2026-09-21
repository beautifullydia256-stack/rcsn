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
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 border shadow-2xl space-y-4"
            style={{
              backgroundColor: t.panel,
              borderColor: t.strokeHi,
            }}
          >
            <h3 className="text-lg font-bold" style={{ color: t.textHi }}>
              Log Campus Welfare Incident
            </h3>
            <p className="text-xs" style={{ color: t.textMid }}>
              Record facility inspections, hygiene violations, or urgent clinic supply shortages.
            </p>

            <form onSubmit={handleCreateReport} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                    Facility Type
                  </label>
                  <select
                    value={facilityType}
                    onChange={(e) => setFacilityType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{
                      backgroundColor: t.fieldBg,
                      borderColor: t.stroke,
                      color: t.textHi,
                    }}
                  >
                    <option value="Sickbay/Clinic">Sickbay / Health Clinic</option>
                    <option value="Cafeteria/Food">Cafeteria / Food Hygiene</option>
                    <option value="Hostel/Accommodation">Hostel / Residential Hall</option>
                    <option value="Sanitation/Water">Sanitation / Water Tanks</option>
                    <option value="Security">Security / Perimeter Lighting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                    Severity Level
                  </label>
                  <select
                    value={severity}
                    onChange={(e: any) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{
                      backgroundColor: t.fieldBg,
                      borderColor: t.stroke,
                      color: t.textHi,
                    }}
                  >
                    <option value="LOW">Low (Minor Notice)</option>
                    <option value="MEDIUM">Medium (Noticeable Defect)</option>
                    <option value="HIGH">High (Urgent Attention)</option>
                    <option value="CRITICAL">Critical (Immediate Health/Safety Risk)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                  Incident Title / Headline
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Broken Water Pump in Hall 3 Annex"
                  className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                  style={{
                    backgroundColor: t.fieldBg,
                    borderColor: t.stroke,
                    color: t.textHi,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                  Inspection Findings & Impact
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail condition found, student population affected, and recommended intervention..."
                  className="w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none"
                  style={{
                    backgroundColor: t.fieldBg,
                    borderColor: t.stroke,
                    color: t.textHi,
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: t.divider }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border hover:opacity-80"
                  style={{
                    backgroundColor: t.fieldBg,
                    borderColor: t.stroke,
                    color: t.textHi,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                    color: t.ctaText,
                  }}
                >
                  {submitting ? 'Logging...' : 'Save Incident Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action / Mitigation Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 border shadow-2xl space-y-4"
            style={{
              backgroundColor: t.panel,
              borderColor: t.strokeHi,
            }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.mint }}>
                Mitigation & Escalation Pipeline
              </span>
              <h3 className="text-lg font-bold" style={{ color: t.textHi }}>
                {activeReport.title}
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                Action Taken Notes
              </label>
              <textarea
                rows={3}
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="Log dispatched maintenance team, emergency water delivery, or sanitization schedule..."
                className="w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none"
                style={{
                  backgroundColor: t.fieldBg,
                  borderColor: t.stroke,
                  color: t.textHi,
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: t.divider }}>
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold border hover:opacity-80"
                style={{
                  backgroundColor: t.fieldBg,
                  borderColor: t.stroke,
                  color: t.textHi,
                }}
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('ESCALATED')}
                  className="w-full sm:w-auto px-3 py-2 rounded-lg text-xs font-semibold text-red-300 bg-red-950/40 border border-red-800/40 hover:bg-red-900/40 flex items-center justify-center gap-1.5"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Escalate to Estates Admin</span>
                </button>

                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5"
                  style={{
                    background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                    color: t.ctaText,
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
