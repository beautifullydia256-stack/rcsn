'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Play } from 'lucide-react';

interface TimetableSlot {
  time: string;
  subject: string;
  class_name: string;
  room: string;
}

interface TimetableWidgetProps {
  todaySchedule?: TimetableSlot[];
  nextClass?: TimetableSlot;
}

export default function TimetableWidget({ todaySchedule, nextClass }: TimetableWidgetProps) {
  const router = useRouter();

  // Mock data if not provided
  const mockSchedule: TimetableSlot[] = todaySchedule && todaySchedule.length > 0 ? todaySchedule : [
    { time: '08:00 - 09:00', subject: 'Mathematics', class_name: 'S.1 West', room: 'Room 101' },
    { time: '09:00 - 10:00', subject: 'Physics', class_name: 'S.2 East', room: 'Lab A' },
    { time: '10:30 - 11:30', subject: 'Chemistry', class_name: 'S.3 North', room: 'Lab B' },
    { time: '14:00 - 15:00', subject: 'Biology', class_name: 'S.1 West', room: 'Room 102' }
  ];

  const getNextClass = () => {
    if (nextClass) return nextClass;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    return mockSchedule.find(slot => {
      const [start] = slot.time.split(' - ')[0].split(':').map(Number);
      const classStart = start * 60;
      return classStart > currentTime;
    }) || mockSchedule[0];
  };

  const next = getNextClass();

  return (
    <div className="relative group overflow-hidden">
      {/* Liquid Glass Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
      <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 drop-shadow-sm">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Today's Timetable
          </h2>
          <button
            onClick={() => router.push('/dashboard/teacher/timetable')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            View Full
          </button>
        </div>
        </div>

        <div className="relative z-10">
        {/* Next Class Highlight */}
        {next && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-400/20 to-indigo-400/20 dark:from-blue-500/10 dark:to-indigo-500/10 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Next Class</span>
            </div>
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{next.time.split(' - ')[0]}</span>
          </div>
          <div className="space-y-1 mb-3">
            <div className="font-semibold text-gray-900 dark:text-white">{next.subject}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{next.class_name}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3 h-3" />
              {next.room}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(`/dashboard/teacher/classes/${next.class_name}`)}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Class
          </motion.button>
        </motion.div>
        )}

        {/* Today's Schedule List */}
        <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Today's Schedule</h3>
        {mockSchedule.slice(0, 3).map((slot, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 w-20">
                {slot.time.split(' - ')[0]}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{slot.subject}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{slot.class_name}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {slot.room}
            </div>
          </motion.div>
        ))}
        {mockSchedule.length > 3 && (
          <button
            onClick={() => router.push('/dashboard/teacher/timetable')}
            className="w-full text-center py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View {mockSchedule.length - 3} more classes
          </button>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}

