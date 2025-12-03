'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassBackground from '../components/GlassBackground';
import NotificationsCard from '../components/NotificationsCard';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);

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
              <Bell className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Notifications
              </h1>
            </div>
            <p className="text-white/70">
              View all your notifications
            </p>
          </motion.div>

          <NotificationsCard notifications={notifications} />
        </main>
      </div>
    </div>
  );
}

