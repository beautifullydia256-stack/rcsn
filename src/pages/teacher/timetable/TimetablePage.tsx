import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTeacherContext } from '../useTeacherContext';
import { formatTimetableTime, timetableDayNameToIndex } from '@/lib/timetableDay';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type TimetableRow = {
  id: string;
  class_name: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
};

export default function TeacherTimetablePage() {
  const navigate = useNavigate();
  const { schoolId, teacherId, isLoading: ctxLoading } = useTeacherContext();

  const { data: rows = [], isLoading: tableLoading } = useQuery({
    queryKey: ['teacher', 'timetable', schoolId ?? '', teacherId ?? ''],
    queryFn: async (): Promise<TimetableRow[]> => {
      if (!schoolId || !teacherId) return [];
      const { data, error } = await supabase
        .from('timetable_periods')
        .select('id, class_name, subject, day_of_week, start_time, end_time')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId);
      if (error) throw error;
      const raw = (data || []) as {
        id: number | string;
        class_name: string;
        subject: string;
        day_of_week: string;
        start_time: string;
        end_time: string;
      }[];
      const mapped: TimetableRow[] = [];
      for (const r of raw) {
        const dayIx = timetableDayNameToIndex(r.day_of_week);
        if (dayIx === null) continue;
        mapped.push({
          id: String(r.id),
          class_name: r.class_name,
          subject: r.subject,
          day_of_week: dayIx,
          start_time: formatTimetableTime(r.start_time),
          end_time: formatTimetableTime(r.end_time),
          room: undefined,
        });
      }
      mapped.sort(
        (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
      );
      return mapped;
    },
    enabled: !!schoolId && !!teacherId,
  });

  const byDay = DAYS.map((_, i) => rows.filter((r) => r.day_of_week === i));
  const hasAny = rows.length > 0;
  const isLoading = ctxLoading || tableLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold ac-text-primary">My Timetable</h1>
        <div className="flex gap-2 print:hidden">
          {hasAny && (
            <button
              type="button"
              className="ac-glass-btn rounded-xl px-3 py-2 text-sm font-medium ac-text-primary border border-[var(--ac-border)]"
              onClick={() => window.print()}
              title="Use your browser print dialog and choose Save as PDF"
            >
              Print / Save PDF
            </button>
          )}
          <button
            type="button"
            className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
            onClick={() => navigate('/dashboard/teacher')}
          >
            Back
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 rounded ac-skeleton-block" />
            <div className="h-10 w-full rounded ac-skeleton-block" />
            <div className="h-10 w-full rounded ac-skeleton-block" />
          </div>
        </div>
      )}

      {!isLoading && !hasAny && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">
            No timetable entries yet. Your admin can add your schedule in school settings.
          </p>
        </div>
      )}

      {!isLoading && hasAny && (
        <div className="ac-glass-card border border-[var(--ac-border)] overflow-hidden">
          <div className="overflow-x-auto">
            {DAYS.map((dayName, dayIndex) => {
              const dayRows = byDay[dayIndex];
              if (!dayRows || dayRows.length === 0) return null;
              return (
                <div key={dayName} className="border-b border-[var(--ac-border)] last:border-0">
                  <h2 className="p-3 font-semibold ac-text-primary bg-[var(--ac-bg)]/50">{dayName}</h2>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--ac-border)] ac-text-muted text-sm">
                        <th className="p-3 font-medium">Time</th>
                        <th className="p-3 font-medium">Class</th>
                        <th className="p-3 font-medium">Subject</th>
                        <th className="p-3 font-medium">Room</th>
                      </tr>
                    </thead>
                    <tbody className="ac-text-primary">
                      {dayRows.map((r) => (
                        <tr key={r.id} className="border-b border-[var(--ac-border)] last:border-0">
                          <td className="p-3">
                            {typeof r.start_time === 'string' && typeof r.end_time === 'string'
                              ? `${r.start_time.slice(0, 5)} – ${r.end_time.slice(0, 5)}`
                              : `${r.start_time} – ${r.end_time}`}
                          </td>
                          <td className="p-3">{r.class_name}</td>
                          <td className="p-3">{r.subject}</td>
                          <td className="p-3">{r.room ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
