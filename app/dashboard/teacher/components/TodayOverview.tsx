'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, MessageSquare, AlertCircle, Bell } from 'lucide-react';

interface TodayClass {
  time: string;
  subject: string;
  class_name: string;
  room?: string;
}

interface TodayOverviewProps {
  classes?: TodayClass[];
  tasks?: number;
  messages?: number;
  events?: number;
  nextClass?: TodayClass;
}

export default function TodayOverview({
  classes = [],
  tasks = 0,
  messages = 0,
  events = 0,
  nextClass
}: TodayOverviewProps) {
  // Mock data if not provided
  const todayClasses: TodayClass[] = classes.length > 0 ? classes : [
    { time: '08:00', subject: 'Mathematics', class_name: 'S.1 West', room: 'Room 101' },
    { time: '10:00', subject: 'Physics', class_name: 'S.2 East', room: 'Lab A' },
    { time: '14:00', subject: 'Chemistry', class_name: 'S.3 North', room: 'Lab B' }
  ];

  const getNextClassTime = () => {
    if (!nextClass) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const upcoming = todayClasses.find(cls => {
        const [hours, minutes] = cls.time.split(':').map(Number);
        const classTime = hours * 60 + minutes;
        return classTime > currentTime;
      });
      return upcoming || todayClasses[0];
    }
    return nextClass;
  };

  const next = getNextClassTime();
  const now = new Date();
  const [hours, minutes] = next.time.split(':').map(Number);
  const classTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  const timeUntilClass = classTime.getTime() - now.getTime();
  const hoursUntil = Math.floor(timeUntilClass / (1000 * 60 * 60));
  const minutesUntil = Math.floor((timeUntilClass % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Today's Overview
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Next Class Card */}
        {next && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Next Class</span>
              </div>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                {next.time}
              </span>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-gray-900 dark:text-white">{next.subject}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{next.class_name}</div>
              {next.room && (
                <div className="text-xs text-gray-500 dark:text-gray-500">{next.room}</div>
              )}
              {timeUntilClass > 0 && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  {hoursUntil > 0 ? `${hoursUntil}h ` : ''}{minutesUntil}m remaining
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Tasks</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{tasks}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Messages</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{messages}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Events</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{events}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Classes</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{todayClasses.length}</div>
          </motion.div>
        </div>
      </div>

      {/* Today's Classes List */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Today's Schedule</h3>
        <div className="space-y-2">
          {todayClasses.length > 0 ? (
            todayClasses.map((cls, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white w-16">{cls.time}</div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{cls.subject}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{cls.class_name}</div>
                  </div>
                </div>
                {cls.room && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{cls.room}</div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              No classes scheduled for today
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

