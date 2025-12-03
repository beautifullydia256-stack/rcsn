'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassBackground from '../components/GlassBackground';
import TimetableWidget from '../components/TimetableWidget';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin } from 'lucide-react';

export default function TimetablePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Timetable
              </h1>
            </div>
            <p className="text-white/70">
              View your teaching schedule and upcoming classes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Weekly Schedule
                </h2>
                <div className="space-y-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, index) => (
                    <div key={day} className="border-b border-white/10 pb-4 last:border-0">
                      <h3 className="font-medium text-white mb-2">{day}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
                          <Clock className="w-4 h-4 text-white/70" />
                          <span className="text-sm text-white/80">08:00 - 09:00</span>
                          <span className="text-sm font-medium text-white ml-4">
                            Mathematics
                          </span>
                          <span className="text-sm text-white/70 ml-auto">
                            S.1 West
                          </span>
                          <MapPin className="w-4 h-4 text-white/70 ml-2" />
                          <span className="text-sm text-white/70">Room 101</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <TimetableWidget />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

