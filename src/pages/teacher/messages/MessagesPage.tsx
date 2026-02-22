import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send } from 'lucide-react';
import MessagesCard from '../components/MessagesCard';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Messages</h1>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Send className="w-5 h-5" />
          New Message
        </button>
      </div>
      <p className="ac-text-muted">View and manage your messages</p>
      <MessagesCard messages={messages} />
    </motion.div>
  );
}
