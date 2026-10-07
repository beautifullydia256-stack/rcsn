import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useGuild } from '@/context/GuildContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import {
  MessageSquareQuote,
  Send,
  ShieldCheck,
  EyeOff,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  Plus,
  RefreshCw
} from 'lucide-react';
import type { StudentGrievance, GrievanceCategory } from '@/types/guild';

export default function StudentGrievancePage() {
  const { studentId, schoolId } = useGuild();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [grievances, setGrievances] = useState<StudentGrievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Form state
  const [category, setCategory] = useState<GrievanceCategory>('Academics');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const fetchMyGrievances = async () => {
    if (!studentId || !schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_grievances')
        .select(`
          *,
          assigned_portfolio:guild_portfolios(title)
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrievances((data as StudentGrievance[]) || []);
    } catch (err) {
      console.error('[StudentGrievancePage] Error fetching student grievances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyGrievances();
  }, [studentId, schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !schoolId || !subject.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('student_grievances').insert({
        school_id: schoolId,
        student_id: studentId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        is_anonymous: isAnonymous,
        status: 'SUBMITTED',
      });

      if (error) throw error;

      setSubject('');
      setDescription('');
      setIsAnonymous(false);
      setShowSubmitModal(false);
      fetchMyGrievances();
    } catch (err: any) {
      alert(`Failed to submit grievance: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              Student Welfare Desk
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight" style={{ color: t.textHi }}>
            Submit & Track Grievances
          </h1>
          <p className="text-xs mt-1" style={{ color: t.textMid }}>
            Lodge petitions directly to your Guild Council. Choose anonymous filing if you require confidentiality.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMyGrievances}
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
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-all"
            style={{
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Lodge Grievance</span>
          </button>
        </div>
      </div>

      {/* Submitted Grievances List */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
        }}
      >
        <div className="p-4 border-b font-bold text-sm" style={{ borderColor: t.divider, color: t.textHi }}>
          My Petitions & Resolution History
        </div>

        <div className="divide-y" style={{ borderColor: t.divider }}>
          {loading ? (
            <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
              Loading your grievances...
            </div>
          ) : grievances.length === 0 ? (
            <div className="py-16 text-center text-xs" style={{ color: t.textLow }}>
              You have not submitted any grievances yet. Click &quot;Lodge Grievance&quot; above to petition your Guild Council.
            </div>
          ) : (
            grievances.map((g) => {
              const statusColor =
                g.status === 'RESOLVED'
                  ? t.mint
                  : g.status === 'ESCALATED_TO_ADMIN'
                  ? t.red
                  : g.status === 'IN_REVIEW'
                  ? t.gold
                  : t.blue;

              return (
                <div key={g.id} className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
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
                      {g.is_anonymous && (
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: t.textLow }}>
                          <EyeOff className="w-3 h-3" />
                          <span>Anonymous</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px]" style={{ color: t.textLow }}>
                      {new Date(g.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold" style={{ color: t.textHi }}>
                    {g.subject}
                  </h3>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: t.textMid }}>
                    {g.description}
                  </p>

                  {g.assigned_portfolio?.title && (
                    <div className="text-[11px]" style={{ color: t.blue }}>
                      Under Ministerial Review: <strong>{g.assigned_portfolio.title}</strong>
                    </div>
                  )}

                  {g.resolution_notes && (
                    <div
                      className="mt-2 p-3 rounded-lg border text-xs space-y-1"
                      style={{
                        backgroundColor: t.surfaceSubtle,
                        borderColor: t.stroke,
                      }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: t.mint }}>
                        Guild Council Resolution:
                      </span>
                      <p style={{ color: t.textHi }}>{g.resolution_notes}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Submission Modal */}
      <NativeModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Lodge Student Grievance"
        subtitle="Your petition will be routed directly to the Guild Executive Council for mediation or administrative escalation."
        icon={MessageSquareQuote}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-white">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-slate-900/90 dark:bg-black/90 hover:border-white/35 focus:border-white/70 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            >
              <option value="Academics" className="bg-slate-900 text-white">Academics & Lecturer Issues</option>
              <option value="Hostel" className="bg-slate-900 text-white">Hostel & Accommodation</option>
              <option value="Sanitation" className="bg-slate-900 text-white">Sanitation, Water & Facilities</option>
              <option value="Security" className="bg-slate-900 text-white">Security & Campus Safety</option>
              <option value="Welfare" className="bg-slate-900 text-white">Food & Cafeteria Hygiene</option>
              <option value="Dispute" className="bg-slate-900 text-white">Student-to-Student Dispute</option>
              <option value="Other" className="bg-slate-900 text-white">Other Issues</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Subject / Summary
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Hall 4 Water Supply Interruption"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Full Description
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide precise details of the issue, dates, affected students or locations..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition resize-none"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="anonymous-check"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-white/30 text-emerald-500 focus:ring-emerald-400"
            />
            <label htmlFor="anonymous-check" className="text-xs text-white/80 cursor-pointer select-none">
              Submit Anonymously (Hide my student identity from cabinet records)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-white/15">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Petition'}</span>
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
