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
    <div className="relative group overflow-hidden">
      {/* Liquid Glass Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
      <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 drop-shadow-sm">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Today's Overview
          </h2>
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Next Class Card */}
        {next && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-blue-400/20 to-indigo-400/20 dark:from-blue-500/10 dark:to-indigo-500/10 backdrop-blur-md rounded-xl p-4 border border-white/30 dark:border-white/10 shadow-lg"
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
            className="relative overflow-hidden bg-white/20 dark:bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/20 dark:border-white/10 shadow-md"
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
            className="relative overflow-hidden bg-white/20 dark:bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/20 dark:border-white/10 shadow-md"
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
            className="relative overflow-hidden bg-white/20 dark:bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/20 dark:border-white/10 shadow-md"
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
            className="relative overflow-hidden bg-white/20 dark:bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/20 dark:border-white/10 shadow-md"
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
                className="relative z-10 flex items-center justify-between p-3 rounded-lg bg-white/20 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md"
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
    </div>
  );
}

