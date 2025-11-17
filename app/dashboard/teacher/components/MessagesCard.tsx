'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, User, Clock, ChevronRight } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  sender_type: 'admin' | 'parent' | 'student';
  subject: string;
  preview: string;
  timestamp: string;
  unread: boolean;
}

interface MessagesCardProps {
  messages?: Message[];
}

export default function MessagesCard({ messages = [] }: MessagesCardProps) {
  const router = useRouter();

  // Mock data if not provided
  const mockMessages: Message[] = messages.length > 0 ? messages : [
    { id: '1', sender: 'School Admin', sender_type: 'admin', subject: 'Staff Meeting Tomorrow', preview: 'Please attend the staff meeting scheduled for tomorrow at 2 PM...', timestamp: '2 hours ago', unread: true },
    { id: '2', sender: 'John Doe (Parent)', sender_type: 'parent', subject: 'Question about grades', preview: 'I would like to discuss my child\'s recent test scores...', timestamp: '5 hours ago', unread: true },
    { id: '3', sender: 'Jane Smith (Parent)', sender_type: 'parent', subject: 'Thank you', preview: 'Thank you for the extra help you provided...', timestamp: '1 day ago', unread: false }
  ];

  const getSenderTypeColor = (type: string) => {
    switch (type) {
      case 'admin':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'parent':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'student':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    }
  };

  const unreadCount = mockMessages.filter(m => m.unread).length;

  return (
    <div className="relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
      <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          onClick={() => router.push('/dashboard/teacher/messages')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {mockMessages.slice(0, 3).map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ x: 4 }}
            onClick={() => router.push(`/dashboard/teacher/messages/${message.id}`)}
            className={`p-3 rounded-lg border ${
              message.unread
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 cursor-pointer'
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900'
            } transition-all`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full ${getSenderTypeColor(message.sender_type)} flex items-center justify-center text-xs font-semibold`}>
                  {message.sender.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {message.sender}
                    </div>
                    {message.unread && (
                      <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {message.timestamp}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            </div>
            <div className="ml-10">
              <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">{message.subject}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{message.preview}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {mockMessages.length > 3 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/dashboard/teacher/messages')}
          className="w-full mt-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          View {mockMessages.length - 3} more messages
        </motion.button>
      )}
    </div>
  );
}

