'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MessagesCard from '../components/MessagesCard';
import { motion } from 'framer-motion';
import { MessageSquare, Send } from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);

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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Messages
                </h1>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Send className="w-5 h-5" />
                New Message
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your messages
            </p>
          </motion.div>

          <MessagesCard messages={messages} />
        </main>
      </div>
    </div>
  );
}

