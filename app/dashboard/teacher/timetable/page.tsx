'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72">
        <Navbar onSearch={() => {}} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Timetable
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              View your teaching schedule and upcoming classes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Weekly Schedule
                </h2>
                <div className="space-y-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, index) => (
                    <div key={day} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">{day}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">08:00 - 09:00</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white ml-4">
                            Mathematics
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
                            S.1 West
                          </span>
                          <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 ml-2" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Room 101</span>
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

