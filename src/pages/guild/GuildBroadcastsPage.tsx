import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useGuild } from '@/context/GuildContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Radio,
  Clock,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Building
} from 'lucide-react';
import type { GuildAnnouncement, AnnouncementPriority } from '@/types/guild';

export default function GuildBroadcastsPage() {
  const { schoolId, activeTenure, portfolioTitle, isPresident, canBroadcast } = useGuild();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [announcements, setAnnouncements] = useState<GuildAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // New broadcast modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<'ALL' | 'FACULTY' | 'CLASS' | 'HOSTEL'>('ALL');
  const [targetValue, setTargetValue] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [submitting, setSubmitting] = useState(false);

  const fetchBroadcasts = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guild_announcements')
        .select(`
          *,
          tenure:guild_tenures(
            portfolio:guild_portfolios(title),
            student:students(name)
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements((data as GuildAnnouncement[]) || []);
    } catch (err) {
      console.error('[GuildBroadcastsPage] Error fetching broadcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, [schoolId]);

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !activeTenure?.id || !title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('guild_announcements').insert({
        school_id: schoolId,
        tenure_id: activeTenure.id,
        title: title.trim(),
        content: content.trim(),
        target_scope: scope,
        target_value: targetValue.trim() || null,
        priority,
      });

      if (error) throw error;

      setTitle('');
      setContent('');
      setTargetValue('');
      setShowModal(false);
      fetchBroadcasts();
    } catch (err: any) {
      alert(`Failed to publish broadcast: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
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
              Cabinet Communiqués
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight" style={{ color: t.textHi }}>
            Broadcasts & Senate Dispatches
          </h1>
          <p className="text-xs mt-1" style={{ color: t.textMid }}>
            Issue targeted notifications to the entire student body, specific faculties, class streams, or residential halls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchBroadcasts}
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
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-all"
            style={{
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
            }}
          >
            <Send className="w-4 h-4" />
            <span>Issue New Dispatch</span>
          </button>
        </div>
      </div>

      {/* Broadcasts List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div
            className="p-16 text-center rounded-2xl border text-xs"
            style={{
              backgroundColor: t.panel,
              borderColor: t.stroke,
              color: t.textLow,
            }}
          >
            No guild broadcasts published yet. Click &quot;Issue New Dispatch&quot; to reach the student body.
          </div>
        ) : (
          announcements.map((a) => {
            const isUrgent = a.priority === 'URGENT';
            const isHigh = a.priority === 'HIGH';

            return (
              <div
                key={a.id}
                className="rounded-xl p-6 border space-y-3"
                style={{
                  backgroundColor: t.panel,
                  borderColor: isUrgent ? t.red : t.stroke,
                }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: isUrgent ? t.deepDim : isHigh ? t.goldDim : t.surfaceSubtle,
                        color: isUrgent ? t.red : isHigh ? t.gold : t.textMid,
                      }}
                    >
                      {a.priority}
                    </span>

                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] font-bold border"
                      style={{
                        backgroundColor: t.surfaceSubtle,
                        borderColor: t.stroke,
                        color: t.textHi,
                      }}
                    >
                      Target: {a.target_scope}
                      {a.target_value ? ` · ${a.target_value}` : ''}
                    </span>
                  </div>

                  <span className="text-[11px]" style={{ color: t.textLow }}>
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold" style={{ color: t.textHi }}>
                    {a.title}
                  </h3>
                  <p className="text-xs mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: t.textMid }}>
                    {a.content}
                  </p>
                </div>

                <div className="pt-3 border-t flex items-center justify-between text-[11px]" style={{ borderColor: t.divider }}>
                  <div style={{ color: t.textLow }}>
                    Dispatched by: <strong>{a.tenure?.portfolio?.title || 'Cabinet Officer'}</strong>
                    {a.tenure?.student?.name ? ` (${a.tenure.student.name})` : ''}
                  </div>

                  <span className="flex items-center gap-1 font-semibold" style={{ color: t.mint }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dispatched to Student Portal</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 border shadow-2xl space-y-4"
            style={{
              backgroundColor: t.panel,
              borderColor: t.strokeHi,
            }}
          >
            <h3 className="text-lg font-bold" style={{ color: t.textHi }}>
              Issue Council Communiqué
            </h3>
            <p className="text-xs" style={{ color: t.textMid }}>
              Broadcast resolutions, bursary deadlines, or official statements to the student body.
            </p>

            <form onSubmit={handleCreateBroadcast} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                  Communiqué Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Guild Bursary Applications & Sanitary Drive"
                  className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                  style={{
                    backgroundColor: t.fieldBg,
                    borderColor: t.stroke,
                    color: t.textHi,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                    Target Audience Scope
                  </label>
                  <select
                    value={scope}
                    onChange={(e: any) => setScope(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{
                      backgroundColor: t.fieldBg,
                      borderColor: t.stroke,
                      color: t.textHi,
                    }}
                  >
                    <option value="ALL">Entire Student Body</option>
                    <option value="FACULTY">Specific Faculty</option>
                    <option value="CLASS">Class Stream</option>
                    <option value="HOSTEL">Residential Hall</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{
                      backgroundColor: t.fieldBg,
                      borderColor: t.stroke,
                      color: t.textHi,
                    }}
                  >
                    <option value="NORMAL">Normal Notice</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent Senate Dispatch</option>
                  </select>
                </div>
              </div>

              {scope !== 'ALL' && (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                    Target Filter Value ({scope === 'FACULTY' ? 'Faculty Name' : scope === 'CLASS' ? 'Class Name' : 'Hall Name'})
                  </label>
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="e.g. Faculty of Science / Hall 2"
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{
                      backgroundColor: t.fieldBg,
                      borderColor: t.stroke,
                      color: t.textHi,
                    }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                  Announcement Body & Text
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Specify resolution, action dates, guidelines..."
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
                  onClick={() => setShowModal(false)}
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
                  {submitting ? 'Publishing...' : 'Publish Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
