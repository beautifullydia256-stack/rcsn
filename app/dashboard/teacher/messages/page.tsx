'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassBackground from '../components/GlassBackground';
import MessagesCard from '../components/MessagesCard';
import { motion } from 'framer-motion';
import { MessageSquare, Send } from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);

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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-blue-400" />
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Messages
                </h1>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors">
                <Send className="w-5 h-5" />
                New Message
              </button>
            </div>
            <p className="text-white/70">
              View and manage your messages
            </p>
          </motion.div>

          <MessagesCard messages={messages} />
        </main>
      </div>
    </div>
  );
}

