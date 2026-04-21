'use client';

import { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassBackground from '../components/GlassBackground';
import TimetableWidget from '../components/TimetableWidget';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { formatTimetableTime } from '@/src/lib/timetableDay';

type Period = {
  id: string;
  class_name: string;
  subject: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
};

const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export default function TimetablePage() {
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<Period[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const meta = (user as { user_metadata?: Record<string, string>; raw_user_meta_data?: Record<string, string> })
          .user_metadata ||
          (user as { raw_user_meta_data?: Record<string, string> }).raw_user_meta_data ||
          {};
        const schoolId = meta.school_id;
        const teacherId = meta.teacher_id || user.id;
        if (!schoolId) {
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('timetable_periods')
          .select('id, class_name, subject, day_of_week, start_time, end_time')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId);
        if (error) throw error;
        if (!cancelled) {
          setPeriods(
            ((data || []) as { id: number | string; class_name: string; subject: string; day_of_week: string; start_time: string; end_time: string }[]).map(
              (r) => ({
                id: String(r.id),
                class_name: r.class_name,
                subject: r.subject,
                day_of_week: r.day_of_week,
                start_time: r.start_time,
                end_time: r.end_time,
              })
            )
          );
        }
      } catch (e) {
        console.error('Timetable load error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, Period[]>();
    for (const p of periods) {
      const k = String(p.day_of_week || '').trim();
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    for (const list of m.values()) {
      list.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    }
    return m;
  }, [periods]);

  const todayScheduleForWidget = useMemo(() => {
    const js = new Date().getDay();
    const mon0 = (js + 6) % 7;
    const dayName = DAY_ORDER[mon0];
    const list = byDay.get(dayName) || [];
    return list.map((p) => ({
      time: `${formatTimetableTime(p.start_time)} - ${formatTimetableTime(p.end_time)}`,
      subject: p.subject,
      class_name: p.class_name,
      room: '—',
    }));
  }, [byDay]);

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <GlassBackground />
        <div className="relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 border-t-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative">
      <GlassBackground />
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72 relative z-10">
        <Navbar onSearch={() => {}} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">My Timetable</h1>
            </div>
            <p className="text-white/70">View your teaching schedule from school settings (Timetable Designer).</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
                <h2 className="text-lg font-semibold text-white mb-4">Weekly schedule</h2>
                {periods.length === 0 ? (
                  <p className="text-white/70 text-sm">
                    No timetable entries yet. Your admin can add your schedule under System Settings → Timetable Designer.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {DAY_ORDER.map((day) => {
                      const slots = byDay.get(day) || [];
                      if (slots.length === 0) return null;
                      return (
                        <div key={day} className="border-b border-white/10 pb-4 last:border-0">
                          <h3 className="font-medium text-white mb-2">{day}</h3>
                          <div className="space-y-2">
                            {slots.map((p) => (
                              <div
                                key={p.id}
                                className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5"
                              >
                                <Clock className="w-4 h-4 text-white/70 shrink-0" />
                                <span className="text-sm text-white/80">
                                  {formatTimetableTime(p.start_time)} – {formatTimetableTime(p.end_time)}
                                </span>
                                <span className="text-sm font-medium text-white">{p.subject}</span>
                                <span className="text-sm text-white/70 ml-auto">{p.class_name}</span>
                                <MapPin className="w-4 h-4 text-white/70 shrink-0" />
                                <span className="text-sm text-white/70">—</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div>
              <TimetableWidget todaySchedule={todayScheduleForWidget} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
