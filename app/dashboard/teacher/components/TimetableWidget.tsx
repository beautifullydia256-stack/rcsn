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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Today's Timetable
        </h2>
        <button
          onClick={() => router.push('/dashboard/teacher/timetable')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Full
        </button>
      </div>

      {/* Next Class Highlight */}
      {next && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800"
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
  );
}

