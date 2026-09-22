import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useParentPortal } from '@/context/ParentPortalContext';
import { useUIStore } from '@/store/uiStore';
import {
  Megaphone,
  ArrowLeft,
  Calendar,
  Bell,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

type Row = {
  notification_id: string;
  title: string | null;
  message: string | null;
  created_at: string | null;
};

export default function ParentNoticesPage() {
  const { schoolId, ready } = useParentPortal();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('notification_id, title, message, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(80);
      if (!cancelled) {
        setRows((data as Row[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId]);

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/dashboard/parent"
          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline mb-2"
          style={{ color: t.mint }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(217,119,6,0.12)',
                  color: t.gold,
                  fontFamily: SORA,
                }}
              >
                ADMINISTRATIVE CIRCULARS
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
              style={{ fontFamily: SORA, color: t.textHi }}
            >
              School Notices & Circulars
            </h1>
            <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
              Official school newsletters, visitation days, term opening guidelines, and administrative memos.
            </p>
          </div>
        </div>
      </div>

      {/* Notices List */}
      <div
        className="p-5 sm:p-6 rounded-3xl shadow-sm space-y-4"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
              Broadcast Announcements
            </span>
          </div>
          <span className="text-xs" style={{ color: t.textLow }}>
            {rows.length} Published Notices
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-medium" style={{ color: t.textLow }}>
            Loading school notices...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
            No administrative notices published right now. Check back periodically for term updates.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((n) => {
              const d = n.created_at ? new Date(n.created_at) : null;
              const formattedDate = d
                ? d.toLocaleDateString('en-UG', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={n.notification_id}
                  className="p-5 rounded-2xl space-y-2.5 transition-all"
                  style={{
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.12)',
                        color: t.blue,
                      }}
                    >
                      Official Memo
                    </span>

                    <span className="text-[11px]" style={{ color: t.textLow }}>
                      {formattedDate}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold tracking-tight" style={{ color: t.textHi }}>
                    {n.title || 'Notice'}
                  </h3>

                  {n.message && (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: t.textMid }}>
                      {n.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
