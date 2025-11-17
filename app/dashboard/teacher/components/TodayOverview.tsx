'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, MessageSquare, AlertCircle, Bell } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

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
    <GlassCard className="p-6" hover>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: '#4dabff' }} />
            Today's Overview
          </h2>
        <span className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Next Class Card */}
        {next && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative overflow-hidden rounded-xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(77, 171, 255, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(77, 171, 255, 0.3)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Decorative gradient blob */}
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
              style={{ background: '#4dabff' }}
            />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: '#4dabff' }} />
                  <span className="text-sm font-medium" style={{ color: '#4dabff' }}>Next Class</span>
                </div>
                <span 
                  className="text-sm font-bold px-2 py-1 rounded-lg"
                  style={{ 
                    background: 'rgba(77, 171, 255, 0.2)',
                    color: '#4dabff'
                  }}
                >
                  {next.time}
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-xl font-bold text-white">{next.subject}</div>
                <div className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{next.class_name}</div>
                {next.room && (
                  <div className="text-xs flex items-center gap-1" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                    <span>📍</span>
                    {next.room}
                  </div>
                )}
                {timeUntilClass > 0 && (
                  <div 
                    className="text-xs mt-3 px-3 py-1.5 rounded-lg inline-block font-medium"
                    style={{ 
                      background: 'rgba(77, 171, 255, 0.15)',
                      color: '#4dabff',
                      border: '1px solid rgba(77, 171, 255, 0.3)'
                    }}
                  >
                    {hoursUntil > 0 ? `${hoursUntil}h ` : ''}{minutesUntil}m remaining
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-xl p-4"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
              <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Tasks</span>
            </div>
            <div className="text-2xl font-bold text-white">{tasks}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-lg p-3"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4" style={{ color: '#4dabff' }} />
              <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Messages</span>
            </div>
            <div className="text-2xl font-bold text-white">{messages}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-lg p-3"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4" style={{ color: '#ae79ff' }} />
              <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Events</span>
            </div>
            <div className="text-2xl font-bold text-white">{events}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-lg p-3"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Classes</span>
            </div>
            <div className="text-2xl font-bold text-white">{todayClasses.length}</div>
          </motion.div>
        </div>
      </div>

      {/* Today's Classes List */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Today's Schedule</h3>
        <div className="space-y-2">
          {todayClasses.length > 0 ? (
            todayClasses.map((cls, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative z-10 flex items-center justify-between p-4 rounded-xl transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.15)';
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-white w-16">{cls.time}</div>
                  <div>
                    <div className="font-medium text-white">{cls.subject}</div>
                    <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{cls.class_name}</div>
                  </div>
                </div>
                {cls.room && (
                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{cls.room}</div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
              No classes scheduled for today
            </div>
          )}
        </div>
        </div>
    </GlassCard>
  );
}

